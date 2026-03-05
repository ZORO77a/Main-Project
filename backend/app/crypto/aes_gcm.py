import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def aes_encrypt(data: bytes):
    key = AESGCM.generate_key(bit_length=256)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # recommended size
    ciphertext = aesgcm.encrypt(nonce, data, None)

    return ciphertext, key, nonce


def aes_decrypt(ciphertext: bytes, key: bytes, nonce: bytes):
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)
