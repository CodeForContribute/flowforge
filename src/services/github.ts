import { Octokit } from "@octokit/rest";
import type { GitHubRepo, GitHubBranch, GitHubTreeItem, GitHubPullRequest, GitHubReviewComment, GitHubReview } from "@/types";

export function getOctokit(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  });
}

export async function getUserRepos(accessToken: string): Promise<GitHubRepo[]> {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100,
    affiliation: "owner,collaborator,organization_member",
  });

  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    private: repo.private,
    default_branch: repo.default_branch,
    html_url: repo.html_url,
  }));
}

export async function getRepoBranches(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  const octokit = getOctokit(accessToken);

  // Use pagination to get all branches
  const branches: GitHubBranch[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: perPage,
      page,
    });

    if (data.length === 0) break;

    branches.push(...data.map((branch) => ({
      name: branch.name,
      commit: {
        sha: branch.commit.sha,
        url: branch.commit.url,
      },
    })));

    if (data.length < perPage) break;
    page++;
  }

  return branches;
}

export async function branchExists(
  accessToken: string,
  owner: string,
  repo: string,
  branchName: string
): Promise<boolean> {
  const octokit = getOctokit(accessToken);

  try {
    await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
    });
    return true;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return false;
    }
    throw error;
  }
}

export async function createBranch(
  accessToken: string,
  owner: string,
  repo: string,
  branchName: string,
  baseBranch: string
): Promise<void> {
  const octokit = getOctokit(accessToken);

  // Get the SHA of the base branch
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });

  // Create the new branch
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha,
  });
}

export async function deleteBranch(
  accessToken: string,
  owner: string,
  repo: string,
  branchName: string
): Promise<void> {
  const octokit = getOctokit(accessToken);

  await octokit.git.deleteRef({
    owner,
    repo,
    ref: `heads/${branchName}`,
  });
}

export async function getOpenPullRequestForBranch(
  accessToken: string,
  owner: string,
  repo: string,
  branchName: string
): Promise<GitHubPullRequest | null> {
  const octokit = getOctokit(accessToken);

  const { data } = await octokit.pulls.list({
    owner,
    repo,
    head: `${owner}:${branchName}`,
    state: "open",
  });

  if (data.length === 0) {
    return null;
  }

  const pr = data[0];
  return {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    html_url: pr.html_url,
    state: pr.state as "open" | "closed",
    merged: false, // Open PRs are not merged
    head: {
      ref: pr.head.ref,
      sha: pr.head.sha,
    },
    base: {
      ref: pr.base.ref,
      sha: pr.base.sha,
    },
  };
}

export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string | null> {
  const octokit = getOctokit(accessToken);

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ("content" in data && data.type === "file") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createOrUpdateFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string
): Promise<void> {
  const octokit = getOctokit(accessToken);

  // Check if file exists to get its SHA
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if ("sha" in data) {
      sha = data.sha;
    }
  } catch (error: unknown) {
    if (!(error && typeof error === "object" && "status" in error && error.status === 404)) {
      throw error;
    }
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
    sha,
  });
}

export async function deleteFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  message: string,
  branch: string
): Promise<void> {
  const octokit = getOctokit(accessToken);

  // Get the file's SHA
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref: branch,
  });

  if ("sha" in data) {
    await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha: data.sha,
      branch,
    });
  }
}

export async function getRepoTree(
  accessToken: string,
  owner: string,
  repo: string,
  ref?: string
): Promise<GitHubTreeItem[]> {
  const octokit = getOctokit(accessToken);

  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: ref || "HEAD",
    recursive: "true",
  });

  return data.tree
    .filter((item): item is typeof item & { path: string; mode: string; sha: string } =>
      item.path !== undefined && item.mode !== undefined && item.sha !== undefined
    )
    .map((item) => ({
      path: item.path,
      mode: item.mode,
      type: item.type as "blob" | "tree",
      sha: item.sha,
      size: item.size,
    }));
}

