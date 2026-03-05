"""
Crypto status endpoint.

Returns information about the active encryption algorithm so the frontend
can display the correct badge on encrypted files.
"""
import os
from fastapi import APIRouter

from app.crypto.kyber import is_available as kyber_is_available, ALGORITHM_NAME

router = APIRouter(prefix="/crypto", tags=["Crypto"])


@router.get("/status")
async def get_crypto_status():
    """Return the active encryption configuration."""
    use_kyber = os.getenv("USE_KYBER", "false").lower() == "true"
    kyber_ok = kyber_is_available()

    if use_kyber and kyber_ok:
        active_algorithm = "kyber"
        algorithm_label = "CRYSTALS-Kyber (ML-KEM-768) — Post-Quantum"
    else:
        active_algorithm = "x25519"
        algorithm_label = "X25519 + AES-256-GCM (Classical)"

    return {
        "kyber_available": kyber_ok,
        "use_kyber_env": use_kyber,
        "active_algorithm": active_algorithm,
        "algorithm_label": algorithm_label,
        "post_quantum_ready": kyber_ok and use_kyber,
        "kyber_backend": "kyber-py (Pure Python ML-KEM-768)" if kyber_ok else None,
    }
