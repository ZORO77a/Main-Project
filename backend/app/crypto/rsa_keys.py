from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from pathlib import Path

KEY_DIR = Path("keys")
PRIVATE_KEY_FILE = KEY_DIR / "rsa_private.pem"
PUBLIC_KEY_FILE = KEY_DIR / "rsa_public.pem"


def load_or_create_rsa_keys():
    KEY_DIR.mkdir(exist_ok=True)

    if PRIVATE_KEY_FILE.exists() and PUBLIC_KEY_FILE.exists():
        with open(PRIVATE_KEY_FILE, "rb") as f:
            private_key = serialization.load_pem_private_key(
                f.read(), password=None
            )

        with open(PUBLIC_KEY_FILE, "rb") as f:
            public_key = serialization.load_pem_public_key(f.read())

        return public_key, private_key

    # Create new RSA-4096 key pair
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096
    )

    public_key = private_key.public_key()

    # Save keys
    with open(PRIVATE_KEY_FILE, "wb") as f:
        f.write(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )

    with open(PUBLIC_KEY_FILE, "wb") as f:
        f.write(
            public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )
        )

    return public_key, private_key
