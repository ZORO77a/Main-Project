# Post-Quantum Cryptography Implementation Plan

## Goal
Upgrade the file encryption system to be **Quantum-Resistant** by replacing the current X25519 Elliptic Curve Diffie-Hellman key exchange with **ML-KEM-768 (Kyber-768)** or **ML-KEM-1024**. The symmetric encryption (AES-256-GCM) will be retained as it is considered quantum-safe.

## User Review Required
> [!IMPORTANT]
> **Dependency Addition:** We will add the `mlkem` python package.
> **Breaking Change:** Files encrypted with the new system will **NOT** be decryptable by the old system code (and vice-versa) unless we implement versioning.
> **Plan:** We will implement a `version` flag in the file metadata to support both legacy (X25519) and new (ML-KEM) files for backward compatibility.

## Proposed Changes

### 1. Dependencies
#### [MODIFY] [backend/requirements.txt](file:///c:/Users/aswin/Desktop/geocrypt/backend/requirements.txt)
- Add `mlkem`

### 2. Encryption Logic Replacement
#### [MODIFY] [backend/app/utils.py](file:///c:/Users/aswin/Desktop/geocrypt/backend/app/utils.py)
- Import `mlkem`.
- **Refactor `encrypt_file`**:
    - Instead of `x25519.X25519PrivateKey.generate()`, use `mlkem.encapsulate()`.
    - `mlkem` generates a Shared Secret (SS) and a Ciphertext (CT).
    - Use the Shared Secret (SS) to derive the AES Key (via HKDF, similar to before).
    - Store the `CT` (Ciphertext from KEM) in the file blob instead of the X25519 public key.
    - Return the `mlkem` *decapsulation key* (private key) to be stored in the database.
- **Refactor `decrypt_file`**:
    - Accept the *decapsulation key* from the DB.
    - Use `mlkem.decapsulate()` with the stored CT to recover the Shared Secret.
    - Derive AES key via HKDF.
    - Decrypt using AES-GCM.

### 3. Database Schema (Implicit)
- The logic remains compatible with the `files` collection structure, as we store the "encryption_key" (now KEM private key) stringified in the DB and the "encrypted_content" blob (now containing KEM ciphertext + AES ciphertext) in the file storage.

## Verification Plan

### Automated Tests
1.  **Unit Tests (New Script)**:
    - Create `backend/tests/test_pqc.py` to test the `encrypt_file` and `decrypt_file` functions.
    - Verify that data encrypted with the new function can be decrypted.
    - Verify that invalid keys fail decryption.

### Manual Verification
1.  **Upload File**: Upload a file via the Employee Dashboard.
2.  **View File**: access the file and confirm it decrypts correctly in the browser viewer.
3.  **Logs**: Check `utils.py` logs (we will add print statements) to confirm `ML-KEM` is being used.
