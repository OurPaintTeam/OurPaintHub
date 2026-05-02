import hashlib
import secrets
from typing import Tuple

from django.conf import settings
from django.core import signing
from django.core.cache import cache
from rest_framework.exceptions import AuthenticationFailed

from api.models.auth import AuthRefreshSession
from api.models.user import User
from api.utils.constants import ACCESS_TOKEN_TTL_SECONDS, ACCESS_SALT


def hash_token(token: str) -> str:
    """Hash a token with a random salt using PBKDF2"""
    salt = secrets.token_bytes(16)
    hash_value = hashlib.pbkdf2_hmac(
        "sha256",
        token.encode(),
        salt,
        600_000,  # OWASP recommended minimum for 2024
    )
    return salt.hex() + ":" + hash_value.hex()


def verify_token(token: str, stored_hash: str) -> bool:
    """Verify a token against its stored hash"""
    try:
        salt_hex, hash_hex = stored_hash.split(":")
        salt = bytes.fromhex(salt_hex)
        computed = hashlib.pbkdf2_hmac(
            "sha256",
            token.encode(),
            salt,
            600_000,
        )
        return secrets.compare_digest(computed.hex(), hash_hex)
    except (ValueError, TypeError):
        return False


def create_access_token(user: User, session: AuthRefreshSession) -> str:
    """Create a signed access token"""
    payload = {
        "user_id": user.id,
        "session_id": session.id,
        "revoked_at": session.revoked_at.isoformat() if session.revoked_at else None,
        "type": "access",
    }
    return signing.dumps(payload, salt=ACCESS_SALT)


def parse_access_token(token: str) -> Tuple[User, AuthRefreshSession]:
    """Parse and validate an access token"""
    try:
        payload = signing.loads(
            token,
            salt=ACCESS_SALT,
            max_age=ACCESS_TOKEN_TTL_SECONDS,
        )
    except signing.SignatureExpired:
        raise AuthenticationFailed("access_token_expired")
    except signing.BadSignature:
        raise AuthenticationFailed("access_token_invalid")

    if payload.get("type") != "access":
        raise AuthenticationFailed("invalid_token_type")

    # Fast check without DB query
    if payload.get("revoked_at"):
        raise AuthenticationFailed("session_revoked")

    # Try cache first
    cache_key = f"session_{payload['session_id']}"
    session = cache.get(cache_key)

    if not session:
        try:
            session = AuthRefreshSession.objects.select_related("user").get(
                id=payload["session_id"],
                user_id=payload["user_id"],
                user__is_active=True,
            )
            # Cache for 5 minutes
            cache.set(cache_key, session, 300)
        except AuthRefreshSession.DoesNotExist:
            raise AuthenticationFailed("session_not_found")

    if not session.user:
        raise AuthenticationFailed("user_not_found")

    if session.revoked_at:
        cache.delete(cache_key)
        raise AuthenticationFailed("session_revoked")

    return session.user, session
