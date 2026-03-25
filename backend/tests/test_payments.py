# backend/tests/test_payments.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestPayments:
    """Tests des paiements"""
    
    def setup_method(self):
        """Préparation avant chaque test"""
        response = client.post("/api/auth/register", json={
            "email": "payment@example.com",
            "password": "Test123456",
            "username": "paymentuser",
            "role": "fan"
        })
        self.token = response.json()["access_token"]
    
    def test_create_payment_intent(self):
        """Test de création d'un intent de paiement"""
        response = client.post(
            "/api/payments/stripe/create-intent",
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "amount": 29.99,
                "currency": "eur",
                "payment_type": "dedication"
            }
        )
        
        assert response.status_code == 200
        assert "client_secret" in response.json()
        assert response.json()["amount"] == 29.99
    
    def test_get_transactions(self):
        """Test de récupération des transactions"""
        response = client.get(
            "/api/payments/transactions",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        assert "data" in response.json()