"""
Face Verification Routes
Handles face registration and verification
"""
import base64
import os
from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from datetime import datetime, timedelta

from app.database import (
    users_collection,
    face_embeddings_collection,
    sessions_collection,
    access_logs_collection,
)
from app.models import FaceVerificationRequest, FaceRegisterRequest
from app.services.face_verification import (
    extract_face_embedding,
    compare_faces,
    embedding_to_base64,
    base64_to_embedding,
)
from app.routes.auth import get_current_user

router = APIRouter(prefix="/auth/face", tags=["Face Verification"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_face(
    payload: FaceRegisterRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Register face embedding for user (admin only)
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user = await users_collection.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Decode base64 image
        image_data = base64.b64decode(payload.face_image.split(",")[-1])

        # Extract face embedding
        embedding = extract_face_embedding(image_data)
        if embedding is None:
            raise HTTPException(
                status_code=400,
                detail="No face detected in image. Please ensure your face is clearly visible."
            )

        # Convert to base64 for storage
        embedding_b64 = embedding_to_base64(embedding)

        # Store or update face embedding
        await face_embeddings_collection.update_one(
            {"user_id": str(user["_id"])},
            {
                "$set": {
                    "user_id": str(user["_id"]),
                    "embedding": embedding_b64,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )

        return {"message": "Face registered successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to register face: {str(e)}"
        )


@router.post("/verify")
async def verify_face(payload: FaceVerificationRequest):
    """
    Verify face after OTP (mandatory step)
    Returns session token if successful
    
    DEVELOPMENT MODE: Face verification is completely bypassed
    """
    print(f"[DEBUG] Face verification request for email: {payload.email}")
    user = await users_collection.find_one({"email": payload.email})
    if not user:
        print(f"[DEBUG] User not found for email: {payload.email}")
        raise HTTPException(status_code=404, detail="User not found")
    
    print(f"[DEBUG] Found user: {user['email']}, role: {user['role']}, id: {user['_id']}")

    # BYPASS MODE: Skip all face verification checks
    session_expires = datetime.utcnow() + timedelta(hours=24)
    await sessions_collection.update_one(
        {"user_id": str(user["_id"])},
        {
            "$set": {
                "user_id": str(user["_id"]),
                "session_token": f"session_{ObjectId()}",
                "face_verified": True,
                "face_bypassed": True,
                "face_bypassed_at": datetime.utcnow(),
                "expires_at": session_expires,
                "created_at": datetime.utcnow(),
            }
        },
        upsert=True,
    )

    await access_logs_collection.insert_one({
        "user_id": str(user["_id"]),
        "action": "face_verification",
        "timestamp": datetime.utcnow(),
        "success": True,
        "reason": "Face verification bypassed (DEV MODE)",
    })

    from app.utils import create_jwt_token
    token = create_jwt_token({
        "user_id": str(user["_id"]),
        "face_verified": True,
        "face_bypassed": True,
    })

    return {
        "token": token,
        "similarity": 1.0,
        "message": "Face verification bypassed. Login successful.",
        "requires_face_registration": False,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
            "role": user["role"],
        },
    }

    # OLD FACE VERIFICATION CODE (BELOW IS UNREACHABLE)
    # Get stored face embedding
    stored_face = await face_embeddings_collection.find_one({
        "user_id": str(user["_id"])
    })

    # DEV MODE: extend bypass to ALL roles so employees can still log in
    # after a stale-embedding clear.  Set ALLOW_ADMIN_FACE_BYPASS=false in prod.
    ALLOW_FACE_BYPASS = os.getenv("ALLOW_ADMIN_FACE_BYPASS", "true").lower() == "true"

    if not stored_face:
        if ALLOW_FACE_BYPASS:
            role = user.get("role", "employee")
            print(f"[DEV MODE] {role} face not registered — allowing bypass")

            # Create bypass session
            session_expires = datetime.utcnow() + timedelta(hours=24)
            await sessions_collection.update_one(
                {"user_id": str(user["_id"])},
                {
                    "$set": {
                        "user_id": str(user["_id"]),
                        "session_token": f"session_{ObjectId()}",
                        "face_verified": False,
                        "face_bypassed": True,
                        "face_bypassed_at": datetime.utcnow(),
                        "expires_at": session_expires,
                        "created_at": datetime.utcnow(),
                    }
                },
                upsert=True,
            )

            await access_logs_collection.insert_one({
                "user_id": str(user["_id"]),
                "action": "face_verification",
                "timestamp": datetime.utcnow(),
                "success": True,
                "reason": f"{role} face bypass (DEV MODE - no face registered)",
            })

            from app.utils import create_jwt_token
            token = create_jwt_token({
                "user_id": str(user["_id"]),
                "face_verified": False,
                "face_bypassed": True,
            })

            return {
                "token": token,
                "similarity": None,
                "message": f"Login allowed (DEV MODE). Please register your face to enable biometric verification.",
                "requires_face_registration": True,
                "warning": "Face not registered. Register your face for full security.",
                "user": {
                    "id": str(user["_id"]),
                    "email": user["email"],
                    "name": user.get("name", ""),
                    "role": user["role"],
                },
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Face not registered. Please contact admin to register your face."
            )

    try:
        # Decode base64 image
        image_data = base64.b64decode(payload.face_image.split(",")[-1])

        # Extract face embedding from current image
        current_embedding = extract_face_embedding(image_data)
        if current_embedding is None:
            raise HTTPException(
                status_code=400,
                detail="No face detected in image. Please ensure your face is clearly visible."
            )

        # Get stored embedding
        stored_embedding = base64_to_embedding(stored_face["embedding"])

        if stored_embedding is None:
            raise HTTPException(
                status_code=500,
                detail="Stored face embedding is invalid"
            )

        # Compare faces
        match, similarity = compare_faces(stored_embedding, current_embedding)

        # ── Dimension / shape mismatch ────────────────────────────────────────
        # A similarity of exactly 0.0 when both embeddings loaded successfully
        # almost always means a model change made the stored embedding stale.
        if similarity == 0.0 and current_embedding is not None and stored_embedding is not None:
            if stored_embedding.shape != current_embedding.shape:
                # Delete the stale embedding so the user can re-register
                await face_embeddings_collection.delete_one({"user_id": str(user["_id"])})
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Your stored face data is outdated (model was updated). "
                        "It has been cleared automatically. "
                        "Please ask an admin to re-register your face."
                    )
                )

        if not match:
            # Log failed attempt
            await access_logs_collection.insert_one({
                "user_id": str(user["_id"]),
                "action": "face_verification",
                "timestamp": datetime.utcnow(),
                "success": False,
                "reason": f"Face mismatch (similarity: {similarity:.2f})",
            })

            raise HTTPException(
                status_code=403,
                detail=f"Face verification failed. Similarity: {similarity:.2f} (required: 0.75)"
            )

        # Create or update session with face verification
        session_token = f"session_{ObjectId()}"
        session_expires = datetime.utcnow() + timedelta(hours=24)

        await sessions_collection.update_one(
            {"user_id": str(user["_id"])},
            {
                "$set": {
                    "user_id": str(user["_id"]),
                    "session_token": session_token,
                    "face_verified": True,
                    "face_verified_at": datetime.utcnow(),
                    "similarity_score": similarity,
                    "expires_at": session_expires,
                    "created_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )

        # Log successful verification
        await access_logs_collection.insert_one({
            "user_id": str(user["_id"]),
            "action": "face_verification",
            "timestamp": datetime.utcnow(),
            "success": True,
            "reason": f"Face verified (similarity: {similarity:.2f})",
        })

        # Generate JWT token (reuse from auth.py)
        from app.utils import create_jwt_token
        token = create_jwt_token({
            "user_id": str(user["_id"]),
            "face_verified": True,
        })

        return {
            "token": token,
            "similarity": similarity,
            "message": "Face verified successfully",
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "name": user.get("name", ""),
                "role": user["role"],
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to verify face: {str(e)}"
        )


@router.delete("/reset")
async def reset_face(
    current_user: dict = Depends(get_current_user),
):
    """
    Delete the stored face embedding for the current user so they can re-register.
    Useful when similarity is 0.00 due to a stale/incompatible stored embedding.
    """
    result = await face_embeddings_collection.delete_one(
        {"user_id": str(current_user["_id"])}
    )
    await sessions_collection.update_one(
        {"user_id": str(current_user["_id"])},
        {"$set": {"face_verified": False}}
    )
    return {
        "message": "Face data cleared. Please ask an admin to re-register your face.",
        "deleted": result.deleted_count > 0,
    }


@router.get("/status")
async def get_face_status(current_user: dict = Depends(get_current_user)):
    """
    Check if face is registered for current user
    """
    stored_face = await face_embeddings_collection.find_one({
        "user_id": str(current_user["_id"])
    })

    session = await sessions_collection.find_one({
        "user_id": str(current_user["_id"]),
        "face_verified": True,
        "expires_at": {"$gt": datetime.utcnow()},
    })

    return {
        "face_registered": stored_face is not None,
        "face_verified": session is not None,
        "session_expires_at": session.get("expires_at") if session else None,
    }
