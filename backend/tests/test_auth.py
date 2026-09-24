from tests.conftest import signup


def test_signup_returns_token(client):
    body = signup(client, "alice", "hunter22")
    assert body["token_type"] == "bearer"
    assert body["username"] == "alice"
    assert body["access_token"]
    assert body["expires_in"] > 0


def test_signup_duplicate_username_400(client):
    signup(client, "alice", "hunter22")
    resp = client.post("/api/v1/auth/signup", json={"username": "alice", "password": "other123"})
    assert resp.status_code == 400


def test_login_success(client):
    signup(client, "alice", "hunter22")
    resp = client.post("/api/v1/auth/login", json={"username": "alice", "password": "hunter22"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "alice"


def test_login_wrong_password_401(client):
    signup(client, "alice", "hunter22")
    resp = client.post("/api/v1/auth/login", json={"username": "alice", "password": "wrong"})
    assert resp.status_code == 401


def test_login_unknown_user_401(client):
    resp = client.post("/api/v1/auth/login", json={"username": "nobody", "password": "hunter22"})
    assert resp.status_code == 401


def test_protected_route_without_token_401(client):
    resp = client.get("/api/v1/trips")
    assert resp.status_code == 401


def test_protected_route_with_invalid_token_401(client):
    resp = client.get("/api/v1/trips", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401
