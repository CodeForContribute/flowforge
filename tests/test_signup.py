import unittest
from app import app
from flask import json

class TestSignup(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_signup_success(self):
        response = self.app.post('/signup',
                                 data=json.dumps(dict(username='testuser', password='password123')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('message', json.loads(response.data))

    def test_signup_missing_password(self):
        response = self.app.post('/signup',
                                 data=json.dumps(dict(username='testuser')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', json.loads(response.data))

    def test_signup_existing_user(self):
        # First attempt should succeed
        response = self.app.post('/signup',
                                 data=json.dumps(dict(username='testuser', password='password123')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)

        # Second attempt with the same username
        response = self.app.post('/signup',
                                 data=json.dumps(dict(username='testuser', password='password123')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 409)
        self.assertIn('error', json.loads(response.data))

if __name__ == '__main__':
    unittest.main()
