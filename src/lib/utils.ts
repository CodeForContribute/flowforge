import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function generateBranchName(taskTitle: string, taskId: string): string {
  const slug = slugify(taskTitle).slice(0, 40);
  const shortId = taskId.slice(-6);
  return `flowforge/${slug}-${shortId}`;
}

export function parseGitHubRepo(repoUrl: string): { owner: string; repo: string } | null {
  // Handle formats: owner/repo, https://github.com/owner/repo, git@github.com:owner/repo.git
  const patterns = [
    /^([^/]+)\/([^/]+)$/,
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
    /github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
  ];

  for (const pattern of patterns) {
    const match = repoUrl.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }
  return null;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
