from app.core.auth_middleware import PUBLIC_PATHS, _is_paid_route


def test_paid_routes_are_not_public():
    paid_routes = {
        "/api/skin/analyze",
        "/api/skin/simulate",
        "/api/vto/clothes",
        "/api/vto/makeup",
        "/api/vto/earrings",
        "/api/vto/necklace",
        "/api/vto/hair",
        "/api/products/search",
        "/api/products/resolve-image",
        "/api/glowup/analyze",
        "/api/glowup/recommend",
    }

    assert paid_routes.isdisjoint(PUBLIC_PATHS)


def test_paid_route_detection_covers_costly_prefixes():
    assert _is_paid_route("/api/skin/analyze")
    assert _is_paid_route("/api/vto/clothes")
    assert _is_paid_route("/api/products/search")
    assert _is_paid_route("/api/glowup/analyze")
    assert not _is_paid_route("/api/onboarding/analyze")
    assert not _is_paid_route("/health")
