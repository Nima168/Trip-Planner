"""
Integration test for the acceptance criterion: "Share links are read-only
and require no login" (backend-spec.md / api-contract.md).

Skipped: share-link endpoints (POST/DELETE /trips/{id}/share,
GET /share/{token}) are not implemented yet. Written against the contract
in specs/api-contract.md so it should pass, or need only minor adjustment,
once that work lands -- remove the skip marker at that point.
"""

import pytest


@pytest.mark.skip(reason="Share-link endpoints not implemented yet (see specs/api-contract.md)")
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
    assert client.delete(f"/share/{token}").status_code == 404

    # A revoked/unknown token resolves to not-found, not a partial payload.
    client.delete(f"/trips/{trip['id']}/share")
    assert client.get(f"/share/{token}").status_code == 404
