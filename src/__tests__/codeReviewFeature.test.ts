import { describe, it, expect } from '@jest/globals';

// Mock function or service to simulate code review changes
type MockReviewService = {
    addComment: (comment: string) => void;
    removeComment: (commentId: string) => void;
    listComments: () => string[];
};

// Simulating a basic mock for code review service
const mockReviewService: MockReviewService = {
    comments: [],
    addComment(comment) {
        this.comments.push(comment);
    },
    removeComment(commentId) {
        this.comments = this.comments.filter(c => c !== commentId);
    },
    listComments() {
        return this.comments;
    }
};

// Unit test for code review feature
describe('Code Review Feature', () => {
    it('should add a comment', () => {
        mockReviewService.addComment('This is a new comment');
        const comments = mockReviewService.listComments();
        expect(comments).toContain('This is a new comment');
    });

    it('should remove a comment', () => {
        mockReviewService.addComment('Comment to be removed');
        mockReviewService.removeComment('Comment to be removed');
        const comments = mockReviewService.listComments();
        expect(comments).not.toContain('Comment to be removed');
    });

    it('should list comments correctly', () => {
        mockReviewService.addComment('First comment');
        mockReviewService.addComment('Second comment');
        const comments = mockReviewService.listComments();
        expect(comments).toEqual(['First comment', 'Second comment']);
    });
});
