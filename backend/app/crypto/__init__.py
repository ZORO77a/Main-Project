"""
Crypto module for GeoCrypt

Implementation:
- AES-256-GCM for symmetric file encryption
- RSA-based key wrapping (hybrid encryption)
- CRYSTALS-Kyber (ML-KEM-768) post-quantum key encapsulation
"""

from app.crypto.aes_gcm import (
    aes_encrypt,
    aes_decrypt,
)

from app.crypto.hybrid import (
    hybrid_encrypt,
    hybrid_decrypt,
)

from app.crypto.rsa_keys import (
    load_or_create_rsa_keys,
)

from app.crypto.kyber import (
    generate_keypair as kyber_keygen,
    encapsulate as kyber_encapsulate,
    decapsulate as kyber_decapsulate,
    is_available as kyber_is_available,
    ALGORITHM_NAME as KYBER_ALGORITHM,
)

__all__ = [
    # AES
    "aes_encrypt",
    "aes_decrypt",

    # Hybrid (AES + RSA)
    "hybrid_encrypt",
    "hybrid_decrypt",

    # Key management
    "load_or_create_rsa_keys",

    # Post-Quantum (CRYSTALS-Kyber / ML-KEM-768)
    "kyber_keygen",
    "kyber_encapsulate",
    "kyber_decapsulate",
    "kyber_is_available",
    "KYBER_ALGORITHM",
]
