import unittest

from pydantic import ValidationError

from app.core.config import Settings


class DeploymentConfigTests(unittest.TestCase):
    def test_production_rejects_development_secret(self):
        with self.assertRaises(ValidationError):
            Settings(APP_ENV="production", DEBUG=False,
                     SECRET_KEY="super-secret-development-key-change-this-in-production-min32chars",
                     ALLOWED_ORIGINS=["https://reader.example.test"])

    def test_production_rejects_debug(self):
        with self.assertRaises(ValidationError):
            Settings(APP_ENV="production", DEBUG=True, SECRET_KEY="x" * 48,
                     ALLOWED_ORIGINS=["https://reader.example.test"])

    def test_production_accepts_explicit_configuration(self):
        settings = Settings(APP_ENV="production", DEBUG=False, SECRET_KEY="x" * 48,
                            ALLOWED_ORIGINS=["https://reader.example.test"])
        self.assertEqual(settings.APP_ENV, "production")


if __name__ == "__main__":
    unittest.main()
