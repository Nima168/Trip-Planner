def test_create_and_list_trip(client):
    resp = client.post("/trips", json={"name": "Japan"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Japan"
    assert body["days"] == []
    assert body["start_date"] is None
    assert body["end_date"] is None

    resp = client.get("/trips")
    assert resp.status_code == 200
    trips = resp.json()
    assert len(trips) == 1
    assert trips[0]["day_count"] == 0


def test_list_trips_empty(client):
    resp = client.get("/trips")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_trip_empty_name_422(client):
    resp = client.post("/trips", json={"name": ""})
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "name" in body["error"]["fields"]


def test_create_trip_missing_name_422(client):
    resp = client.post("/trips", json={})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_get_trip_not_found(client):
    resp = client.get("/trips/does-not-exist")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


def test_delete_trip(client):
    trip = client.post("/trips", json={"name": "X"}).json()
    resp = client.delete(f"/trips/{trip['id']}")
    assert resp.status_code == 204
    assert client.get(f"/trips/{trip['id']}").status_code == 404


def test_delete_trip_not_found(client):
    resp = client.delete("/trips/does-not-exist")
    assert resp.status_code == 404
