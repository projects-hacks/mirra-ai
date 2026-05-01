"""Mock interceptor — switch between mock and live API responses."""
import json
from pathlib import Path

from app.core.config import settings

MOCKS_DIR = Path(__file__).parent.parent.parent / "mocks"


def should_mock() -> bool:
    """Check if mock mode is enabled."""
    return settings.USE_MOCKS


def get_mock(task_type: str) -> dict:
    """Load a mock response for the given task type.

    Args:
        task_type: API task type, e.g. 'skin-analysis', 'clothes-vto'

    Returns:
        Parsed JSON mock response.

    Raises:
        FileNotFoundError: If no mock file exists for this task type.
    """
    mock_path = MOCKS_DIR / f"{task_type}.json"
    if not mock_path.exists():
        raise FileNotFoundError(
            f"No mock found for '{task_type}'. "
            f"Capture one from Perfect Corp Playground and save to {mock_path}"
        )
    return json.loads(mock_path.read_text())
