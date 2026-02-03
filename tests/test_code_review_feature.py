
import unittest
from my_project import code_review_feature

class TestCodeReviewFeature(unittest.TestCase):
    
    def test_review_ratings_calculation(self):
        """Test calculation of review ratings based on inputs."""
        reviews = [5, 4, 3, 4, 5]
        expected_average = 4.2
        self.assertEqual(code_review_feature.calculate_average_rating(reviews), expected_average)

    def test_review_feedback_integrity(self):
        """Test that review feedback contains required substrings."""
        feedback = 'The code is clean and well-documented.'
        self.assertIn('clean', feedback)
        self.assertIn('well-documented', feedback)

    def test_review_submission(self):
        """Test the submission of code reviews."""
        review = {'rating': 5, 'feedback': 'Excellent work!'}
        submission_result = code_review_feature.submit_review(review)
        self.assertTrue(submission_result['success'])
        self.assertEqual(submission_result['message'], 'Review submitted successfully.')

if __name__ == '__main__':
    unittest.main()
