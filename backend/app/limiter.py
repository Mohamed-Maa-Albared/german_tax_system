from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Single shared Limiter instance.
# Attached to app.state in main.py; imported + used as decorator in api/admin.py.
limiter = Limiter(key_func=get_remote_address, default_limits=[])
