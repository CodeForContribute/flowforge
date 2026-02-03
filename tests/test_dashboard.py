import unittest
from dashboard import Dashboard

class TestDashboard(unittest.TestCase):
    def setUp(self):
        self.dashboard = Dashboard()

    def test_initial_state(self):
        """Test the initial state of the dashboard"""
        self.assertIsNotNone(self.dashboard)
        self.assertEqual(self.dashboard.data, [])

    def test_add_widget(self):
        """Test adding a widget to the dashboard"""
        original_count = len(self.dashboard.widgets)
        self.dashboard.add_widget('Test Widget')
        self.assertEqual(len(self.dashboard.widgets), original_count + 1)

    def test_remove_widget(self):
        """Test removing a widget from the dashboard"""
        self.dashboard.add_widget('Test Widget')
        self.dashboard.remove_widget('Test Widget')
        self.assertNotIn('Test Widget', self.dashboard.widgets)

    def test_update_widget(self):
        """Test updating a widget's data in the dashboard"""
        self.dashboard.add_widget('Test Widget')
        self.dashboard.update_widget('Test Widget', 'Updated Data')
        self.assertEqual(self.dashboard.widgets['Test Widget'], 'Updated Data')

    def test_dashboard_summary(self):
        """Test the dashboard summary generation"""
        self.dashboard.add_widget('Widget 1')
        self.dashboard.add_widget('Widget 2')
        summary = self.dashboard.get_summary()
        self.assertIn('Widget 1', summary)
        self.assertIn('Widget 2', summary)

if __name__ == '__main__':
    unittest.main()
