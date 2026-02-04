import { handleMergeConflict } from '@/services/github';
import { describe, it, expect } from '@jest/globals';

// Mock data for conflicts
type Conflict = {
  title: string;
  filePath: string;
  conflictingSections: Array<{ start: number; end: number; }>
};

const mockConflicts: Conflict[] = [
  {
    title: 'Conflict in file1.ts',
    filePath: 'src/file1.ts',
    conflictingSections: [
      { start: 10, end: 20 },
      { start: 50, end: 55 }
    ]
  },
  {
    title: 'Conflict in file2.ts',
    filePath: 'src/file2.ts',
    conflictingSections: [
      { start: 5, end: 15 }
    ]
  }
];

describe('handleMergeConflict', () => {
  it('should correctly identify and log merge conflicts', () => {
    const result = handleMergeConflict(mockConflicts);
    expect(result).toContain('Conflict detected in src/file1.ts');
    expect(result).toContain('Conflict detected in src/file2.ts');
  });

  it('should return a readable format for each conflict', () => {
    const result = handleMergeConflict(mockConflicts);
    mockConflicts.forEach(conflict => {
      expect(result).toContain(`Conflict: ${conflict.title}`);
      conflict.conflictingSections.forEach(section => {
        expect(result).toContain(`Lines ${section.start} to ${section.end}`);
      });
    });
  });

  it('should handle no conflicts gracefully', () => {
    const result = handleMergeConflict([]);
    expect(result).toBe('No conflicts detected.');
  });
});
