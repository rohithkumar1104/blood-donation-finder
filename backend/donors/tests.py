from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import DonorProfile

URL = "/api/donors/profile/"


def valid_payload(**overrides):
    payload = {
        "full_name": "Asha Rao",
        "phone": "9876543210",
        "date_of_birth": "1995-04-12",
        "gender": "female",
        "blood_group": "O-",
        "weight_kg": 58,
        "state": "Karnataka",
        "city": "Hassan",
        "last_donation_date": None,
        "is_available": True,
    }
    payload.update(overrides)
    return payload


class DonorProfileApiTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user("asha", "asha@example.com", "pass12345")
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_requires_login(self):
        self.client.credentials()
        self.assertEqual(self.client.post(URL, valid_payload(), format="json").status_code, 401)

    def test_create_profile(self):
        response = self.client.post(URL, valid_payload(), format="json")
        self.assertEqual(response.status_code, 201)
        profile = DonorProfile.objects.get(user=self.user)
        self.assertEqual(profile.blood_group, "O-")
        self.assertEqual(profile.city, "Hassan")
        self.assertNotIn("user", response.data)

    def test_phone_is_normalised(self):
        response = self.client.post(URL, valid_payload(phone="+91 98765 43210"), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["phone"], "9876543210")

    def test_second_profile_for_same_user_is_rejected(self):
        self.client.post(URL, valid_payload(), format="json")
        response = self.client.post(URL, valid_payload(phone="9123456780"), format="json")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(DonorProfile.objects.count(), 1)

    def test_duplicate_phone_is_rejected(self):
        other = get_user_model().objects.create_user("ravi", "r@example.com", "pass12345")
        DonorProfile.objects.create(user=other, **{k: v for k, v in valid_payload().items() if k != "last_donation_date"})
        response = self.client.post(URL, valid_payload(), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data)

    def test_age_limits(self):
        young = (date.today() - timedelta(days=365 * 15)).isoformat()
        old = (date.today() - timedelta(days=365 * 70)).isoformat()
        for dob in (young, old):
            response = self.client.post(URL, valid_payload(date_of_birth=dob), format="json")
            self.assertEqual(response.status_code, 400)
            self.assertIn("date_of_birth", response.data)

    def test_minimum_weight(self):
        response = self.client.post(URL, valid_payload(weight_kg=40), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("weight_kg", response.data)

    def test_invalid_choices_and_phone(self):
        response = self.client.post(
            URL, valid_payload(blood_group="Z+", gender="x", phone="12345"), format="json"
        )
        self.assertEqual(response.status_code, 400)
        for field in ("blood_group", "gender", "phone"):
            self.assertIn(field, response.data)

    def test_future_last_donation_rejected(self):
        future = (date.today() + timedelta(days=3)).isoformat()
        response = self.client.post(URL, valid_payload(last_donation_date=future), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("last_donation_date", response.data)

    def test_get_and_patch_own_profile(self):
        self.assertEqual(self.client.get(URL).status_code, 404)
        self.client.post(URL, valid_payload(), format="json")
        self.assertEqual(self.client.get(URL).data["full_name"], "Asha Rao")
        response = self.client.patch(URL, {"is_available": False}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(DonorProfile.objects.get(user=self.user).is_available)
