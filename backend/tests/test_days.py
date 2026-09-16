def _create_trip(client, name="Trip"):
    return client.post("/trips", json={"name": name}).json()


def test_create_day(client):
    trip = _create_trip(client)
    resp = client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["date"] == "2026-05-01"
    assert body["position"] == 0
    assert body["activities"] == []
    assert body["start_time"] is None


def test_create_day_positions_append(client):
    trip = _create_trip(client)
    day1 = client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"}).json()
    day2 = client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-02"}).json()
    assert day1["position"] == 0
    assert day2["position"] == 1


def test_create_day_trip_not_found_404(client):
    resp = client.post("/trips/does-not-exist/days", json={"date": "2026-05-01"})
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


def test_create_day_end_before_start_422(client):
    trip = _create_trip(client)
    resp = client.post(
        f"/trips/{trip['id']}/days",
        json={"date": "2026-05-01", "start_time": "10:00", "end_time": "09:00"},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "end_time" in body["error"]["fields"]


def test_create_day_equal_start_end_allowed(client):
    trip = _create_trip(client)
    resp = client.post(
        f"/trips/{trip['id']}/days",
        json={"date": "2026-05-01", "start_time": "09:00", "end_time": "09:00"},
    )
    assert resp.status_code == 201
    assert resp.json()["start_time"] == "09:00"


def test_create_day_only_start_time_set_allowed(client):
    trip = _create_trip(client)
    resp = client.post(
        f"/trips/{trip['id']}/days",
        json={"date": "2026-05-01", "start_time": "09:00"},
    )
    assert resp.status_code == 201


def test_create_day_duplicate_date_409(client):
    trip = _create_trip(client)
    client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"})
    resp = client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"})
    assert resp.status_code == 409
    body = resp.json()
    assert body["error"]["code"] == "CONFLICT"
    assert "fields" not in body["error"]


def test_same_date_allowed_on_different_trips(client):
    trip1 = _create_trip(client, "Trip 1")
    trip2 = _create_trip(client, "Trip 2")
    resp1 = client.post(f"/trips/{trip1['id']}/days", json={"date": "2026-05-01"})
    resp2 = client.post(f"/trips/{trip2['id']}/days", json={"date": "2026-05-01"})
    assert resp1.status_code == 201
    assert resp2.status_code == 201


def test_update_day(client):
    trip = _create_trip(client)
    day = client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"}).json()
    resp = client.patch(f"/trips/{trip['id']}/days/{day['id']}", json={"notes": "Beach day"})
    assert resp.status_code == 200
    assert resp.json()["notes"] == "Beach day"


def test_update_day_merged_validation_422(client):
    trip = _create_trip(client)
    day = client.post(
        f"/trips/{trip['id']}/days",
        json={"date": "2026-05-01", "start_time": "09:00", "end_time": "17:00"},
    ).json()
    resp = client.patch(f"/trips/{trip['id']}/days/{day['id']}", json={"start_time": "18:00"})
    assert resp.status_code == 422
    assert "end_time" in resp.json()["error"]["fields"]


def test_update_day_date_conflict_409(client):
    trip = _create_trip(client)
    client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"})
    day2 = client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-02"}).json()
    resp = client.patch(f"/trips/{trip['id']}/days/{day2['id']}", json={"date": "2026-05-01"})
    assert resp.status_code == 409


def test_update_day_not_found(client):
    trip = _create_trip(client)
    resp = client.patch(f"/trips/{trip['id']}/days/does-not-exist", json={"notes": "x"})
    assert resp.status_code == 404


def test_delete_day(client):
    trip = _create_trip(client)
    day = client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"}).json()
    resp = client.delete(f"/trips/{trip['id']}/days/{day['id']}")
    assert resp.status_code == 204


def test_delete_day_cascades_activities(client):
    trip = _create_trip(client)
    day = client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"}).json()
    client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "Arrive", "start_time": "09:00", "end_time": "10:00"},
    )
    resp = client.delete(f"/trips/{trip['id']}/days/{day['id']}")
    assert resp.status_code == 204

    trip_after = client.get(f"/trips/{trip['id']}").json()
    assert trip_after["days"] == []
