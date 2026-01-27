import {
  formatTreeStructure,
  generateImplementationPrompt,
  generateReviewResponsePrompt,
} from '../prompt-generator';
import * as githubService from '../github';

// Mock GitHub service
jest.mock('../github', () => ({
  getRepoTree: jest.fn(),
  getFileContent: jest.fn(),
}));

describe('prompt-generator service', () => {
  describe('formatTreeStructure', () => {
    it('should format a simple tree structure', () => {
      const tree = [
        { path: 'src', type: 'tree' as const, mode: '040000', sha: 'sha1' },
        { path: 'src/index.ts', type: 'blob' as const, mode: '100644', sha: 'sha2', size: 100 },
        { path: 'README.md', type: 'blob' as const, mode: '100644', sha: 'sha3', size: 50 },
      ];

      const result = formatTreeStructure(tree);

      expect(result).toContain('+ src');
      expect(result).toContain('  - index.ts');
      expect(result).toContain('- README.md');
    });

    it('should filter out node_modules', () => {
      const tree = [
        { path: 'node_modules', type: 'tree' as const, mode: '040000', sha: 'sha1' },
        { path: 'node_modules/package/index.js', type: 'blob' as const, mode: '100644', sha: 'sha2', size: 100 },
        { path: 'src', type: 'tree' as const, mode: '040000', sha: 'sha3' },
      ];

      const result = formatTreeStructure(tree);

      expect(result).not.toContain('node_modules');
      expect(result).toContain('+ src');
    });

    it('should filter out .git directory', () => {
      const tree = [
        { path: '.git', type: 'tree' as const, mode: '040000', sha: 'sha1' },
        { path: '.git/config', type: 'blob' as const, mode: '100644', sha: 'sha2', size: 50 },
        { path: 'src', type: 'tree' as const, mode: '040000', sha: 'sha3' },
      ];

      const result = formatTreeStructure(tree);

      expect(result).not.toContain('.git');
    });

    it('should filter out build directories', () => {
      const tree = [
        { path: 'dist', type: 'tree' as const, mode: '040000', sha: 'sha1' },
        { path: 'build', type: 'tree' as const, mode: '040000', sha: 'sha2' },
        { path: '.next', type: 'tree' as const, mode: '040000', sha: 'sha3' },
        { path: 'src', type: 'tree' as const, mode: '040000', sha: 'sha4' },
      ];

      const result = formatTreeStructure(tree);

      expect(result).not.toContain('dist');
      expect(result).not.toContain('build');
      expect(result).not.toContain('.next');
      expect(result).toContain('+ src');
    });

    it('should filter out lock files', () => {
      const tree = [
        { path: 'package-lock.json', type: 'blob' as const, mode: '100644', sha: 'sha1', size: 1000 },
        { path: 'yarn.lock', type: 'blob' as const, mode: '100644', sha: 'sha2', size: 1000 },
        { path: 'pnpm-lock.yaml', type: 'blob' as const, mode: '100644', sha: 'sha3', size: 1000 },
        { path: 'package.json', type: 'blob' as const, mode: '100644', sha: 'sha4', size: 500 },
      ];

      const result = formatTreeStructure(tree);

      expect(result).not.toContain('package-lock.json');
      expect(result).not.toContain('yarn.lock');
      expect(result).not.toContain('pnpm-lock.yaml');
      expect(result).toContain('- package.json');
    });

    it('should filter out coverage directory', () => {
      const tree = [
        { path: 'coverage', type: 'tree' as const, mode: '040000', sha: 'sha1' },
        { path: 'coverage/lcov.info', type: 'blob' as const, mode: '100644', sha: 'sha2', size: 100 },
        { path: 'src', type: 'tree' as const, mode: '040000', sha: 'sha3' },
      ];

      const result = formatTreeStructure(tree);

      expect(result).not.toContain('coverage');
    });

    it('should handle nested directories with correct indentation', () => {
      const tree = [
        { path: 'src', type: 'tree' as const, mode: '040000', sha: 'sha1' },
        { path: 'src/components', type: 'tree' as const, mode: '040000', sha: 'sha2' },
        { path: 'src/components/Button.tsx', type: 'blob' as const, mode: '100644', sha: 'sha3', size: 100 },
      ];

      const result = formatTreeStructure(tree);
      const lines = result.split('\n');

      expect(lines[0]).toBe('+ src');
      expect(lines[1]).toBe('  + components');
      expect(lines[2]).toBe('    - Button.tsx');
    });

    it('should return empty string for empty tree', () => {
      const result = formatTreeStructure([]);
      expect(result).toBe('');
    });

    it('should use prefix + for directories and - for files', () => {
      const tree = [
        { path: 'folder', type: 'tree' as const, mode: '040000', sha: 'sha1' },
        { path: 'file.txt', type: 'blob' as const, mode: '100644', sha: 'sha2', size: 10 },
      ];

      const result = formatTreeStructure(tree);

      expect(result).toContain('+ folder');
      expect(result).toContain('- file.txt');
    });
  });

  describe('generateImplementationPrompt', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (githubService.getRepoTree as jest.Mock).mockResolvedValue([
        { path: 'src', type: 'tree', mode: '040000', sha: 'sha1' },
        { path: 'src/index.ts', type: 'blob', mode: '100644', sha: 'sha2', size: 100 },
      ]);
      (githubService.getFileContent as jest.Mock).mockResolvedValue(null);
    });

    it('should generate a prompt with task details', async () => {
      const result = await generateImplementationPrompt({
        taskTitle: 'Add user authentication',
        taskDescription: 'Implement login and signup functionality',
        taskType: 'FEATURE',
        projectName: 'Test Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
      });

      expect(result).toContain('Add user authentication');
      expect(result).toContain('Implement login and signup functionality');
      expect(result).toContain('FEATURE');
      expect(result).toContain('Test Project');
      expect(result).toContain('owner/repo');
    });

    it('should include repository structure', async () => {
      const result = await generateImplementationPrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        taskType: 'TASK',
        projectName: 'Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
      });

      expect(result).toContain('+ src');
      expect(result).toContain('- index.ts');
    });

    it('should handle repository fetch error gracefully', async () => {
      (githubService.getRepoTree as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await generateImplementationPrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        taskType: 'TASK',
        projectName: 'Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
      });

      expect(result).toContain('Unable to fetch repository structure');
    });

    it('should include configuration files when available', async () => {
      (githubService.getFileContent as jest.Mock).mockImplementation((token, owner, repo, file) => {
        if (file === 'package.json') {
          return '{"name": "test", "version": "1.0.0"}';
        }
        return null;
      });

      const result = await generateImplementationPrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        taskType: 'TASK',
        projectName: 'Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
      });

      expect(result).toContain('### package.json');
      expect(result).toContain('"name": "test"');
    });

    it('should include additional context when provided', async () => {
      const result = await generateImplementationPrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        taskType: 'TASK',
        projectName: 'Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
        additionalContext: 'Use React hooks for state management',
      });

      expect(result).toContain('## Additional Context');
      expect(result).toContain('Use React hooks for state management');
    });

    it('should not include additional context section when not provided', async () => {
      const result = await generateImplementationPrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        taskType: 'TASK',
        projectName: 'Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
      });

      expect(result).not.toContain('## Additional Context');
    });

    it('should include parent task context when provided', async () => {
      const result = await generateImplementationPrompt({
        taskTitle: 'Add login form',
        taskDescription: 'Create the login form UI',
        taskType: 'SUBTASK',
        projectName: 'Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
        parentTask: {
          title: 'User Authentication',
          description: 'Implement full auth system',
          taskType: 'EPIC',
        },
      });

      expect(result).toContain('## Parent Context');
      expect(result).toContain('EPIC: User Authentication');
      expect(result).toContain('Implement full auth system');
    });

    it('should include sprint context when provided', async () => {
      const result = await generateImplementationPrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        taskType: 'TASK',
        projectName: 'Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
        sprint: {
          name: 'Sprint 1',
          goal: 'Complete MVP features',
        },
      });

      expect(result).toContain('## Sprint Context');
      expect(result).toContain('Sprint 1');
      expect(result).toContain('Complete MVP features');
    });

    it('should handle sprint without goal', async () => {
      const result = await generateImplementationPrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        taskType: 'TASK',
        projectName: 'Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
        sprint: {
          name: 'Sprint 2',
          goal: null,
        },
      });

      expect(result).toContain('Sprint 2');
      expect(result).not.toContain('Sprint Goal');
    });

    it('should truncate long config file contents', async () => {
      const longContent = 'A'.repeat(5000);
      (githubService.getFileContent as jest.Mock).mockImplementation((token, owner, repo, file) => {
        if (file === 'package.json') {
          return longContent;
        }
        return null;
      });

      const result = await generateImplementationPrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        taskType: 'TASK',
        projectName: 'Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
      });

      // Should be truncated to 3000 chars
      expect(result).not.toContain('A'.repeat(4000));
    });

    it('should include response format instructions', async () => {
      const result = await generateImplementationPrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        taskType: 'TASK',
        projectName: 'Project',
        githubRepo: 'owner/repo',
        accessToken: 'token',
      });

      expect(result).toContain('Response Format');
      expect(result).toContain('"files"');
      expect(result).toContain('"action": "create" | "update" | "delete"');
    });
  });

  describe('generateReviewResponsePrompt', () => {
    it('should generate a prompt with task details', () => {
      const result = generateReviewResponsePrompt({
        taskTitle: 'Add feature',
        taskDescription: 'Implement the feature',
        reviewComments: [],
        currentFiles: [],
      });

      expect(result).toContain('Add feature');
      expect(result).toContain('Implement the feature');
    });

    it('should format review comments with file paths', () => {
      const result = generateReviewResponsePrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        reviewComments: [
          { path: 'src/index.ts', body: 'Fix this bug', line: 42 },
          { path: 'src/utils.ts', body: 'Add error handling', line: null },
        ],
        currentFiles: [],
      });

      expect(result).toContain('**src/index.ts** (line 42): Fix this bug');
      expect(result).toContain('**src/utils.ts**: Add error handling');
    });

    it('should include current file contents', () => {
      const result = generateReviewResponsePrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        reviewComments: [],
        currentFiles: [
          { path: 'src/index.ts', content: 'const x = 1;' },
          { path: 'src/utils.ts', content: 'export function helper() {}' },
        ],
      });

      expect(result).toContain('### src/index.ts');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('### src/utils.ts');
      expect(result).toContain('export function helper() {}');
    });

    it('should include response format instructions', () => {
      const result = generateReviewResponsePrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        reviewComments: [],
        currentFiles: [],
      });

      expect(result).toContain('Response Format');
      expect(result).toContain('"files"');
      expect(result).toContain('"explanation"');
    });

    it('should handle multiple comments for the same file', () => {
      const result = generateReviewResponsePrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        reviewComments: [
          { path: 'src/index.ts', body: 'First comment', line: 10 },
          { path: 'src/index.ts', body: 'Second comment', line: 20 },
        ],
        currentFiles: [{ path: 'src/index.ts', content: 'code' }],
      });

      expect(result).toContain('First comment');
      expect(result).toContain('Second comment');
    });

    it('should handle comments without line numbers', () => {
      const result = generateReviewResponsePrompt({
        taskTitle: 'Test',
        taskDescription: 'Test',
        reviewComments: [
          { path: 'src/index.ts', body: 'General comment', line: null },
        ],
        currentFiles: [],
      });

      expect(result).toContain('**src/index.ts**: General comment');
      expect(result).not.toContain('(line null)');
    });
  });
});
