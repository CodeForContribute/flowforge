import { test, describe, expect } from '@jest/globals';
import { handleCodeReview } from '../services/github';

// Mock data for testing
const mockPullRequestData = {
  id: 1,
  title: 'Add new feature',
  comments: [
    {
      id: 101,
      body: 'Please update the README.',
      user: {
        login: 'reviewer1'
      }
    },
    {
      id: 102,
      body: 'LGTM',
      user: {
        login: 'reviewer2'
      }
    }
  ]
};

const mockReviewHandlerResponse = {
  updated: true,
  messages: ['Reviewed: Please update the README.']
};

// Mock the actual function that will handle the business logic
jest.mock('../services/github', () => ({
  handleCodeReview: jest.fn(() => mockReviewHandlerResponse)
}));

describe('Code Review Feature', () => {
  test('should process code review comments correctly', async () => {
    const response = await handleCodeReview(mockPullRequestData);
    
    expect(response.updated).toBe(true);
    expect(response.messages.length).toBeGreaterThan(0);
    expect(response.messages[0]).toBe('Reviewed: Please update the README.');
  });

  test('should handle empty comments', async () => {
    const response = await handleCodeReview({ ...mockPullRequestData, comments: [] });
    
    expect(response.updated).toBe(false);
    expect(response.messages.length).toBe(0);
  });
});
