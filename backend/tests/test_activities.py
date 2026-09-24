from tests.conftest import auth_headers

TRIP_PAYLOAD = {
    "destination": "Goa",
    "start_date": "2027-12-10",
    "end_date": "2027-12-12",
    "trip_type": "group_of_friends",
}


def _create_trip(client, headers):
    return client.post("/api/v1/trips", json=TRIP_PAYLOAD, headers=headers).json()


def test_create_activity(client):
    headers = auth_headers(client)
    trip = _create_trip(client, headers)
    day_id = trip["days"][0]["id"]

    resp = client.post(
        f"/api/v1/trips/{trip['id']}/days/{day_id}/activities",
        json={"text": "Visit the beach"},
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["text"] == "Visit the beach"
    assert body["sort_order"] == 0


def test_create_activity_appends_sort_order(client):
    headers = auth_headers(client)
    trip = _create_trip(client, headers)
    day_id = trip["days"][0]["id"]

    a1 = client.post(
        f"/api/v1/trips/{trip['id']}/days/{day_id}/activities", json={"text": "A"}, headers=headers
    ).json()
    a2 = client.post(
        f"/api/v1/trips/{trip['id']}/days/{day_id}/activities", json={"text": "B"}, headers=headers
    ).json()
    assert a1["sort_order"] == 0
    assert a2["sort_order"] == 1


def test_create_activity_empty_text_400(client):
    headers = auth_headers(client)
    trip = _create_trip(client, headers)
    day_id = trip["days"][0]["id"]

    resp = client.post(
        f"/api/v1/trips/{trip['id']}/days/{day_id}/activities", json={"text": "   "}, headers=headers
    )
    assert resp.status_code == 400


def test_create_activity_day_not_found_404(client):
    headers = auth_headers(client)
    trip = _create_trip(client, headers)

    resp = client.post(
        f"/api/v1/trips/{trip['id']}/days/does-not-exist/activities",
        json={"text": "X"},
        headers=headers,
    )
    assert resp.status_code == 404


def test_create_activity_on_another_users_trip_404(client):
    alice_headers = auth_headers(client, "alice", "hunter22")
    bob_headers = auth_headers(client, "bob", "hunter22")
    trip = _create_trip(client, alice_headers)
    day_id = trip["days"][0]["id"]

    resp = client.post(
        f"/api/v1/trips/{trip['id']}/days/{day_id}/activities",
        json={"text": "X"},
        headers=bob_headers,
    )
    assert resp.status_code == 404


def test_update_activity(client):
    headers = auth_headers(client)
    trip = _create_trip(client, headers)
    day_id = trip["days"][0]["id"]
    activity = client.post(
        f"/api/v1/trips/{trip['id']}/days/{day_id}/activities", json={"text": "X"}, headers=headers
    ).json()

    resp = client.patch(f"/api/v1/activities/{activity['id']}", json={"text": "Renamed"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["text"] == "Renamed"


def test_update_activity_empty_text_400(client):
    headers = auth_headers(client)
    trip = _create_trip(client, headers)
    day_id = trip["days"][0]["id"]
    activity = client.post(
        f"/api/v1/trips/{trip['id']}/days/{day_id}/activities", json={"text": "X"}, headers=headers
    ).json()

    resp = client.patch(f"/api/v1/activities/{activity['id']}", json={"text": ""}, headers=headers)
    assert resp.status_code == 400


def test_update_activity_not_found_404(client):
    headers = auth_headers(client)
    resp = client.patch("/api/v1/activities/does-not-exist", json={"text": "x"}, headers=headers)
    assert resp.status_code == 404


def test_update_activity_owned_by_another_user_404(client):
    alice_headers = auth_headers(client, "alice", "hunter22")
    bob_headers = auth_headers(client, "bob", "hunter22")
    trip = _create_trip(client, alice_headers)
    day_id = trip["days"][0]["id"]
    activity = client.post(
        f"/api/v1/trips/{trip['id']}/days/{day_id}/activities", json={"text": "X"}, headers=alice_headers
    ).json()

    resp = client.patch(f"/api/v1/activities/{activity['id']}", json={"text": "hijacked"}, headers=bob_headers)
    assert resp.status_code == 404


def test_delete_activity(client):
    headers = auth_headers(client)
    trip = _create_trip(client, headers)
    day_id = trip["days"][0]["id"]
    activity = client.post(
        f"/api/v1/trips/{trip['id']}/days/{day_id}/activities", json={"text": "X"}, headers=headers
    ).json()

    resp = client.delete(f"/api/v1/activities/{activity['id']}", headers=headers)
    assert resp.status_code == 204
    resp = client.delete(f"/api/v1/activities/{activity['id']}", headers=headers)
    assert resp.status_code == 404
