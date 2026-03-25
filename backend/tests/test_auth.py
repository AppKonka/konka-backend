# backend/tests/test_auth.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestAuth:
    """Tests d'authentification"""
    
    def setup_method(self):
        """Préparation avant chaque test"""
        self.test_user = {
            "email": "test@example.com",
            "password": "Test123456",
            "username": "testuser",
            "display_name": "Test User",
            "role": "fan"
        }
    
    def test_register_success(self):
        """Test d'inscription réussie"""
        response = client.post("/api/auth/register", json=self.test_user)
        assert response.status_code == 201
        assert "access_token" in response.json()
        assert "user" in response.json()
        assert response.json()["user"]["email"] == self.test_user["email"]
    
    def test_register_duplicate_email(self):
        """Test d'inscription avec email déjà utilisé"""
        # Première inscription
        client.post("/api/auth/register", json=self.test_user)
        
        # Deuxième inscription avec même email
        response = client.post("/api/auth/register", json=self.test_user)
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
    
    def test_register_weak_password(self):
        """Test d'inscription avec mot de passe faible"""
        weak_user = self.test_user.copy()
        weak_user["password"] = "weak"
        response = client.post("/api/auth/register", json=weak_user)
        assert response.status_code == 422
    
    def test_login_success(self):
        """Test de connexion réussie"""
        # Créer un utilisateur
        client.post("/api/auth/register", json=self.test_user)
        
        # Se connecter
        response = client.post("/api/auth/login", json={
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        })
        assert response.status_code == 200
        assert "access_token" in response.json()
    
    def test_login_invalid_password(self):
        """Test de connexion avec mot de passe invalide"""
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
    
    def test_get_current_user(self):
        """Test de récupération de l'utilisateur connecté"""
        # Créer et connecter un utilisateur
        register_response = client.post("/api/auth/register", json=self.test_user)
        token = register_response.json()["access_token"]
        
        # Récupérer le profil
        response = client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["email"] == self.test_user["email"]
    
    def test_refresh_token(self):
        """Test de rafraîchissement du token"""
        register_response = client.post("/api/auth/register", json=self.test_user)
        refresh_token = register_response.json()["refresh_token"]
        
        response = client.post("/api/auth/refresh", json={
            "refresh_token": refresh_token
        })
        assert response.status_code == 200
        assert "access_token" in response.json()


# backend/tests/test_users.py
class TestUsers:
    """Tests des utilisateurs"""
    
    def setup_method(self):
        """Préparation avant chaque test"""
        # Créer un utilisateur
        response = client.post("/api/auth/register", json={
            "email": "user@example.com",
            "password": "Test123456",
            "username": "testuser",
            "role": "fan"
        })
        self.token = response.json()["access_token"]
        self.user_id = response.json()["user"]["id"]
    
    def test_get_profile(self):
        """Test de récupération du profil"""
        response = client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        assert response.json()["username"] == "testuser"
    
    def test_update_profile(self):
        """Test de mise à jour du profil"""
        response = client.put(
            "/api/users/me",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"bio": "New bio", "city": "Paris"}
        )
        assert response.status_code == 200
        assert response.json()["bio"] == "New bio"
        assert response.json()["city"] == "Paris"
    
    def test_follow_user(self):
        """Test d'abonnement à un utilisateur"""
        # Créer un deuxième utilisateur
        response2 = client.post("/api/auth/register", json={
            "email": "user2@example.com",
            "password": "Test123456",
            "username": "user2",
            "role": "artist"
        })
        user2_id = response2.json()["user"]["id"]
        
        # S'abonner
        response = client.post(
            f"/api/users/{user2_id}/follow",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully followed user"
    
    def test_unfollow_user(self):
        """Test de désabonnement"""
        # Créer un deuxième utilisateur
        response2 = client.post("/api/auth/register", json={
            "email": "user3@example.com",
            "password": "Test123456",
            "username": "user3",
            "role": "artist"
        })
        user3_id = response2.json()["user"]["id"]
        
        # S'abonner puis se désabonner
        client.post(
            f"/api/users/{user3_id}/follow",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        response = client.delete(
            f"/api/users/{user3_id}/follow",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully unfollowed user"
    
    def test_get_followers(self):
        """Test de récupération des abonnés"""
        # Créer un deuxième utilisateur
        response2 = client.post("/api/auth/register", json={
            "email": "user4@example.com",
            "password": "Test123456",
            "username": "user4",
            "role": "artist"
        })
        user4_id = response2.json()["user"]["id"]
        
        # S'abonner
        client.post(
            f"/api/users/{self.user_id}/follow",
            headers={"Authorization": f"Bearer {response2.json()['access_token']}"}
        )
        
        response = client.get(
            f"/api/users/{self.user_id}/followers",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        assert len(response.json()["data"]) > 0


# backend/tests/test_music.py
class TestMusic:
    """Tests de la musique"""
    
    def setup_method(self):
        """Préparation avant chaque test"""
        # Créer un artiste
        response = client.post("/api/auth/register", json={
            "email": "artist@example.com",
            "password": "Test123456",
            "username": "artist",
            "role": "artist"
        })
        self.token = response.json()["access_token"]
        self.user_id = response.json()["user"]["id"]
    
    def test_create_track(self):
        """Test de création d'un morceau"""
        # Cette requête nécessite un fichier audio
        # En test, on simule avec un fichier factice
        with open("test_audio.mp3", "wb") as f:
            f.write(b"fake audio content")
        
        with open("test_audio.mp3", "rb") as audio:
            response = client.post(
                "/api/music/tracks",
                headers={"Authorization": f"Bearer {self.token}"},
                data={
                    "title": "Test Track",
                    "genre": "rap",
                    "is_public": True
                },
                files={"audio": audio}
            )
            assert response.status_code == 200
            assert response.json()["title"] == "Test Track"
    
    def test_get_tracks(self):
        """Test de récupération des morceaux"""
        response = client.get("/api/music/tracks")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_track(self):
        """Test de récupération d'un morceau spécifique"""
        # Créer un morceau d'abord
        with open("test_audio2.mp3", "wb") as f:
            f.write(b"fake audio content")
        
        with open("test_audio2.mp3", "rb") as audio:
            create_response = client.post(
                "/api/music/tracks",
                headers={"Authorization": f"Bearer {self.token}"},
                data={"title": "Test Track 2", "genre": "pop"},
                files={"audio": audio}
            )
            track_id = create_response.json()["id"]
        
        response = client.get(f"/api/music/tracks/{track_id}")
        assert response.status_code == 200
        assert response.json()["title"] == "Test Track 2"
    
    def test_like_track(self):
        """Test de like d'un morceau"""
        # Créer un morceau
        with open("test_audio3.mp3", "wb") as f:
            f.write(b"fake audio content")
        
        with open("test_audio3.mp3", "rb") as audio:
            create_response = client.post(
                "/api/music/tracks",
                headers={"Authorization": f"Bearer {self.token}"},
                data={"title": "Test Track 3"},
                files={"audio": audio}
            )
            track_id = create_response.json()["id"]
        
        # Liker
        response = client.post(
            f"/api/music/tracks/{track_id}/like",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Track liked"


# backend/tests/test_payments.py
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