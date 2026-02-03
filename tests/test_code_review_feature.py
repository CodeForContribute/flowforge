
import unittest
from code_review import CodeReview

class TestCodeReviewFeature(unittest.TestCase):
    def setUp(self):
        self.review = CodeReview()

    def test_add_comment(self):
        result = self.review.add_comment('Great job!')
        self.assertTrue(result)

    def test_add_duplicate_comment(self):
        self.review.add_comment('Great work!')
        result = self.review.add_comment('Great work!')
        self.assertFalse(result)

    def test_remove_comment(self):
        self.review.add_comment('Needs improvement.')
        result = self.review.remove_comment('Needs improvement.')
        self.assertTrue(result)

    def test_remove_non_existent_comment(self):
        result = self.review.remove_comment('This is wrong!')
        self.assertFalse(result)

    def test_get_all_comments(self):
        self.review.add_comment('Well done!')
        comments = self.review.get_all_comments()
        self.assertIn('Well done!', comments)

    def test_get_comments_count(self):
        self.review.add_comment('Consider refactoring.')
        self.review.add_comment('Looks good.')
        count = self.review.get_comments_count()
        self.assertEqual(count, 2)

    def test_clear_comments(self):
        self.review.add_comment('Clean code!')
        self.review.clear_comments()
        comments = self.review.get_all_comments()
        self.assertEqual(len(comments), 0)

    def test_update_comment(self):
        self.review.add_comment('Typo here.')
        result = self.review.update_comment('Typo here.', 'Spelling mistake.')
        self.assertTrue(result)

    def test_update_non_existent_comment(self):
        result = self.review.update_comment('Invalid comment', 'New suggestion')
        self.assertFalse(result)

    def test_contains_comment(self):
        self.review.add_comment('Review this part.')
        contains = self.review.contains_comment('Review this part.')
        self.assertTrue(contains)

if __name__ == '__main__':
    unittest.main()