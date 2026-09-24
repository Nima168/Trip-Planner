import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401  ensures models are registered on Base.metadata
from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(engine)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def signup(client, username="alice", password="hunter22"):
    resp = client.post("/api/v1/auth/signup", json={"username": username, "password": password})
    assert resp.status_code == 201, resp.text
    return resp.json()


def auth_headers(client, username="alice", password="hunter22"):
    token = signup(client, username, password)["access_token"]
    return {"Authorization": f"Bearer {token}"}
