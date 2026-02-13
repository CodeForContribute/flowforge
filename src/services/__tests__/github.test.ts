import { handleMergeConflict } from '../github';

describe('github service', () => {
  describe('handleMergeConflict', () => {
    it('should return formatted conflict details for each conflict', () => {
      const conflicts = [
        {
          title: 'Conflict in file1.ts',
          filePath: 'src/file1.ts',
          conflictingSections: [
            { start: 10, end: 20 },
            { start: 50, end: 55 },
          ],
        },
        {
          title: 'Conflict in file2.ts',
          filePath: 'src/file2.ts',
          conflictingSections: [{ start: 5, end: 15 }],
        },
      ];

      const result = handleMergeConflict(conflicts);

      expect(result).toContain('Conflict: Conflict in file1.ts');
      expect(result).toContain('File: src/file1.ts');
      expect(result).toContain('Lines 10 to 20');
      expect(result).toContain('Lines 50 to 55');
      expect(result).toContain('Conflict: Conflict in file2.ts');
      expect(result).toContain('File: src/file2.ts');
      expect(result).toContain('Lines 5 to 15');
    });

    it('should return "No conflicts detected." for empty array', () => {
      const result = handleMergeConflict([]);
      expect(result).toBe('No conflicts detected.');
    });

    it('should handle a single conflict with multiple sections', () => {
      const conflicts = [
        {
          title: 'Multi-section conflict',
          filePath: 'src/app.ts',
          conflictingSections: [
            { start: 1, end: 10 },
            { start: 20, end: 30 },
            { start: 40, end: 50 },
          ],
        },
      ];

      const result = handleMergeConflict(conflicts);
      expect(result).toContain('Lines 1 to 10');
      expect(result).toContain('Lines 20 to 30');
      expect(result).toContain('Lines 40 to 50');
    });

    it('should include conflict title and file path for each conflict', () => {
      const conflicts = [
        {
          title: 'Merge issue',
          filePath: 'lib/utils.ts',
          conflictingSections: [{ start: 100, end: 200 }],
        },
      ];

      const result = handleMergeConflict(conflicts);
      expect(result).toContain('Conflict: Merge issue');
      expect(result).toContain('File: lib/utils.ts');
    });
  });
});
