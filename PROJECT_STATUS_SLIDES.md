# GeoCrypt: Project Status & Roadmap

---

## Slide 1: Project Overview
**Title:** GeoCrypt - Enterprise Zero-Trust Security Platform
**Current Phase:** Advanced Implementation (Functional Alpha)
**Summary:**
We have successfully built a "Zero-Trust" file access system that validates **User Identity**, **Physical Location**, **Network Environment**, and **Device Integrity** before granting access to encrypted data.

---

## Slide 2: Work Done - Security Core (1/2)
**Authentication & Identity:**
*   **Multi-Factor Authentication (MFA):** Email + Password + OTP + Face Verification (DeepFace).
*   **Device Fingerprinting:** Zero-dependency browser fingerprinting to track trusted devices.
*   **AI Risk Scoring:** 30-day behavioral analysis engine (monitoring login failures, speed of movement, geo-violations).

**Zero-Trust Access Rules:**
*   **Geofencing:** Strict GPS radius enforcement (default 500m).
*   **WiFi Security:** SSID verification against allocated office networks.
*   **Time Windows:** Access restricted to specific working hours.

---

## Slide 3: Work Done - Application Features (2/2)
**File Security:**
*   **Military-Grade Encryption:** AES-256-GCM + X25519 Hybrid encryption.
*   **InMemory Processing:** Files are decrypted in-memory and streamed; never written to disk unencrypted.

**User Interfaces:**
*   **Employee Dashboard:** Upload, View, Rename, and Delete files.
*   **Admin Dashboard:** User management, Access Logs auditing, Work-From-Home (WFH) approval system.
*   **Basic Text Editor:** Functional standalone text editor and modal-based viewer implemented.

**Architecture:**
*   **Backend:** FastAPI (Python) + MongoDB.
*   **Frontend:** React 19 + Tailwind CSS.

---

## Slide 4: Current Limitations & Observations
*   **Role Management:** Currently limited to hardcoded "Admin" vs "Employee" binary checks.
*   **File Editing:**
    *   Editor exists (`FileEditor.js`) but is a separate route.
    *   Modal viewer has basic edit capability but lacks a rich integrated experience on the main dashboard.
*   **Deployment:** Currently running in Development mode with local overrides.

---

## Slide 5: Upcoming Roadmap (The "New Features")
**Objective:** Enhance usability and administrative control.

**1. Role-Based Access Control (RBAC)**
*   **Goal:** Move beyond simple "Admin/Employee" roles.
*   **Features:**
    *   Granular permissions (e.g., `can_upload`, `can_delete`, `can_approve_wfh`).
    *   Custom Role creation (e.g., "Manager", "Auditor", "Intern").
    *   Fine-grained file access policies.

**2. Integrated File Editor**
*   **Goal:** Seamless editing experience directly within the Employee Dashboard.
*   **Features:**
    *   Embed the editor into the main file view (split-screen or drawer).
    *   Add syntax highlighting for code files.
    *   Auto-save and version history support.

---

## Slide 6: Immediate Next Steps
1.  **Refactor Authorization:** Implement dependency injection for granular permission checking in FastAPI.
2.  **UI Integration:** Merge functionality from `FileEditor.js` directly into `FileAccess.js` for a smoother UX.
3.  **Testing:** Verify RBAC policies against existing users to ensure no lockouts.

---

## Slide 7: Technical Deep Dive - Encryption Architecture
**Mechanism:** Ephemeral Hybrid Encryption (X25519 + AES-GCM)
**Why it's Secure:** Every single file has its own unique cryptographic identity.

**The Encryption Flow (Upload):**
1.  **Key Generation:** System generates a unique, ephemeral **X25519 Key Pair** for the file.
2.  **Secret Derivation:** A robust **AES-256 Key** is derived from this pair using **HKDF** (HMAC-based Key Derivation Function).
3.  **Encryption:** File content is encrypted in-memory using **AES-256-GCM** (Galois Counter Mode), ensuring both confidentiality and integrity.
4.  **Storage:**
    *   **Database:** Stores the *Private Key* component securely.
    *   **File Blob:** Stores the *Public Key* + *Nonce* (IV) + *Ciphertext*.

**The Decryption Flow (Access):**
1.  **Retrieval:** System fetches the specific Private Key for the requested file and the Encrypted Blob.
2.  **Reconstruction:** The AES-256 Key is mathematically reconstructed using the stored key components.
3.  **Streaming:** The file is decrypted chunk-by-chunk in memory and streamed directly to the user's browser.
*Note: The unencrypted file never touches the server's disk.*
