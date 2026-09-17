"""
Integration test for the acceptance criterion: "Share links are read-only
and require no login" (backend-spec.md / api-contract.md).
"""


def test_share_link_is_read_only_and_requires_no_login(client):
    trip = client.post("/trips", json={"name": "Japan"}).json()
    client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"})

    # Generate a share link as the owner.
    share = client.post(f"/trips/{trip['id']}/share").json()
    token = share["token"]

    # No auth header of any kind is sent -- resolving the link requires no login.
    resp = client.get(f"/share/{token}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == trip["id"]
    assert body["days"][0]["date"] == "2026-05-01"

    # Read-only: no write route is exposed under the public share-token namespace.
    day_id = body["days"][0]["id"]
    assert client.post(f"/share/{token}/days", json={"date": "2026-05-02"}).status_code == 404
    assert (
        client.patch(f"/share/{token}/days/{day_id}", json={"notes": "x"}).status_code == 404
    )
    # /share/{token} itself only has a GET route registered, so DELETE on that
    # exact path is a matched-path-wrong-method 405, not a 404 -- still proof
    # there's no delete capability at all under the public share namespace.
    assert client.delete(f"/share/{token}").status_code == 405

    # A revoked/unknown token resolves to not-found, not a partial payload.
    client.delete(f"/trips/{trip['id']}/share")
    assert client.get(f"/share/{token}").status_code == 404


def test_create_share_link_is_idempotent(client):
    trip = client.post("/trips", json={"name": "Japan"}).json()
    first = client.post(f"/trips/{trip['id']}/share")
    second = client.post(f"/trips/{trip['id']}/share")
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["token"] == second.json()["token"]


def test_create_share_link_trip_not_found(client):
    resp = client.post("/trips/does-not-exist/share")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


def test_delete_share_link_idempotent_when_none_exists(client):
    trip = client.post("/trips", json={"name": "Japan"}).json()
    resp = client.delete(f"/trips/{trip['id']}/share")
    assert resp.status_code == 204


def test_delete_share_link_trip_not_found(client):
    resp = client.delete("/trips/does-not-exist/share")
    assert resp.status_code == 404


def test_regenerate_share_link_issues_a_new_token(client):
    trip = client.post("/trips", json={"name": "Japan"}).json()
    first_token = client.post(f"/trips/{trip['id']}/share").json()["token"]
    client.delete(f"/trips/{trip['id']}/share")
    second_token = client.post(f"/trips/{trip['id']}/share").json()["token"]
    assert first_token != second_token


def test_get_shared_trip_unknown_token(client):
    resp = client.get("/share/does-not-exist")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


def test_shared_day_conditions_unknown_token(client):
    trip = client.post("/trips", json={"name": "Japan"}).json()
    day = client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"}).json()
    resp = client.get(f"/share/does-not-exist/days/{day['id']}/conditions")
    assert resp.status_code == 404


def test_shared_day_conditions_day_not_in_trip(client):
    trip1 = client.post("/trips", json={"name": "Trip 1"}).json()
    trip2 = client.post("/trips", json={"name": "Trip 2"}).json()
    day_in_trip2 = client.post(f"/trips/{trip2['id']}/days", json={"date": "2026-05-01"}).json()
    token = client.post(f"/trips/{trip1['id']}/share").json()["token"]

    resp = client.get(f"/share/{token}/days/{day_in_trip2['id']}/conditions")
    assert resp.status_code == 404


def test_shared_day_conditions_no_location_returns_unavailable(client):
    trip = client.post("/trips", json={"name": "Japan"}).json()
    day = client.post(f"/trips/{trip['id']}/days", json={"date": "2026-05-01"}).json()
    token = client.post(f"/trips/{trip['id']}/share").json()["token"]

    resp = client.get(f"/share/{token}/days/{day['id']}/conditions")
    assert resp.status_code == 200
    assert resp.json() == {"status": "unavailable"}
