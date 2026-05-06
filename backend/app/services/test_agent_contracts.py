import pytest

from app.services.agent import AgentServiceError, _validate_agent_response


def test_validate_agent_response_accepts_expected_schema():
    payload = {
        "steps": [{"icon": "scan", "text": "Skin scores were loaded.", "status": "complete"}],
        "insight": "Focus on dark circles first.",
        "recommendations": [
            {"title": "Review Skin Health", "description": "Open skin details.", "action": "/skin"}
        ],
        "tool_calls_made": ["skin-analysis"],
    }

    validated = _validate_agent_response(payload)

    assert validated["insight"] == "Focus on dark circles first."
    assert validated["steps"][0]["icon"] == "scan"
    assert validated["recommendations"][0]["action"] == "/skin"


def test_validate_agent_response_rejects_unrenderable_payloads():
    with pytest.raises(AgentServiceError):
        _validate_agent_response({"steps": [], "recommendations": []})
