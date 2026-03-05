"""
Diagnose why Kyber encrypt_file() falls back to X25519.
Run: venv\Scripts\python.exe test_kyber_debug.py
"""
import os, sys, traceback
sys.path.insert(0, os.path.dirname(__file__))

# Force USE_KYBER before loading dotenv (so it takes priority)
os.environ["USE_KYBER"] = "true"
os.environ.setdefault("JWT_SECRET", "test")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "geocrypt_db")

# --- Test 1: Kyber module itself ---
print("=== Test 1: Kyber KEM ===")
from app.crypto.kyber import generate_keypair, encapsulate, decapsulate, is_available
print(f"is_available: {is_available()}")
pub, sec = generate_keypair()
ct, ss1 = encapsulate(pub)
ss2 = decapsulate(ct, sec)
assert ss1 == ss2, "FAIL: KEM mismatch"
print(f"KEM: PASS (ss={ss1.hex()[:16]}...)")

# --- Test 2: _encrypt_file_kyber directly ---
print("\n=== Test 2: _encrypt_file_kyber direct call ===")
try:
    from app.utils import _encrypt_file_kyber, _decrypt_file_kyber
    plaintext = b"Hello Kyber World!"
    blob, key, alg = _encrypt_file_kyber(plaintext)
    print(f"Encrypt OK: alg={alg}, blob={len(blob)}B")
    recovered = _decrypt_file_kyber(blob, key)
    assert recovered == plaintext, "FAIL: decrypt mismatch"
    print(f"Decrypt OK: '{recovered.decode()}'")
except Exception:
    traceback.print_exc()

# --- Test 3: encrypt_file dispatch (should use Kyber) ---
print("\n=== Test 3: encrypt_file() dispatch ===")
try:
    from app.utils import encrypt_file, decrypt_file
    print(f"USE_KYBER env: {os.getenv('USE_KYBER')}")
    blob2, key2, alg2 = encrypt_file(b"Dispatch test")
    print(f"Result: alg={alg2}, blob={len(blob2)}B")
    if alg2 != "kyber":
        print("WARNING: Fell back to non-Kyber algorithm!")
    rec2 = decrypt_file(blob2, key2, alg2)
    print(f"Decrypt OK: '{rec2.decode()}'")
except Exception:
    traceback.print_exc()

print("\n=== Done ===")
