import {
  getOctokit,
  getUserRepos,
  getRepoBranches,
  branchExists,
  createBranch,
  getOpenPullRequestForBranch,
  getFileContent,
  createOrUpdateFile,
  deleteFile,
  getRepoTree,
  createPullRequest,
  getPullRequest,
  getPullRequestComments,
  requestReviewers,
  mergePullRequest,
  addPRComment,
  getDefaultBranch,
  getBranchSha,
  getPullRequestReviews,
} from '../github';

// Mock Octokit
const mockRepos = {
  listForAuthenticatedUser: jest.fn(),
  listBranches: jest.fn(),
  getContent: jest.fn(),
  createOrUpdateFileContents: jest.fn(),
  deleteFile: jest.fn(),
  get: jest.fn(),
};

const mockGit = {
  getRef: jest.fn(),
  createRef: jest.fn(),
  getTree: jest.fn(),
};

const mockPulls = {
  list: jest.fn(),
  create: jest.fn(),
  get: jest.fn(),
  listReviewComments: jest.fn(),
  requestReviewers: jest.fn(),
  merge: jest.fn(),
  listReviews: jest.fn(),
};

const mockIssues = {
  createComment: jest.fn(),
};

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    repos: mockRepos,
    git: mockGit,
    pulls: mockPulls,
    issues: mockIssues,
  })),
}));

