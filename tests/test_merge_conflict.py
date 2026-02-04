import unittest
from merge_tool import resolve_conflict

class TestMergeConflict(unittest.TestCase):
    def test_resolve_conflict_both_sides_same(self):
        base = 'Line 1\nLine 2\nLine 3'
        left = 'Line 1\nLine 2\nLine 3'
        right = 'Line 1\nLine 2\nLine 3'
        result = resolve_conflict(base, left, right)
        self.assertEqual(result, 'Line 1\nLine 2\nLine 3')

    def test_resolve_conflict_prefers_left(self):
        base = 'Line 1\nLine 2\nLine 3'
        left = 'Line 1\nLeft Change\nLine 3'
        right = 'Line 1\nLine 2\nLine 3'
        result = resolve_conflict(base, left, right)
        self.assertEqual(result, 'Line 1\nLeft Change\nLine 3')

    def test_resolve_conflict_conflicting_changes(self):
        base = 'Line 1\nLine 2\nLine 3'
        left = 'Line 1\nLeft Change\nLine 3'
        right = 'Line 1\nRight Change\nLine 3'
        with self.assertRaises(ValueError):
            resolve_conflict(base, left, right)

    def test_resolve_conflict_no_base_change(self):
        base = 'Line 1\nLine 2\nLine 3'
        left = 'Line 1\nLine 2 changed\nLine 3'
        right = 'Line 1\nLine 2\nLine 4 added'
        result = resolve_conflict(base, left, right)
        self.assertEqual(result, 'Line 1\nLine 2 changed\nLine 4 added')

if __name__ == '__main__':
    unittest.main()