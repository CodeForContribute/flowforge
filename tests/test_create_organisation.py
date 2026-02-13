
import unittest
from organisation import create_organisation

class TestCreateOrganisation(unittest.TestCase):

    def test_create_organisation_success(self):
        response = create_organisation({"name": "New Org", "contact_email": "contact@org.com"})
        self.assertTrue(response['success'])
        self.assertIn('organisation_id', response)

    def test_create_organisation_missing_name(self):
        response = create_organisation({"contact_email": "contact@org.com"})
        self.assertFalse(response['success'])
        self.assertEqual(response['error'], "Missing organisation name")

    def test_create_organisation_invalid_email(self):
        response = create_organisation({"name": "New Org", "contact_email": "invalidemail"})
        self.assertFalse(response['success'])
        self.assertEqual(response['error'], "Invalid contact email")

    def test_create_organisation_empty_payload(self):
        response = create_organisation({})
        self.assertFalse(response['success'])
        self.assertEqual(response['error'], "Payload is empty")

    def test_create_organisation_no_contact_email(self):
        response = create_organisation({"name": "New Org"})
        self.assertFalse(response['success'])
        self.assertEqual(response['error'], "Missing contact email")

if __name__ == '__main__':
    unittest.main()