describe('github service', () => {
  const accessToken = 'test-token';
  const owner = 'test-owner';
  const repo = 'test-repo';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOctokit', () => {
    it('should create an Octokit instance with access token', () => {
      const { Octokit } = require('@octokit/rest');
      getOctokit(accessToken);

      expect(Octokit).toHaveBeenCalledWith({ auth: accessToken });
    });
  });

  describe('getUserRepos', () => {
    it('should return formatted repository list', async () => {
      mockRepos.listForAuthenticatedUser.mockResolvedValue({
        data: [
          {
            id: 1,
            name: 'repo1',
            full_name: 'owner/repo1',
            description: 'Test repo 1',
            private: false,
            default_branch: 'main',
            html_url: 'https://github.com/owner/repo1',
          },
          {
            id: 2,
            name: 'repo2',
            full_name: 'owner/repo2',
            description: null,
            private: true,
            default_branch: 'master',
            html_url: 'https://github.com/owner/repo2',
          },
        ],
      });

      const result = await getUserRepos(accessToken);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: 'repo1',
        full_name: 'owner/repo1',
        description: 'Test repo 1',
        private: false,
        default_branch: 'main',
        html_url: 'https://github.com/owner/repo1',
      });
      expect(mockRepos.listForAuthenticatedUser).toHaveBeenCalledWith({
        sort: 'updated',
        per_page: 100,
        affiliation: 'owner,collaborator,organization_member',
      });
    });
  });

  describe('getRepoBranches', () => {
    it('should return formatted branch list', async () => {
      mockRepos.listBranches.mockResolvedValue({
        data: [
          { name: 'main', commit: { sha: 'abc123', url: 'https://...' } },
          { name: 'develop', commit: { sha: 'def456', url: 'https://...' } },
        ],
      });

      const result = await getRepoBranches(accessToken, owner, repo);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'main',
        commit: { sha: 'abc123', url: 'https://...' },
      });
    });
  });

  describe('branchExists', () => {
    it('should return true when branch exists', async () => {
      mockGit.getRef.mockResolvedValue({ data: { ref: 'refs/heads/main' } });

      const result = await branchExists(accessToken, owner, repo, 'main');

      expect(result).toBe(true);
      expect(mockGit.getRef).toHaveBeenCalledWith({
        owner,
        repo,
        ref: 'heads/main',
      });
    });

    it('should return false when branch does not exist (404)', async () => {
      mockGit.getRef.mockRejectedValue({ status: 404 });

      const result = await branchExists(accessToken, owner, repo, 'nonexistent');

      expect(result).toBe(false);
    });

    it('should throw error for other errors', async () => {
      mockGit.getRef.mockRejectedValue({ status: 500, message: 'Server error' });

      await expect(branchExists(accessToken, owner, repo, 'main')).rejects.toEqual({
        status: 500,
        message: 'Server error',
      });
    });
  });

  describe('createBranch', () => {
    it('should create a branch from base branch', async () => {
      mockGit.getRef.mockResolvedValue({
        data: { object: { sha: 'base-sha-123' } },
      });
      mockGit.createRef.mockResolvedValue({});

      await createBranch(accessToken, owner, repo, 'feature-branch', 'main');

      expect(mockGit.getRef).toHaveBeenCalledWith({
        owner,
        repo,
        ref: 'heads/main',
      });
      expect(mockGit.createRef).toHaveBeenCalledWith({
        owner,
        repo,
        ref: 'refs/heads/feature-branch',
        sha: 'base-sha-123',
      });
    });
  });

  describe('getOpenPullRequestForBranch', () => {
    it('should return PR when one exists', async () => {
      mockPulls.list.mockResolvedValue({
        data: [
          {
            number: 42,
            title: 'Test PR',
            body: 'PR body',
            html_url: 'https://github.com/owner/repo/pull/42',
            state: 'open',
            head: { ref: 'feature', sha: 'head-sha' },
            base: { ref: 'main', sha: 'base-sha' },
          },
        ],
      });

      const result = await getOpenPullRequestForBranch(accessToken, owner, repo, 'feature');

      expect(result).toEqual({
        number: 42,
        title: 'Test PR',
        body: 'PR body',
        html_url: 'https://github.com/owner/repo/pull/42',
        state: 'open',
        merged: false,
        head: { ref: 'feature', sha: 'head-sha' },
        base: { ref: 'main', sha: 'base-sha' },
      });
    });

    it('should return null when no PR exists', async () => {
      mockPulls.list.mockResolvedValue({ data: [] });

      const result = await getOpenPullRequestForBranch(accessToken, owner, repo, 'no-pr-branch');

      expect(result).toBeNull();
    });
  });

  describe('getFileContent', () => {
    it('should return file content when file exists', async () => {
      const content = Buffer.from('Hello, World!').toString('base64');
      mockRepos.getContent.mockResolvedValue({
        data: { type: 'file', content },
      });

      const result = await getFileContent(accessToken, owner, repo, 'README.md');

      expect(result).toBe('Hello, World!');
    });

    it('should return null when file does not exist (404)', async () => {
      mockRepos.getContent.mockRejectedValue({ status: 404 });

      const result = await getFileContent(accessToken, owner, repo, 'nonexistent.txt');

      expect(result).toBeNull();
    });

    it('should return null when path is a directory', async () => {
      mockRepos.getContent.mockResolvedValue({
        data: { type: 'dir' },
      });

      const result = await getFileContent(accessToken, owner, repo, 'src');

      expect(result).toBeNull();
    });

    it('should throw error for other errors', async () => {
      mockRepos.getContent.mockRejectedValue({ status: 500 });

      await expect(getFileContent(accessToken, owner, repo, 'file.txt')).rejects.toEqual({
        status: 500,
      });
    });

    it('should pass ref parameter when provided', async () => {
      mockRepos.getContent.mockResolvedValue({
        data: { type: 'file', content: Buffer.from('test').toString('base64') },
      });

      await getFileContent(accessToken, owner, repo, 'file.txt', 'feature-branch');

      expect(mockRepos.getContent).toHaveBeenCalledWith({
        owner,
        repo,
        path: 'file.txt',
        ref: 'feature-branch',
      });
    });
  });

  describe('createOrUpdateFile', () => {
    it('should create a new file when it does not exist', async () => {
      mockRepos.getContent.mockRejectedValue({ status: 404 });
      mockRepos.createOrUpdateFileContents.mockResolvedValue({});

      await createOrUpdateFile(
        accessToken,
        owner,
        repo,
        'new-file.txt',
        'File content',
        'Add new file',
        'main'
      );

      expect(mockRepos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner,
        repo,
        path: 'new-file.txt',
        message: 'Add new file',
        content: Buffer.from('File content').toString('base64'),
        branch: 'main',
        sha: undefined,
      });
    });

    it('should update existing file with SHA', async () => {
      mockRepos.getContent.mockResolvedValue({
        data: { sha: 'existing-sha' },
      });
      mockRepos.createOrUpdateFileContents.mockResolvedValue({});

      await createOrUpdateFile(
        accessToken,
        owner,
        repo,
        'existing-file.txt',
        'Updated content',
        'Update file',
        'main'
      );

      expect(mockRepos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner,
        repo,
        path: 'existing-file.txt',
        message: 'Update file',
        content: Buffer.from('Updated content').toString('base64'),
        branch: 'main',
        sha: 'existing-sha',
      });
    });

    it('should throw error for non-404 errors when checking file', async () => {
      mockRepos.getContent.mockRejectedValue({ status: 500 });

      await expect(
        createOrUpdateFile(accessToken, owner, repo, 'file.txt', 'content', 'msg', 'main')
      ).rejects.toEqual({ status: 500 });
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      mockRepos.getContent.mockResolvedValue({
        data: { sha: 'file-sha' },
      });
      mockRepos.deleteFile.mockResolvedValue({});

      await deleteFile(accessToken, owner, repo, 'file.txt', 'Delete file', 'main');

      expect(mockRepos.deleteFile).toHaveBeenCalledWith({
        owner,
        repo,
        path: 'file.txt',
        message: 'Delete file',
        sha: 'file-sha',
        branch: 'main',
      });
    });
  });

  describe('getRepoTree', () => {
    it('should return filtered and formatted tree', async () => {
      mockGit.getTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'src/index.ts', mode: '100644', type: 'blob', sha: 'sha1', size: 100 },
            { path: 'src', mode: '040000', type: 'tree', sha: 'sha2' },
            { path: undefined, mode: '100644', sha: 'sha3' }, // Should be filtered out
          ],
        },
      });

      const result = await getRepoTree(accessToken, owner, repo);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/index.ts',
        mode: '100644',
        type: 'blob',
        sha: 'sha1',
        size: 100,
      });
    });

    it('should use ref parameter when provided', async () => {
      mockGit.getTree.mockResolvedValue({ data: { tree: [] } });

      await getRepoTree(accessToken, owner, repo, 'feature-branch');

      expect(mockGit.getTree).toHaveBeenCalledWith({
        owner,
        repo,
        tree_sha: 'feature-branch',
        recursive: 'true',
      });
    });

    it('should default to HEAD when ref not provided', async () => {
      mockGit.getTree.mockResolvedValue({ data: { tree: [] } });

      await getRepoTree(accessToken, owner, repo);

      expect(mockGit.getTree).toHaveBeenCalledWith({
        owner,
        repo,
        tree_sha: 'HEAD',
        recursive: 'true',
      });
    });
  });

  describe('createPullRequest', () => {
    it('should create a pull request and return formatted data', async () => {
      mockPulls.create.mockResolvedValue({
        data: {
          number: 123,
          title: 'Add feature',
          body: 'PR description',
          html_url: 'https://github.com/owner/repo/pull/123',
          state: 'open',
          merged: false,
          head: { ref: 'feature', sha: 'head-sha' },
          base: { ref: 'main', sha: 'base-sha' },
        },
      });

      const result = await createPullRequest(
        accessToken,
        owner,
        repo,
        'Add feature',
        'PR description',
        'feature',
        'main'
      );

      expect(result).toEqual({
        number: 123,
        title: 'Add feature',
        body: 'PR description',
        html_url: 'https://github.com/owner/repo/pull/123',
        state: 'open',
        merged: false,
        head: { ref: 'feature', sha: 'head-sha' },
        base: { ref: 'main', sha: 'base-sha' },
      });
    });
  });

  describe('getPullRequest', () => {
    it('should get a pull request by number', async () => {
      mockPulls.get.mockResolvedValue({
        data: {
          number: 42,
          title: 'Test PR',
          body: 'Body',
          html_url: 'https://...',
          state: 'open',
          merged: false,
          head: { ref: 'feature', sha: 'sha1' },
          base: { ref: 'main', sha: 'sha2' },
        },
      });

      const result = await getPullRequest(accessToken, owner, repo, 42);

      expect(result.number).toBe(42);
      expect(mockPulls.get).toHaveBeenCalledWith({
        owner,
        repo,
        pull_number: 42,
      });
    });
  });

  describe('getPullRequestComments', () => {
    it('should return formatted comments', async () => {
      mockPulls.listReviewComments.mockResolvedValue({
        data: [
          {
            id: 1,
            body: 'Comment 1',
            path: 'src/index.ts',
            position: 10,
            line: 5,
            user: { login: 'reviewer1' },
          },
          {
            id: 2,
            body: 'Comment 2',
            path: 'src/utils.ts',
            position: null,
            line: null,
            user: null,
          },
        ],
      });

      const result = await getPullRequestComments(accessToken, owner, repo, 1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        body: 'Comment 1',
        path: 'src/index.ts',
        position: 10,
        line: 5,
        user: { login: 'reviewer1' },
      });
      expect(result[1].user.login).toBe('unknown');
      expect(result[1].position).toBeNull();
      expect(result[1].line).toBeNull();
    });
  });

  describe('requestReviewers', () => {
    it('should request reviewers when array is not empty', async () => {
      await requestReviewers(accessToken, owner, repo, 42, ['user1', 'user2']);

      expect(mockPulls.requestReviewers).toHaveBeenCalledWith({
        owner,
        repo,
        pull_number: 42,
        reviewers: ['user1', 'user2'],
      });
    });

    it('should not call API when reviewers array is empty', async () => {
      await requestReviewers(accessToken, owner, repo, 42, []);

      expect(mockPulls.requestReviewers).not.toHaveBeenCalled();
    });
  });

  describe('mergePullRequest', () => {
    it('should merge pull request with squash method', async () => {
      await mergePullRequest(accessToken, owner, repo, 42, 'Merge PR #42');

      expect(mockPulls.merge).toHaveBeenCalledWith({
        owner,
        repo,
        pull_number: 42,
        commit_title: 'Merge PR #42',
        merge_method: 'squash',
      });
    });

    it('should merge without commit title', async () => {
      await mergePullRequest(accessToken, owner, repo, 42);

      expect(mockPulls.merge).toHaveBeenCalledWith({
        owner,
        repo,
        pull_number: 42,
        commit_title: undefined,
        merge_method: 'squash',
      });
    });
  });

  describe('addPRComment', () => {
    it('should add a comment to a PR', async () => {
      await addPRComment(accessToken, owner, repo, 42, 'Great work!');

      expect(mockIssues.createComment).toHaveBeenCalledWith({
        owner,
        repo,
        issue_number: 42,
        body: 'Great work!',
      });
    });
  });

  describe('getDefaultBranch', () => {
    it('should return the default branch name', async () => {
      mockRepos.get.mockResolvedValue({
        data: { default_branch: 'main' },
      });

      const result = await getDefaultBranch(accessToken, owner, repo);

      expect(result).toBe('main');
    });
  });

  describe('getBranchSha', () => {
    it('should return the branch SHA', async () => {
      mockGit.getRef.mockResolvedValue({
        data: { object: { sha: 'branch-sha-123' } },
      });

      const result = await getBranchSha(accessToken, owner, repo, 'main');

      expect(result).toBe('branch-sha-123');
      expect(mockGit.getRef).toHaveBeenCalledWith({
        owner,
        repo,
        ref: 'heads/main',
      });
    });
  });

  describe('getPullRequestReviews', () => {
    it('should return formatted reviews', async () => {
      mockPulls.listReviews.mockResolvedValue({
        data: [
          {
            id: 1,
            state: 'APPROVED',
            body: 'LGTM',
            user: { login: 'reviewer1' },
            submitted_at: '2024-01-15T12:00:00Z',
          },
          {
            id: 2,
            state: 'CHANGES_REQUESTED',
            body: 'Please fix',
            user: null,
            submitted_at: null,
          },
        ],
      });

      const result = await getPullRequestReviews(accessToken, owner, repo, 42);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        state: 'APPROVED',
        body: 'LGTM',
        user: { login: 'reviewer1' },
        submitted_at: '2024-01-15T12:00:00Z',
      });
      expect(result[1].user.login).toBe('unknown');
      expect(result[1].submitted_at).toBeNull();
    });
  });
});
