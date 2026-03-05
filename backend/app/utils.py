import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from typing import Optional, Dict
import base64
import secrets
import math

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

# ===============================
# CONFIG
# ===============================

JWT_SECRET = os.getenv("JWT_SECRET", "geocrypt-secret-key")
OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", "300"))

DEFAULT_GEOFENCE_RADIUS_METERS = 500  # ✅ 500 meters

# ===============================
# AUTH
# ===============================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_jwt_token(data: dict, expires_delta: timedelta = timedelta(hours=24)) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_jwt_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"

# ===============================
# FILE ENCRYPTION (SAFE)
# ===============================

# helper wrappers for the legacy X25519-based scheme.  we keep the
# original behaviour in helper functions so that the public API can
# switch between algorithms without duplicating the bulk of the code.

def _encrypt_file_x25519(content: bytes) -> tuple[bytes, str, str]:
    private_key = x25519.X25519PrivateKey.generate()
    public_key = private_key.public_key()

    shared_secret = private_key.exchange(public_key)

    aes_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"GeoCrypt file encryption",
    ).derive(shared_secret)

    iv = secrets.token_bytes(12)

    encryptor = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(iv)
    ).encryptor()

    ciphertext = encryptor.update(content) + encryptor.finalize()

    encrypted_blob = (
        public_key.public_bytes_raw()
        + iv
        + encryptor.tag
        + ciphertext
    )

    private_key_b64 = base64.b64encode(
        private_key.private_bytes_raw()
    ).decode()

    return encrypted_blob, private_key_b64, "x25519"


def _decrypt_file_x25519(encrypted_content: bytes, key_str: str) -> bytes:
    key_bytes = base64.b64decode(key_str)
    private_key = x25519.X25519PrivateKey.from_private_bytes(key_bytes)

    public_key_bytes = encrypted_content[:32]
    iv = encrypted_content[32:44]
    tag = encrypted_content[44:60]
    ciphertext = encrypted_content[60:]

    public_key = x25519.X25519PublicKey.from_public_bytes(public_key_bytes)
    shared_secret = private_key.exchange(public_key)

    aes_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"GeoCrypt file encryption",
    ).derive(shared_secret)

    decryptor = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(iv, tag)
    ).decryptor()

    return decryptor.update(ciphertext) + decryptor.finalize()


# Kyber helpers live in a separate module so we only import them when the
# environment is configured to use post‑quantum crypto.  the functions
# below mirror the X25519 helpers so the high‑level ``encrypt_file`` /
# ``decrypt_file`` APIs stay simple.

def _encrypt_file_kyber(content: bytes) -> tuple[bytes, str, str]:
    from app.crypto.kyber import generate_keypair, encapsulate

    # generate an ephemeral keypair and perform a self-encapsulation;
    # the resulting shared secret is used to derive the symmetric key.
    pub, sec = generate_keypair()
    ct, shared_secret = encapsulate(pub)

    aes_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"GeoCrypt file encryption",
    ).derive(shared_secret)

    iv = secrets.token_bytes(12)
    encryptor = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(iv)
    ).encryptor()
    ciphertext = encryptor.update(content) + encryptor.finalize()

    # encode lengths so we can parse the blob later; this lets us avoid
    # hard‑coding any algorithm‑specific constants.
    pk_len = len(pub).to_bytes(2, "big")
    ct_len = len(ct).to_bytes(2, "big")
    encrypted_blob = pk_len + ct_len + pub + ct + iv + encryptor.tag + ciphertext

    private_key_b64 = base64.b64encode(sec).decode()
    return encrypted_blob, private_key_b64, "kyber"


def _decrypt_file_kyber(encrypted_content: bytes, key_str: str) -> bytes:
    from app.crypto.kyber import decapsulate

    key_bytes = base64.b64decode(key_str)

    # parse the header we created earlier
    pk_len = int.from_bytes(encrypted_content[:2], "big")
    ct_len = int.from_bytes(encrypted_content[2:4], "big")
    offset = 4
    pub = encrypted_content[offset : offset + pk_len]
    offset += pk_len
    ct = encrypted_content[offset : offset + ct_len]
    offset += ct_len
    iv = encrypted_content[offset : offset + 12]
    offset += 12
    tag = encrypted_content[offset : offset + 16]
    offset += 16
    ciphertext = encrypted_content[offset:]

    shared_secret = decapsulate(ct, key_bytes)
    aes_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"GeoCrypt file encryption",
    ).derive(shared_secret)

    decryptor = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(iv, tag)
    ).decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()


