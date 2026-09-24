from datetime import UTC, datetime, timedelta

import pytest

from tests.conftest import auth_headers

TRIP_PAYLOAD = {
    "destination": "Kyoto, Japan",
    "start_date": "2027-10-01",
    "end_date": "2027-10-03",
    "trip_type": "couple",
}


def test_create_trip_auto_generates_days(client):
    headers = auth_headers(client)
    resp = client.post("/api/v1/trips", json=TRIP_PAYLOAD, headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["destination"] == "Kyoto, Japan"
    assert body["trip_type"] == "couple"
    assert [d["day_number"] for d in body["days"]] == [1, 2, 3]
    assert [d["date"] for d in body["days"]] == ["2027-10-01", "2027-10-02", "2027-10-03"]
    assert all(d["activities"] == [] for d in body["days"])


def test_create_trip_same_day_one_day(client):
    headers = auth_headers(client)
    payload = {**TRIP_PAYLOAD, "start_date": "2027-06-10", "end_date": "2027-06-10"}
    resp = client.post("/api/v1/trips", json=payload, headers=headers)
    assert resp.status_code == 201
    assert len(resp.json()["days"]) == 1


def test_create_trip_end_before_start_400(client):
    headers = auth_headers(client)
    payload = {**TRIP_PAYLOAD, "start_date": "2027-10-03", "end_date": "2027-10-01"}
    resp = client.post("/api/v1/trips", json=payload, headers=headers)
    assert resp.status_code == 400


def _utc_today_plus(days):
    return (datetime.now(UTC).date() + timedelta(days=days)).isoformat()


def test_create_trip_past_start_400(client):
    headers = auth_headers(client)
    payload = {**TRIP_PAYLOAD, "start_date": _utc_today_plus(-5), "end_date": _utc_today_plus(2)}
    resp = client.post("/api/v1/trips", json=payload, headers=headers)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "start_date cannot be in the past"


def test_create_trip_fully_past_400(client):
    headers = auth_headers(client)
    payload = {**TRIP_PAYLOAD, "start_date": _utc_today_plus(-10), "end_date": _utc_today_plus(-8)}
    resp = client.post("/api/v1/trips", json=payload, headers=headers)
    assert resp.status_code == 400


@pytest.mark.parametrize("offset", [-1, 0])
def test_create_trip_today_or_yesterday_utc_allowed(client, offset):
    # One day of slack covers users whose local date is behind UTC.
    headers = auth_headers(client)
    payload = {**TRIP_PAYLOAD, "start_date": _utc_today_plus(offset), "end_date": _utc_today_plus(offset + 1)}
    resp = client.post("/api/v1/trips", json=payload, headers=headers)
    assert resp.status_code == 201


def test_create_trip_requires_auth(client):
    resp = client.post("/api/v1/trips", json=TRIP_PAYLOAD)
    assert resp.status_code == 401


def test_create_trip_missing_destination_422(client):
    headers = auth_headers(client)
    payload = {k: v for k, v in TRIP_PAYLOAD.items() if k != "destination"}
    resp = client.post("/api/v1/trips", json=payload, headers=headers)
    assert resp.status_code == 422


def test_create_trip_invalid_trip_type_422(client):
    headers = auth_headers(client)
    payload = {**TRIP_PAYLOAD, "trip_type": "not_a_type"}
    resp = client.post("/api/v1/trips", json=payload, headers=headers)
    assert resp.status_code == 422


def test_list_trips_scoped_to_current_user(client):
    alice_headers = auth_headers(client, "alice", "hunter22")
    bob_headers = auth_headers(client, "bob", "hunter22")

    client.post("/api/v1/trips", json=TRIP_PAYLOAD, headers=alice_headers)

    alice_trips = client.get("/api/v1/trips", headers=alice_headers).json()
    bob_trips = client.get("/api/v1/trips", headers=bob_headers).json()
    assert len(alice_trips) == 1
    assert bob_trips == []


def test_get_trip_not_found_404(client):
    headers = auth_headers(client)
    resp = client.get("/api/v1/trips/does-not-exist", headers=headers)
    assert resp.status_code == 404


def test_get_trip_owned_by_another_user_404(client):
    alice_headers = auth_headers(client, "alice", "hunter22")
    bob_headers = auth_headers(client, "bob", "hunter22")

    trip = client.post("/api/v1/trips", json=TRIP_PAYLOAD, headers=alice_headers).json()
    resp = client.get(f"/api/v1/trips/{trip['id']}", headers=bob_headers)
    assert resp.status_code == 404


def test_delete_trip_cascades(client):
    headers = auth_headers(client)
    trip = client.post("/api/v1/trips", json=TRIP_PAYLOAD, headers=headers).json()
    day_id = trip["days"][0]["id"]
    client.post(f"/api/v1/trips/{trip['id']}/days/{day_id}/activities", json={"text": "Museum"}, headers=headers)

    resp = client.delete(f"/api/v1/trips/{trip['id']}", headers=headers)
    assert resp.status_code == 204
    assert client.get(f"/api/v1/trips/{trip['id']}", headers=headers).status_code == 404


def test_delete_trip_owned_by_another_user_404(client):
    alice_headers = auth_headers(client, "alice", "hunter22")
    bob_headers = auth_headers(client, "bob", "hunter22")

    trip = client.post("/api/v1/trips", json=TRIP_PAYLOAD, headers=alice_headers).json()
    resp = client.delete(f"/api/v1/trips/{trip['id']}", headers=bob_headers)
    assert resp.status_code == 404
