from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes

from app.crypto.aes_gcm import aes_encrypt, aes_decrypt


def hybrid_encrypt(data: bytes, rsa_public_key):
    ciphertext, aes_key, nonce = aes_encrypt(data)

    encrypted_key = rsa_public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    return {
        "ciphertext": ciphertext,
        "encrypted_key": encrypted_key,
        "nonce": nonce,
    }


def hybrid_decrypt(payload: dict, rsa_private_key):
    aes_key = rsa_private_key.decrypt(
        payload["encrypted_key"],
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    return aes_decrypt(
        payload["ciphertext"],
        aes_key,
        payload["nonce"],
    )
