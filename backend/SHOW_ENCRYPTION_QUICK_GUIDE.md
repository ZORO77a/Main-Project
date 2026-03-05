# QUICK REFERENCE: Showing Encryption to Your Invigilator

## 📋 What to Show

### Option 1: Live Demo (5 minutes)
**Best for:** Technical invigilators

```bash
cd backend
python demo_encryption.py
```

**What they'll see:**
- Original file content (readable text)
- Encryption process with Kyber768 setup
- Encrypted output (binary gibberish - not readable)
- Database storage format
- Successful decryption verification

**Key talking point:**
> "The file goes in readable, gets transformed into unreadable gibberish, then stored that way in the database. Only someone with the key can read it again."

---

### Option 2: Visual Walk-Through (10 minutes)
**Best for:** Non-technical invigilators

```bash
# Open in any web browser
backend/demo_encryption.html
```

Interactive demonstration showing:
- Step 1: Original plaintext file
- Step 2: Encryption algorithm breakdown
- Step 3: Binary encrypted result
- Step 4: Database storage
- Step 5: Decryption process

**Click buttons to animate each step.**

---

### Option 3: API Audit (Technical verification)
**Best for:** Detailed technical audit

#### Check All Files are Encrypted
```bash
curl -X GET http://localhost:8000/api/admin/files/encryption-audit \
  -H "Authorization: Bearer <admin_token>"
```

**Look for in response:**
- `"encryption_status": "All files encrypted before storage"` ✓
- Every file has `"is_encrypted": true` ✓
- `"encryption_algorithm": "kyber"` (post-quantum) ✓

#### Inspect Specific File
```bash
curl -X GET http://localhost:8000/api/admin/files/<file_id>/encryption-details \
  -H "Authorization: Bearer <admin_token>"
```

**Key evidence:**
```json
{
  "encrypted_content": {
    "is_binary": true,
    "readable_as_text": false,
    "contains_plaintext": false  ← PROOF not readable
  },
  "security_summary": {
    "encrypted_before_storage": true,
    "status": "✓ SECURE"
  }
}
```

#### View Statistics
```bash
curl -X GET http://localhost:8000/api/admin/encryption-statistics \
  -H "Authorization: Bearer <admin_token>"
```

**What to highlight:**
- `"encryption_coverage": "100%"` - All files encrypted
- `"total_encrypted_data_mb": X` - Show scale
- Algorithm breakdown showing Kyber usage

---

## 🔐 Key Points to Explain

### 1. **Encryption Method**
```
CRYSTALS-Kyber768 (Post-Quantum) 
     + 
AES-256-GCM (Military-Grade Symmetric)
```
- **Why?** Kyber protects against quantum computer threats
- **Strength?** 256-bit symmetric + 768-bit asymmetric post-quantum

### 2. **Process**
```
Upload → Encrypt in Memory → Store Binary → Only Decrypt on Access
```
- Files never stored unencrypted
- Each file gets unique ephemeral keypair
- Keys stored securely separate from data

### 3. **Proof it Works**
```
Plaintext (245 bytes of readable text)
    ↓
Encryption
    ↓
2,549 bytes of random binary gibberish
    ↓
Decryption (with correct key)
    ↓
Original plaintext recovered perfectly
```

---

## 📊 Numbers to Quote

| Metric | Value |
|--------|-------|
| Key Algorithm | CRYSTALS-Kyber768 |
| Symmetric Algorithm | AES-256-GCM |
| Key Derivation | HKDF-SHA256 |
| Public Key Size | 1,184 bytes |
| Secret Key Size | 2,400 bytes |
| Kyber Ciphertext | 1,088 bytes |
| AES IV | 12 bytes |
| GCM Tag | 16 bytes |
| Encryption Coverage | 100% |
| Post-Quantum Safe | ✓ Yes |

---

## 💡 Answers to Common Questions

**Q: How do I know the file is really encrypted?**
A: Run the demo - show plaintext → binary → decrypted. Show database contains only binary gibberish.

**Q: Could someone read the file from the database?**
A: No - only binary garbage without the key. Even with database access, unencrypted file unreadable.

**Q: Is this military-grade encryption?**
A: Yes - AES-256-GCM is used by governments. Plus post-quantum Kyber768 (NIST standard).

**Q: What if someone steals the key?**
A: Still need both: encrypted file AND key. If key is compromised, we've lost security (but this is true for any encryption).

**Q: Why two algorithms (Kyber + AES)?**
A: Kyber encrypts the AES key (post-quantum safe). AES encrypts the file (fast & efficient). Best of both.

**Q: Is this approved/standard?**
A: Yes - Kyber768 is NIST ML-KEM-768 (approved July 2024). AES is FIPS standard.

---

## ⚡ Quick Demo Script (30 seconds)

```bash
# Terminal Demo
cd c:\Users\aswin\Desktop\geocrypt\backend
python demo_encryption.py
```

**What to point out:**
1. ✓ "Kyber-768 keypair generated - this is post-quantum safe"
2. ✓ "File encrypted successfully - look at the blob size"
3. ✓ "First 100 bytes: [hex gibberish] - not human readable"
4. ✓ "File decrypted successfully - content matches original"

---

## 📁 Files Created for Invigilators

All in `backend/` folder:

- **`demo_encryption.py`** - Runnable script showing encryption
- **`demo_encryption.html`** - Visual interactive walkthrough
- **`INVIGILATOR_ENCRYPTION_GUIDE.md`** - Complete technical guide
- **`app/routes/encryption_audit.py`** - REST API endpoints

---

## ✅ Checklist for Your Invigilator

Show them:
- [ ] Run demo script - shows real encryption/decryption
- [ ] Open HTML demo - step-by-step visualization
- [ ] Show API endpoints - technical verification
- [ ] Explain Kyber768 - post-quantum safety
- [ ] Confirm 100% files encrypted
- [ ] Show database has only binary (not plaintext)

---

## 🎯 Final Message

**"Every file uploaded to GeoCrypt is encrypted using CRYSTALS-Kyber768 and AES-256-GCM **before** it's stored in the database. The encryption is so strong that even someone with database access cannot read the files without both the encrypted blob AND the encryption key. This has been verified with our demo tools."**

---

## 🆘 If Something Goes Wrong

**Demo script won't run?**
```bash
pip install kyber-py --upgrade
```

**Encryption audit endpoints give 403?**
You need admin/manager role. Ask admin to test with proper credentials.

**Still stuck?**
Check `INVIGILATOR_ENCRYPTION_GUIDE.md` for detailed troubleshooting.

