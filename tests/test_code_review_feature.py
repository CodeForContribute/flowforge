import unittest
from code_review_module import CodeReviewFeature

class TestCodeReviewFeature(unittest.TestCase):

    def setUp(self):
        self.feature = CodeReviewFeature()

    def test_feature_initialization(self):
        """Test that the feature initializes correctly"""
        self.assertIsNotNone(self.feature)

    def test_add_review_comment(self):
        """Test adding a review comment"""
        comment = "This is a test comment."
        self.feature.add_comment(comment)
        self.assertIn(comment, self.feature.comments)

    def test_remove_review_comment(self):
        """Test removing a review comment"""
        comment = "This is a test comment."
        self.feature.add_comment(comment)
        self.feature.remove_comment(comment)
        self.assertNotIn(comment, self.feature.comments)

    def test_add_duplicate_comment(self):
        """Test adding a duplicate comment raises ValueError"""
        comment = "This is a duplicate comment."
        self.feature.add_comment(comment)
        with self.assertRaises(ValueError):
            self.feature.add_comment(comment)

    def test_remove_nonexistent_comment(self):
        """Test removing a non-existent comment raises ValueError"""
        with self.assertRaises(ValueError):
            self.feature.remove_comment("Non-existent comment")

if __name__ == "__main__":
    unittest.main()
