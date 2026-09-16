def _create_trip(client, name="Trip"):
    return client.post("/trips", json={"name": name}).json()


def _create_day(client, trip_id, date="2026-05-01"):
    return client.post(f"/trips/{trip_id}/days", json={"date": date}).json()


def test_create_activity(client):
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    resp = client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "Museum", "start_time": "09:00", "end_time": "11:00", "location": "Louvre"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Museum"
    assert body["location"] == "Louvre"
    assert body["position"] == 0


def test_create_activity_positions_append(client):
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    a1 = client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "A", "start_time": "09:00", "end_time": "10:00"},
    ).json()
    a2 = client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "B", "start_time": "10:00", "end_time": "11:00"},
    ).json()
    assert a1["position"] == 0
    assert a2["position"] == 1


def test_create_activity_day_not_found_404(client):
    trip = _create_trip(client)
    resp = client.post(
        f"/trips/{trip['id']}/days/does-not-exist/activities",
        json={"title": "X", "start_time": "09:00", "end_time": "10:00"},
    )
    assert resp.status_code == 404


def test_create_activity_end_before_start_422(client):
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    resp = client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "X", "start_time": "11:00", "end_time": "09:00"},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "end_time" in body["error"]["fields"]


def test_create_activity_equal_start_end_allowed(client):
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    resp = client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "X", "start_time": "09:00", "end_time": "09:00"},
    )
    assert resp.status_code == 201


def test_create_activity_missing_title_422(client):
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    resp = client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "", "start_time": "09:00", "end_time": "10:00"},
    )
    assert resp.status_code == 422


def test_create_activity_missing_times_422(client):
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    resp = client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "X"},
    )
    assert resp.status_code == 422


def test_update_activity(client):
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    activity = client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "X", "start_time": "09:00", "end_time": "10:00"},
    ).json()
    resp = client.patch(
        f"/trips/{trip['id']}/days/{day['id']}/activities/{activity['id']}",
        json={"title": "Renamed"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Renamed"


def test_update_activity_merged_validation_422(client):
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    activity = client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "X", "start_time": "09:00", "end_time": "10:00"},
    ).json()
    resp = client.patch(
        f"/trips/{trip['id']}/days/{day['id']}/activities/{activity['id']}",
        json={"start_time": "11:00"},
    )
    assert resp.status_code == 422
    assert "end_time" in resp.json()["error"]["fields"]


def test_update_activity_not_found(client):
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    resp = client.patch(
        f"/trips/{trip['id']}/days/{day['id']}/activities/does-not-exist",
        json={"title": "x"},
    )
    assert resp.status_code == 404


def test_delete_activity(client):
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    activity = client.post(
        f"/trips/{trip['id']}/days/{day['id']}/activities",
        json={"title": "X", "start_time": "09:00", "end_time": "10:00"},
    ).json()
    resp = client.delete(f"/trips/{trip['id']}/days/{day['id']}/activities/{activity['id']}")
    assert resp.status_code == 204

    resp = client.delete(f"/trips/{trip['id']}/days/{day['id']}/activities/{activity['id']}")
    assert resp.status_code == 404
