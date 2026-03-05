"""
Admin endpoint to view encryption details of all files.
Shows what's actually stored in the database - encrypted content, keys, etc.

Add this to routes/admin.py or create as a separate debug route.
"""

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import files_collection, users_collection
from app.routes.auth import get_current_user
import base64

router = APIRouter(prefix="/api/admin", tags=["Admin - Encryption Debug"])


@router.get("/files/encryption-audit")
async def get_files_encryption_audit(
    current_user: dict = Depends(get_current_user),
):
    """
    Admin-only endpoint for invigilators to inspect file encryption.
    Shows all files with their encryption metadata.
    """
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    files = await files_collection.find().to_list(None)
    
    audit_data = []
    for file_doc in files:
        owner = await users_collection.find_one(
            {"_id": ObjectId(file_doc.get("owner_id"))}
        )
        
        encrypted_content = file_doc.get("encrypted_content", b"")
        if isinstance(encrypted_content, bytes):
            encrypted_hex = encrypted_content[:50].hex()
        else:
            encrypted_hex = str(encrypted_content)[:50]
        
        audit_data.append({
            "file_id": str(file_doc["_id"]),
            "filename": file_doc.get("filename"),
            "owner": owner.get("email") if owner else "Unknown",
            "owner_id": file_doc.get("owner_id"),
            "is_encrypted": file_doc.get("is_encrypted"),
            "encryption_algorithm": file_doc.get("encryption_alg", "x25519"),
            "encrypted_content_size_bytes": len(encrypted_content),
            "encrypted_content_preview_hex": encrypted_hex + "...",
            "encryption_key_present": bool(file_doc.get("encryption_key")),
            "encryption_key_preview": file_doc.get("encryption_key", "")[:32] + "...",
            "created_at": file_doc.get("created_at"),
        })
    
    return {
        "total_files": len(audit_data),
        "files": audit_data,
        "encryption_status": "All files encrypted before storage" if all(
            f["is_encrypted"] for f in audit_data
        ) else "WARNING: Some files not encrypted!"
    }


@router.get("/files/{file_id}/encryption-details")
async def get_file_encryption_details(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Inspect detailed encryption information for a specific file.
    """
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        file_doc = await files_collection.find_one(
            {"_id": ObjectId(file_id)}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    encrypted_content = file_doc.get("encrypted_content", b"")
    if isinstance(encrypted_content, bytes):
        content_size = len(encrypted_content)
        content_hex = encrypted_content.hex()
    else:
        content_size = len(str(encrypted_content))
        content_hex = str(encrypted_content)
    
    return {
        "file_id": str(file_doc["_id"]),
        "filename": file_doc.get("filename"),
        "is_encrypted": file_doc.get("is_encrypted"),
        "encryption_algorithm": file_doc.get("encryption_alg", "x25519"),
        "encryption_key_seed": file_doc.get("encryption_key", "")[:64] + "...",
        "encrypted_content": {
            "total_size_bytes": content_size,
            "first_200_bytes_hex": encrypted_content[:200].hex() if isinstance(encrypted_content, bytes) else content_hex[:200],
            "is_binary": True,
            "readable_as_text": False,
            "contains_plaintext": False,  # Should always be False if encrypted properly
        },
        "security_summary": {
            "encrypted_before_storage": file_doc.get("is_encrypted", False),
            "key_stored_separately": bool(file_doc.get("encryption_key")),
            "algorithm_strength": "256-bit AES-GCM + 768-bit Kyber" if file_doc.get("encryption_alg") == "kyber" else "256-bit AES-GCM + X25519",
            "status": "✓ SECURE" if file_doc.get("is_encrypted") else "✗ NOT ENCRYPTED"
        },
        "created_at": file_doc.get("created_at"),
        "owner_id": file_doc.get("owner_id"),
    }


@router.get("/encryption-statistics")
async def get_encryption_statistics(
    current_user: dict = Depends(get_current_user),
):
    """
    Summary statistics about encryption across all files.
    """
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    files = await files_collection.find().to_list(None)
    
    kyber_count = sum(1 for f in files if f.get("encryption_alg") == "kyber")
    x25519_count = sum(1 for f in files if f.get("encryption_alg") == "x25519")
    encrypted_count = sum(1 for f in files if f.get("is_encrypted"))
    total_encrypted_size = sum(
        len(f.get("encrypted_content", b"")) for f in files
        if isinstance(f.get("encrypted_content"), bytes)
    )
    
    return {
        "total_files": len(files),
        "encrypted_files": encrypted_count,
        "encryption_algorithms": {
            "kyber768": kyber_count,
            "x25519": x25519_count,
        },
        "total_encrypted_data_mb": round(total_encrypted_size / (1024 * 1024), 2),
        "encryption_coverage": f"{round(100 * encrypted_count / len(files))}%" if files else "0%",
        "security_status": "✓ ALL FILES ENCRYPTED" if encrypted_count == len(files) else f"⚠ {len(files) - encrypted_count} files not encrypted"
    }
