// Jest setup file

// Mock environment variables
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-jest-testing';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.RESEND_API_KEY = '';
process.env.FROM_EMAIL = 'test@flowforge.dev';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless debugging
  log: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
  info: jest.fn(),
  debug: jest.fn(),
};
