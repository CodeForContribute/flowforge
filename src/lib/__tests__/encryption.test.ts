import { encrypt, decrypt, maskApiKey } from '../encryption';

describe('encryption', () => {
  // Reset environment for each test
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-jest-testing';
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encrypt', () => {
    it('should encrypt a string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'Hello, World!';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt empty string', () => {
      const encrypted = encrypt('');
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should encrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+{}|:"<>?[];\',./-=`~';
      const encrypted = encrypt(plaintext);
      expect(encrypted).toBeDefined();
    });

    it('should encrypt unicode characters', () => {
      const plaintext = 'Hello \u4e16\u754c! \ud83d\ude00';
      const encrypted = encrypt(plaintext);
      expect(encrypted).toBeDefined();
    });

    it('should throw error if ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt empty string', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('should decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+{}|:"<>?[];\',./-=`~';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt unicode characters', () => {
      const plaintext = 'Hello \u4e16\u754c! \ud83d\ude00';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt long strings', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error if ENCRYPTION_KEY is not set', () => {
      const encrypted = encrypt('test');
      delete process.env.ENCRYPTION_KEY;

      expect(() => decrypt(encrypted)).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('should throw error for invalid ciphertext', () => {
      expect(() => decrypt('invalid')).toThrow();
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encrypt('test');
      // Tamper with the ciphertext
      const tampered = encrypted.slice(0, -4) + 'xxxx';

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('encrypt and decrypt roundtrip', () => {
    const testCases = [
      'simple text',
      '',
      ' ',
      'text with\nnewlines',
      'text with\ttabs',
      JSON.stringify({ key: 'value', nested: { array: [1, 2, 3] } }),
      'a'.repeat(1000),
      'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // GitHub token format
      'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // OpenAI key format
    ];

    testCases.forEach((testCase) => {
      it(`should roundtrip: "${testCase.substring(0, 30)}..."`, () => {
        const encrypted = encrypt(testCase);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(testCase);
      });
    });
  });

  describe('maskApiKey', () => {
    it('should mask API key showing last 4 characters', () => {
      const apiKey = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const masked = maskApiKey(apiKey);

      expect(masked).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022xxxx');
    });

    it('should mask short keys completely', () => {
      const apiKey = 'short';
      const masked = maskApiKey(apiKey);

      expect(masked).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
    });

    it('should mask keys exactly 8 characters', () => {
      const apiKey = '12345678';
      const masked = maskApiKey(apiKey);

      expect(masked).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
    });

    it('should mask keys of 9 characters showing last 4', () => {
      const apiKey = '123456789';
      const masked = maskApiKey(apiKey);

      expect(masked).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u20226789');
    });

    it('should handle empty string', () => {
      const masked = maskApiKey('');
      expect(masked).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
    });

    it('should handle very long keys', () => {
      const apiKey = 'a'.repeat(100) + '1234';
      const masked = maskApiKey(apiKey);

      expect(masked).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u20221234');
    });
  });
});
