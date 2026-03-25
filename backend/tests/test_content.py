# backend/tests/test_content.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestContent:
    """Tests du contenu"""
    
    def setup_method(self):
        """Préparation avant chaque test"""
        # Créer un utilisateur de test
        response = client.post("/api/auth/register", json={
            "email": "content@example.com",
            "password": "Test123456",
            "username": "contentuser",
            "role": "fan"
        })
        self.token = response.json()["access_token"]
        self.user_id = response.json()["user"]["id"]
    
    def test_create_post(self):
        """Test de création d'un post"""
        response = client.post(
            "/api/content/posts",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "type": "image",
                "caption": "Test post",
                "visibility": "public"
            },
            files=[("files", ("test.jpg", b"fake image content", "image/jpeg"))]
        )
        
        assert response.status_code == 200
        assert response.json()["caption"] == "Test post"
    
    def test_get_posts(self):
        """Test de récupération des posts"""
        response = client.get(
            "/api/content/posts",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_like_post(self):
        """Test de like d'un post"""
        # Créer un post d'abord
        post_response = client.post(
            "/api/content/posts",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "type": "image",
                "caption": "Post to like",
                "visibility": "public"
            },
            files=[("files", ("test.jpg", b"fake image", "image/jpeg"))]
        )
        
        post_id = post_response.json()["id"]
        
        # Liker le post
        response = client.post(
            f"/api/content/posts/{post_id}/like",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Post liked"
    
    def test_comment_on_post(self):
        """Test de commentaire sur un post"""
        # Créer un post
        post_response = client.post(
            "/api/content/posts",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "type": "image",
                "caption": "Post to comment",
                "visibility": "public"
            },
            files=[("files", ("test.jpg", b"fake image", "image/jpeg"))]
        )
        
        post_id = post_response.json()["id"]
        
        # Commenter
        response = client.post(
            f"/api/content/posts/{post_id}/comments",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"content": "Nice post!"}
        )
        
        assert response.status_code == 200
        assert response.json()["content"] == "Nice post!"