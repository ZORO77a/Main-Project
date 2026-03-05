"""
Migration: Clear stale face embeddings.
Run this when face verification shows similarity 0.00 due to model mismatch.

Usage:
    venv\Scripts\python.exe migrate_clear_faces.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "geocrypt_db")


async def main():
    from motor.motor_asyncio import AsyncIOMotorClient
    import base64
    import json
    import numpy as np

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    total = await db.face_embeddings.count_documents({})
    print(f"Found {total} stored face embedding(s)")

    stale = 0
    ok = 0
    async for doc in db.face_embeddings.find({}):
        user_id = doc.get("user_id", "unknown")
        emb_str = doc.get("embedding", "")
        if not emb_str:
            stale += 1
            continue
        try:
            raw = base64.b64decode(emb_str)
            try:
                payload = json.loads(raw.decode("utf-8"))
                model = payload.get("model", "?")
                dims = payload.get("dims", "?")
                print(f"  user={user_id}: JSON v{payload.get('v')} model={model} dims={dims} → CURRENT FORMAT ✓")
                ok += 1
            except Exception:
                arr = np.frombuffer(raw, dtype=np.float32)
                print(f"  user={user_id}: LEGACY raw bytes dims={len(arr)} → STALE (needs re-registration)")
                stale += 1
        except Exception as e:
            print(f"  user={user_id}: ERROR reading embedding: {e}")
            stale += 1

    if stale > 0:
        print(f"\nDeleting {stale} stale embedding(s)…")
        # Delete only legacy-format embeddings
        deleted = 0
        async for doc in db.face_embeddings.find({}):
            emb_str = doc.get("embedding", "")
            is_stale = False
            if not emb_str:
                is_stale = True
            else:
                try:
                    raw = base64.b64decode(emb_str)
                    try:
                        json.loads(raw.decode("utf-8"))
                        is_stale = False  # New format — keep it
                    except Exception:
                        is_stale = True   # Legacy raw bytes — delete
                except Exception:
                    is_stale = True

            if is_stale:
                await db.face_embeddings.delete_one({"_id": doc["_id"]})
                deleted += 1
                print(f"  Deleted embedding for user_id={doc.get('user_id')}")

        print(f"Deleted {deleted} stale embedding(s).")
        print("Users will need to re-register their face via the Admin panel.")
    else:
        print("All embeddings are in the current format — no migration needed.")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
