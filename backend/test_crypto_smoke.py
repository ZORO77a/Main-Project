"""
Smoke test for GeoCrypt crypto (Kyber + X25519 backward compat).
Run from the backend/ directory with the venv:
    venv\Scripts\python.exe test_crypto_smoke.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("USE_KYBER", "true")
os.environ.setdefault("JWT_SECRET", "test")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

# ─── Test 1: Kyber KEM round-trip ────────────────────────────────────────────
from app.crypto.kyber import generate_keypair, encapsulate, decapsulate, is_available
assert is_available(), "FAIL: kyber library not available"

pub, sec = generate_keypair()
ct, shared1 = encapsulate(pub)
shared2 = decapsulate(ct, sec)
assert shared1 == shared2, f"FAIL: shared secrets differ\n  got {shared1.hex()}\n  exp {shared2.hex()}"
print(f"[1] Kyber768 KEM round-trip : PASS  (pub={len(pub)}B, ct={len(ct)}B, k={shared1.hex()[:16]}…)")

# ─── Test 2: encrypt_file / decrypt_file (Kyber path) ────────────────────────
os.environ["USE_KYBER"] = "true"
from app.utils import encrypt_file, decrypt_file

plaintext = b"Hello, Quantum-Safe World! \xf0\x9f\x94\x90"
blob, key, alg = encrypt_file(plaintext)
assert alg == "kyber", f"FAIL: expected alg='kyber', got '{alg}'"
recovered = decrypt_file(blob, key, alg)
assert recovered == plaintext, "FAIL: Kyber file decrypt mismatch"
print(f"[2] Kyber file encrypt/decrypt : PASS  (alg={alg}, blob={len(blob)}B)")

# ─── Test 3: X25519 backward compatibility ───────────────────────────────────
from app.utils import _encrypt_file_x25519, _decrypt_file_x25519
blob2, key2, alg2 = _encrypt_file_x25519(plaintext)
assert alg2 == "x25519"
rec2 = _decrypt_file_x25519(blob2, key2)
assert rec2 == plaintext, "FAIL: X25519 compat broken"
print(f"[3] X25519 backward compat   : PASS  (alg={alg2})")

# ─── Test 4: decrypt old x25519 file using new dispatch ─────────────────────
rec3 = decrypt_file(blob2, key2, "x25519")
assert rec3 == plaintext, "FAIL: cross-dispatch decrypt broken"
print("[4] Cross-dispatch decrypt   : PASS")

print("\n✅  ALL CRYPTO TESTS PASSED")