export async function createPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string
): Promise<GitHubPullRequest> {
  const octokit = getOctokit(accessToken);

  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head,
    base,
  });

  return {
    number: data.number,
    title: data.title,
    body: data.body,
    html_url: data.html_url,
    state: data.state,
    merged: data.merged,
    head: {
      ref: data.head.ref,
      sha: data.head.sha,
    },
    base: {
      ref: data.base.ref,
      sha: data.base.sha,
    },
  };
}

export async function getPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPullRequest> {
  const octokit = getOctokit(accessToken);

  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  return {
    number: data.number,
    title: data.title,
    body: data.body,
    html_url: data.html_url,
    state: data.state,
    merged: data.merged,
    head: {
      ref: data.head.ref,
      sha: data.head.sha,
    },
    base: {
      ref: data.base.ref,
      sha: data.base.sha,
    },
  };
}

export async function getPullRequestComments(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubReviewComment[]> {
  const octokit = getOctokit(accessToken);

  const { data } = await octokit.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber,
  });

  return data.map((comment) => ({
    id: comment.id,
    body: comment.body,
    path: comment.path,
    position: comment.position ?? null,
    line: comment.line ?? null,
    user: {
      login: comment.user?.login || "unknown",
    },
  }));
}

export async function requestReviewers(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number,
  reviewers: string[]
): Promise<void> {
  if (reviewers.length === 0) return;

  const octokit = getOctokit(accessToken);

  await octokit.pulls.requestReviewers({
    owner,
    repo,
    pull_number: prNumber,
    reviewers,
  });
}

export async function mergePullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number,
  commitTitle?: string
): Promise<void> {
  const octokit = getOctokit(accessToken);

  await octokit.pulls.merge({
    owner,
    repo,
    pull_number: prNumber,
    commit_title: commitTitle,
    merge_method: "squash",
  });
}

export async function addPRComment(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<void> {
  const octokit = getOctokit(accessToken);

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
}

export async function getDefaultBranch(
  accessToken: string,
  owner: string,
  repo: string
): Promise<string> {
  const octokit = getOctokit(accessToken);

  const { data } = await octokit.repos.get({
    owner,
    repo,
  });

  return data.default_branch;
}

export async function getBranchSha(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const octokit = getOctokit(accessToken);

  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  return ref.object.sha;
}

export async function getPullRequestReviews(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubReview[]> {
  const octokit = getOctokit(accessToken);

  const { data } = await octokit.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
  });

  return data.map((review) => ({
    id: review.id,
    state: review.state as GitHubReview["state"],
    body: review.body,
    user: {
      login: review.user?.login || "unknown",
    },
    submitted_at: review.submitted_at ?? null,
  }));
}

export interface PRSummary {
  prNumber: number;
  prUrl: string;
  title: string;
  branchName: string;
  baseBranch: string;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
  totalAdditions: number;
  totalDeletions: number;
  totalChangedFiles: number;
  commits: Array<{
    sha: string;
    message: string;
  }>;
  mergedBy: string | null;
  mergedAt: string | null;
}

export async function getPRSummary(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRSummary> {
  const octokit = getOctokit(accessToken);

  // Get PR details
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Get files changed in the PR
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  // Get commits in the PR
  const { data: commits } = await octokit.pulls.listCommits({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  return {
    prNumber: pr.number,
    prUrl: pr.html_url,
    title: pr.title,
    branchName: pr.head.ref,
    baseBranch: pr.base.ref,
    files: files.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
    })),
    totalAdditions: pr.additions,
    totalDeletions: pr.deletions,
    totalChangedFiles: pr.changed_files,
    commits: commits.map((commit) => ({
      sha: commit.sha.substring(0, 7),
      message: commit.commit.message.split("\n")[0], // First line only
    })),
    mergedBy: pr.merged_by?.login || null,
    mergedAt: pr.merged_at,
  };
}

