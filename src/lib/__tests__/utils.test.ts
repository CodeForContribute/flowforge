import { cn, slugify, formatDate, formatDateTime, generateBranchName, parseGitHubRepo, truncate } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('should handle arrays of classes', () => {
      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });

    it('should handle undefined and null values', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });

    it('should handle objects with boolean values', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });
  });

  describe('slugify', () => {
    it('should convert text to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('hello world')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
    });

    it('should handle multiple spaces and hyphens', () => {
      expect(slugify('hello   world---test')).toBe('hello-world-test');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(slugify('---hello world---')).toBe('hello-world');
    });

    it('should handle underscores', () => {
      expect(slugify('hello_world_test')).toBe('hello-world-test');
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle string with only special characters', () => {
      expect(slugify('!@#$%^&*()')).toBe('');
    });

    it('should preserve numbers', () => {
      expect(slugify('Test 123 Task')).toBe('test-123-task');
    });
  });

  describe('formatDate', () => {
    it('should format a Date object correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDate(date)).toBe('Jan 15, 2024');
    });

    it('should format a date string correctly', () => {
      expect(formatDate('2024-06-20')).toBe('Jun 20, 2024');
    });

    it('should handle ISO date strings', () => {
      expect(formatDate('2024-12-25T00:00:00.000Z')).toBe('Dec 25, 2024');
    });
  });

  describe('formatDateTime', () => {
    it('should format a Date object with time', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTime(date);
      expect(result).toContain('Jan 15, 2024');
      expect(result).toContain(':30');
    });

    it('should format a date string with time', () => {
      const result = formatDateTime('2024-06-20T09:15:00');
      expect(result).toContain('Jun 20, 2024');
    });
  });

  describe('generateBranchName', () => {
    it('should generate a valid branch name', () => {
      const result = generateBranchName('Add user authentication', 'abc123def456');
      expect(result).toBe('flowforge/add-user-authentication-def456');
    });

    it('should truncate long task titles to 40 characters', () => {
      const longTitle = 'This is a very long task title that should be truncated to fit';
      const result = generateBranchName(longTitle, 'abc123def456');
      expect(result.startsWith('flowforge/')).toBe(true);
      expect(result.endsWith('-def456')).toBe(true);
      // The slug part (between flowforge/ and -shortId) should be <= 40 chars
      const slugPart = result.replace('flowforge/', '').replace('-def456', '');
      expect(slugPart.length).toBeLessThanOrEqual(40);
    });

    it('should use the last 6 characters of taskId', () => {
      const result = generateBranchName('Test', 'prefix-xyz789');
      expect(result).toBe('flowforge/test-xyz789');
    });

    it('should handle special characters in task title', () => {
      const result = generateBranchName('Fix bug #123: User login!', 'task-abc123');
      expect(result).toBe('flowforge/fix-bug-123-user-login-abc123');
    });

    it('should handle empty task title', () => {
      const result = generateBranchName('', 'abc123def456');
      expect(result).toBe('flowforge/-def456');
    });
  });

  describe('parseGitHubRepo', () => {
    it('should parse owner/repo format', () => {
      const result = parseGitHubRepo('octocat/hello-world');
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' });
    });

    it('should parse https://github.com/owner/repo format', () => {
      const result = parseGitHubRepo('https://github.com/octocat/hello-world');
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' });
    });

    it('should parse https://github.com/owner/repo.git format', () => {
      const result = parseGitHubRepo('https://github.com/octocat/hello-world.git');
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' });
    });

    it('should parse git@github.com:owner/repo.git format', () => {
      const result = parseGitHubRepo('git@github.com:octocat/hello-world.git');
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' });
    });

    it('should parse git@github.com:owner/repo format without .git', () => {
      const result = parseGitHubRepo('git@github.com:octocat/hello-world');
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' });
    });

    it('should return null for invalid format', () => {
      expect(parseGitHubRepo('invalid-url')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseGitHubRepo('')).toBeNull();
    });

    it('should return null for URL without owner/repo', () => {
      expect(parseGitHubRepo('https://github.com')).toBeNull();
    });

    it('should handle repos with dots in name', () => {
      const result = parseGitHubRepo('octocat/hello.world.project');
      expect(result).toEqual({ owner: 'octocat', repo: 'hello.world.project' });
    });
  });

  describe('truncate', () => {
    it('should return original text if shorter than maxLength', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should return original text if equal to maxLength', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should truncate and add ellipsis if longer than maxLength', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should handle empty string', () => {
      expect(truncate('', 5)).toBe('');
    });

    it('should handle maxLength of 3 (minimum for ellipsis)', () => {
      expect(truncate('Hello', 3)).toBe('...');
    });

    it('should handle long text correctly', () => {
      const longText = 'This is a very long text that needs to be truncated';
      const result = truncate(longText, 20);
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });
  });
});
