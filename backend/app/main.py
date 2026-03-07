from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.employee import router as employee_router
from app.routes.ai_monitoring import router as ai_router
# face_verification route removed - no longer used
from app.routes.device_fingerprint import router as device_router
from app.routes.debug import router as debug_router
from app.routes.files import router as files_router
from app.routes.rbac import router as rbac_router
from app.routes.crypto_status import router as crypto_router  # NEW: Kyber/PQC status
from app.routes.encryption_audit import router as encryption_audit_router  # NEW: Encryption audit for invigilators
from app.crypto.rsa_keys import load_or_create_rsa_keys


app = FastAPI(title="GeoCrypt Backend")

# 🔐 RSA keys are loaded ONCE at startup
RSA_PUBLIC_KEY, RSA_PRIVATE_KEY = load_or_create_rsa_keys()

# 🌐 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🚦 ROUTES
app.include_router(auth_router)                 # /auth/*
# face router removed (face recognition disabled)
app.include_router(device_router)               # /auth/device/*
app.include_router(debug_router)                # /debug/* (dev-only)
app.include_router(admin_router)                # /admin/*
app.include_router(employee_router)             # /employee/*
app.include_router(ai_router)                   # /ai/*
app.include_router(files_router)                # /api/files/*
app.include_router(rbac_router)                 # /rbac/* (Role-Based Access Control)
app.include_router(crypto_router)               # /crypto/* (Kyber PQC status)
app.include_router(encryption_audit_router)     # /api/admin/* (Encryption audit)
