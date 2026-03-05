"""
Post-quantum key encapsulation module using CRYSTALS-Kyber (ML-KEM-768).

Uses the `kyber-py` pure-Python library (kyber_py package) which provides
the Kyber768 parameter set matching the NIST ML-KEM-768 standard.

Public API (matches what utils.py expects):
    generate_keypair()  -> (public_key: bytes, secret_key: bytes)
    encapsulate(pk)     -> (ciphertext: bytes, shared_secret: bytes)
    decapsulate(ct, sk) -> shared_secret: bytes

Encrypted payload format stored per file:
    [2-byte pk_len][2-byte ct_len][pk][ct][iv][tag][ciphertext]
"""

import os

# ---------------------------------------------------------------------------
# Library import — kyber-py (pure Python, no C dependencies, Windows-safe)
# ---------------------------------------------------------------------------
try:
    from kyber_py.kyber import Kyber768 as _Kyber768
    _backend = "kyber_py"
except ImportError:
    _Kyber768 = None
    _backend = None


def is_available() -> bool:
    """Return True if the Kyber library is importable and functional."""
    return _Kyber768 is not None


def _ensure_lib():
    if _Kyber768 is None:
        raise RuntimeError(
            "Post-quantum Kyber library not available. "
            "Install it with: pip install kyber-py"
        )


# ---------------------------------------------------------------------------
# Core KEM operations
# ---------------------------------------------------------------------------

def generate_keypair() -> tuple[bytes, bytes]:
    """Generate a Kyber768 keypair.

    Returns
    -------
    (public_key, secret_key) as raw bytes.
    """
    _ensure_lib()
    pk, sk = _Kyber768.keygen()
    return pk, sk


def encapsulate(public_key: bytes) -> tuple[bytes, bytes]:
    """Encapsulate a shared secret using the provided public key.

    Returns
    -------
    (ciphertext, shared_secret) — both raw bytes.
    The shared_secret is 32 bytes and is suitable for use as an AES-256 key.
    """
    _ensure_lib()
    # kyber_py returns (K, c) — we rearrange to (ciphertext, shared_secret)
    shared_secret, ciphertext = _Kyber768.encaps(public_key)
    return ciphertext, shared_secret


def decapsulate(ciphertext: bytes, secret_key: bytes) -> bytes:
    """Recover the shared secret from ciphertext using the secret key.

    Returns
    -------
    shared_secret as raw bytes (32 bytes).
    """
    _ensure_lib()
    shared_secret = _Kyber768.decaps(secret_key, ciphertext)
    return shared_secret


# ---------------------------------------------------------------------------
# Size constants (Kyber-768 parameter set)
# ---------------------------------------------------------------------------
# These values are fixed by the Kyber-768 specification.
PUBLIC_KEY_SIZE  = 1184   # bytes
SECRET_KEY_SIZE  = 2400   # bytes
CIPHERTEXT_SIZE  = 1088   # bytes
SHARED_SECRET_SIZE = 32   # bytes

ALGORITHM_NAME = "kyber768"
BACKEND = _backend