def encrypt_file(content: bytes) -> tuple[bytes, str, str]:
    """Encrypt ``content`` and return ``(blob, key_str, algorithm)``.

    The algorithm is chosen based on the ``USE_KYBER`` environment
    variable; if the post‑quantum library is unavailable the code
    automatically falls back to the legacy X25519 method and logs a
    warning.
    """
    use_kyber = os.getenv("USE_KYBER", "false").lower() == "true"

    if use_kyber:
        try:
            return _encrypt_file_kyber(content)
        except Exception as e:  # pragma: no cover - may not have library
            print(f"[WARN] Kyber encrypt failed, falling back: {e}")

    return _encrypt_file_x25519(content)


def decrypt_file(encrypted_content: bytes, key_str: str, algorithm: str = "x25519") -> bytes:
    """Decrypt a blob previously produced by :func:`encrypt_file`.

    ``algorithm`` may be specified explicitly or pulled from a document
    field; if it is missing we assume the original X25519 behaviour for
    compatibility with older files.
    """
    if algorithm == "kyber":
        try:
            return _decrypt_file_kyber(encrypted_content, key_str)
        except Exception as e:  # pragma: no cover
            print(f"[WARN] Kyber decrypt failed, trying x25519: {e}")
            # fall through and let the x25519 helper attempt
    # default / fallback
    return _decrypt_file_x25519(encrypted_content, key_str)


# ===============================
# GEOLOCATION (500m – CORRECT)
# ===============================

def _haversine_distance_m(lat1, lon1, lat2, lon2) -> float:
    """
    Distance in meters between two GPS points
    """
    R = 6371000  # Earth radius (meters)

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1)
        * math.cos(phi2)
        * math.sin(dlambda / 2) ** 2
    )

    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def check_location(
    current_location: Dict[str, float],
    allocated_location: Dict[str, float],
) -> tuple[bool, str]:
    """
    allocated_location = {
        "lat": float,
        "lng": float,
        "radius": int (meters) [optional]
    }
    """

    if not current_location or not allocated_location:
        return False, "Location data missing"

    try:
        lat1 = float(current_location["lat"])
        lon1 = float(current_location["lng"])
        lat2 = float(allocated_location["lat"])
        lon2 = float(allocated_location["lng"])
    except (KeyError, ValueError, TypeError):
        return False, "Invalid location format"

    radius = int(
        allocated_location.get("radius", DEFAULT_GEOFENCE_RADIUS_METERS)
    )

    distance = _haversine_distance_m(lat1, lon1, lat2, lon2)

    print(f"[GEOFENCE] Distance={distance:.2f}m | Allowed={radius}m")

    if distance > radius:
        return False, f"Outside allowed location ({int(distance)}m > {radius}m)"

    return True, "Location allowed"

# ===============================
# TIME WINDOW (SERVER SAFE)
# ===============================

def check_time_allocated(start_time: str, end_time: str) -> tuple[bool, str]:
    if not start_time or not end_time:
        return False, "Time window not configured"

    now = datetime.now().time()

    try:
        start = datetime.strptime(start_time, "%H:%M").time()
        end = datetime.strptime(end_time, "%H:%M").time()
    except ValueError:
        return False, "Invalid time format"

    if start <= end:
        allowed = start <= now <= end
    else:
        # Overnight window (22:00 → 06:00)
        allowed = now >= start or now <= end

    if not allowed:
        return False, "Outside allowed time window"

    return True, "Time allowed"

# ===============================
# WIFI SSID CHECK (ROBUST)
# ===============================

def check_wifi_ssid(
    current_ssid: Optional[str],
    allowed_ssid: Optional[str],
) -> tuple[bool, str]:
    if not allowed_ssid:
        return True, "WiFi not restricted"

    if not current_ssid:
        return False, "WiFi SSID not detected"

    if current_ssid.strip().lower() != allowed_ssid.strip().lower():
        return False, "WiFi SSID mismatch"

    return True, "WiFi allowed"