// ============= MERGE CONFLICT HANDLING =============

export interface MergeStatus {
  mergeable: boolean | null;
  mergeableState: string;
  behindBy: number;
  aheadBy: number;
  hasConflicts: boolean;
}

/**
 * Check if a PR has merge conflicts
 */
export async function checkPRMergeStatus(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<MergeStatus> {
  const octokit = getOctokit(accessToken);

  // Get PR details - need to fetch twice as mergeable may be null on first request
  let pr = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // If mergeable is null, GitHub is still computing - wait and retry
  if (pr.data.mergeable === null) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    pr = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
  }

  // Get comparison to see how far behind/ahead
  const comparison = await octokit.repos.compareCommits({
    owner,
    repo,
    base: pr.data.base.ref,
    head: pr.data.head.ref,
  });

  return {
    mergeable: pr.data.mergeable,
    mergeableState: pr.data.mergeable_state || "unknown",
    behindBy: comparison.data.behind_by,
    aheadBy: comparison.data.ahead_by,
    hasConflicts: pr.data.mergeable === false || pr.data.mergeable_state === "dirty",
  };
}

export interface ConflictingFile {
  path: string;
  status: string;
}

/**
 * Get list of files with conflicts (files that changed in both branches)
 */
export async function getConflictingFiles(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<ConflictingFile[]> {
  const octokit = getOctokit(accessToken);

  // Get PR to find branches
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Get files changed in PR
  const { data: prFiles } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  // Get commits on base branch since the PR branch diverged
  const { data: comparison } = await octokit.repos.compareCommits({
    owner,
    repo,
    base: pr.head.sha,
    head: pr.base.ref,
  });

  // Find files that changed in both
  const prFilePaths = new Set(prFiles.map((f) => f.filename));
  const baseChangedFiles = comparison.files?.map((f) => f.filename) || [];

  const conflictingFiles: ConflictingFile[] = [];
  for (const path of baseChangedFiles) {
    if (prFilePaths.has(path)) {
      conflictingFiles.push({ path, status: "both_modified" });
    }
  }

  return conflictingFiles;
}

/**
 * Update PR branch by merging base branch into it
 */
export async function updatePRBranch(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ success: boolean; message: string; sha?: string }> {
  const octokit = getOctokit(accessToken);

  try {
    const { data } = await octokit.pulls.updateBranch({
      owner,
      repo,
      pull_number: prNumber,
    });

    return {
      success: true,
      message: data.message || "Branch updated successfully",
      sha: (data as { sha?: string }).sha,
    };
  } catch (error) {
    // If automatic update fails due to conflicts, return error
    const message = error instanceof Error ? error.message : "Failed to update branch";
    return {
      success: false,
      message: message.includes("merge conflict")
        ? "Cannot auto-update: merge conflicts must be resolved manually or with AI"
        : message,
    };
  }
}


/**
 * Get content of conflicting files from both branches for AI resolution
 */
export async function getConflictDetails(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{
  baseBranch: string;
  headBranch: string;
  conflicts: Array<{
    path: string;
    baseContent: string | null;
    headContent: string | null;
  }>;
}> {
  const octokit = getOctokit(accessToken);

  // Get PR details
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const baseBranch = pr.base.ref;
  const headBranch = pr.head.ref;

  // Get conflicting files
  const conflictingFiles = await getConflictingFiles(accessToken, owner, repo, prNumber);

  // Get content from both branches for each conflicting file
  const conflicts = await Promise.all(
    conflictingFiles.map(async (file) => {
      const [baseContent, headContent] = await Promise.all([
        getFileContent(accessToken, owner, repo, file.path, baseBranch),
        getFileContent(accessToken, owner, repo, file.path, headBranch),
      ]);

      return {
        path: file.path,
        baseContent,
        headContent,
      };
    })
  );

  return {
    baseBranch,
    headBranch,
    conflicts,
  };
}
