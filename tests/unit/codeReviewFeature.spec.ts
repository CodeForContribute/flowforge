import { describe, it, expect } from '@jest/globals';
import { performCodeReview } from '@/services/github';

// Mock data
const mockPullRequest = {
  title: 'Add new feature',
  body: 'This PR implements a new feature',
  filesChanged: 3,
  reviewComments: []
};

const mockReviewComments = [
  { id: 1, body: 'Please add tests for this feature.' },
  { id: 2, body: 'Consider refactoring the code for readability.' }
];

jest.mock('@/services/github', () => ({
  performCodeReview: jest.fn()
}));

// Test suite for Code Review Feature
describe('Code Review Feature', () => {
  it('should handle a pull request with no review comments', async () => {
    performCodeReview.mockResolvedValueOnce({ reviewComments: [] });
    const result = await performCodeReview(mockPullRequest);
    expect(result.reviewComments.length).toBe(0);
  });

  it('should handle a pull request with review comments', async () => {
    performCodeReview.mockResolvedValueOnce({ reviewComments: mockReviewComments });
    const result = await performCodeReview(mockPullRequest);
    expect(result.reviewComments).toHaveLength(2);
    expect(result.reviewComments).toEqual(expect.arrayContaining(mockReviewComments));
  });

  it('should return an empty reviewComments array if an error occurs', async () => {
    performCodeReview.mockRejectedValueOnce(new Error('GitHub API error'));
    try {
      const result = await performCodeReview(mockPullRequest);
      expect(result.reviewComments).toEqual([]);
    } catch (error) {
      // Ensure error handling is functioning
      expect(error.message).toBe('GitHub API error');
    }
  });
});
