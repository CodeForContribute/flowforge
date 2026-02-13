import { isProjectKey, isTaskKey, parseTaskKey, isCuid } from '../task-lookup';

describe('Task Lookup Utilities', () => {
  describe('isProjectKey', () => {
    it('should return true for valid project keys (2-10 uppercase letters)', () => {
      expect(isProjectKey('FF')).toBe(true);
      expect(isProjectKey('PROJ')).toBe(true);
      expect(isProjectKey('MYPROJECT')).toBe(true);
      expect(isProjectKey('ABCDEFGHIJ')).toBe(true); // 10 chars
    });

    it('should return false for single letter', () => {
      expect(isProjectKey('A')).toBe(false);
    });

    it('should return false for more than 10 uppercase letters', () => {
      expect(isProjectKey('ABCDEFGHIJK')).toBe(false); // 11 chars
    });

    it('should return false for lowercase', () => {
      expect(isProjectKey('proj')).toBe(false);
      expect(isProjectKey('Proj')).toBe(false);
    });

    it('should return false for strings with numbers', () => {
      expect(isProjectKey('FF1')).toBe(false);
    });

    it('should return false for strings with special chars', () => {
      expect(isProjectKey('FF-')).toBe(false);
      expect(isProjectKey('FF_X')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isProjectKey('')).toBe(false);
    });
  });

  describe('isTaskKey', () => {
    it('should return true for valid task keys', () => {
      expect(isTaskKey('FF-1')).toBe(true);
      expect(isTaskKey('FF-123')).toBe(true);
      expect(isTaskKey('PROJ-99999')).toBe(true);
      expect(isTaskKey('A-1')).toBe(true);
    });

    it('should return false for project keys without number', () => {
      expect(isTaskKey('FF')).toBe(false);
      expect(isTaskKey('FF-')).toBe(false);
    });

    it('should return false for lowercase prefix', () => {
      expect(isTaskKey('ff-123')).toBe(false);
    });

    it('should return false for missing hyphen', () => {
      expect(isTaskKey('FF123')).toBe(false);
    });

    it('should return false for CUIDs', () => {
      expect(isTaskKey('clxyz123abc456def')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isTaskKey('')).toBe(false);
    });
  });

  describe('parseTaskKey', () => {
    it('should parse valid task keys', () => {
      expect(parseTaskKey('FF-1')).toEqual({ projectKey: 'FF', taskNumber: 1 });
      expect(parseTaskKey('PROJ-123')).toEqual({ projectKey: 'PROJ', taskNumber: 123 });
      expect(parseTaskKey('A-99999')).toEqual({ projectKey: 'A', taskNumber: 99999 });
    });

    it('should return null for invalid task keys', () => {
      expect(parseTaskKey('ff-1')).toBeNull();
      expect(parseTaskKey('FF')).toBeNull();
      expect(parseTaskKey('123')).toBeNull();
      expect(parseTaskKey('')).toBeNull();
      expect(parseTaskKey('FF-')).toBeNull();
      expect(parseTaskKey('-123')).toBeNull();
    });

    it('should return null for keys with spaces', () => {
      expect(parseTaskKey('FF -1')).toBeNull();
      expect(parseTaskKey('FF- 1')).toBeNull();
    });
  });

  describe('isCuid', () => {
    it('should return true for valid CUID-like strings', () => {
      expect(isCuid('clxyz123abc456def789012')).toBe(true);
      expect(isCuid('cm1234567890abcdefghijk')).toBe(true);
    });

    it('should return false for strings not starting with c', () => {
      expect(isCuid('alxyz123abc456def789012')).toBe(false);
    });

    it('should return true for c + 20 chars (minimum valid length)', () => {
      expect(isCuid('c12345678901234567890')).toBe(true); // c + 20 = 21 total
    });

    it('should return false for c + 19 chars (too short)', () => {
      expect(isCuid('c1234567890123456789')).toBe(false); // c + 19 = 20 total
    });

    it('should return false for empty string', () => {
      expect(isCuid('')).toBe(false);
    });

    it('should return false for task keys', () => {
      expect(isCuid('FF-123')).toBe(false);
    });

    it('should return false for project keys', () => {
      expect(isCuid('PROJ')).toBe(false);
    });
  });
});
