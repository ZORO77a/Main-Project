"""
Face Verification Service using DeepFace

Robust implementation that handles:
- Embedding dimension mismatches across model versions
- Webcam images that may be blurry / partially visible
- Backward compatibility with old stored embeddings
- Proper error logging

Storage format (JSON): {"embedding": [float, ...], "model": "ArcFace", "dims": 512}
Legacy format (base64 bytes): detected and handled gracefully
"""
import base64
import io
import json
import numpy as np
from PIL import Image
from typing import Optional, Tuple
import os

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False
    print("[WARNING] DeepFace not available. Face verification will use fallback mode.")

# ── Config ───────────────────────────────────────────────────────────────────
# ArcFace is more robust than FaceNet for real-world webcam images
# FaceNet returns 128-dim, Facenet512 returns 512-dim, ArcFace returns 512-dim
FACE_MODEL = os.getenv("FACE_MODEL", "ArcFace")
FACE_DETECTOR = os.getenv("FACE_DETECTOR", "opencv")
FACE_THRESHOLD = float(os.getenv("FACE_THRESHOLD", "0.68"))  # cosine similarity threshold


def _image_bytes_to_array(image_data: bytes) -> np.ndarray:
    """Convert raw image bytes to a numpy RGB array."""
    image = Image.open(io.BytesIO(image_data))
    # Ensure RGB (handles RGBA, grayscale, etc.)
    image_rgb = image.convert("RGB")
    return np.array(image_rgb)


def extract_face_embedding(image_data: bytes) -> Optional[np.ndarray]:
    """
    Extract a face embedding vector from raw image bytes.

    Tries with enforce_detection=True first (more accurate), falls back to
    enforce_detection=False (tolerates crop/blur) so webcam captures still work.

    Returns:
        numpy array of floats (dims depends on FACE_MODEL), or None on failure.
    """
    if not DEEPFACE_AVAILABLE:
        print("[DEV MODE] DeepFace not available — returning deterministic dummy embedding")
        # Use a hash of the image bytes for repeatability across calls
        seed = int.from_bytes(image_data[:4], "big") % (2**31)
        rng = np.random.default_rng(seed)
        return rng.random(512).astype(np.float32)

    try:
        img_array = _image_bytes_to_array(image_data)

        # --- Attempt 1: strict detection (best quality) -----------------------
        try:
            result = DeepFace.represent(
                img_path=img_array,
                model_name=FACE_MODEL,
                enforce_detection=True,
                detector_backend=FACE_DETECTOR,
            )
            if result and len(result) > 0:
                emb = np.array(result[0]["embedding"], dtype=np.float64)
                print(f"[FACE] Extracted embedding (strict): dims={len(emb)}, model={FACE_MODEL}")
                return emb
        except Exception as e1:
            print(f"[FACE] Strict detection failed ({e1}), trying relaxed…")

        # --- Attempt 2: relaxed detection (handles partial/blurry faces) ------
        try:
            result = DeepFace.represent(
                img_path=img_array,
                model_name=FACE_MODEL,
                enforce_detection=False,
                detector_backend=FACE_DETECTOR,
            )
            if result and len(result) > 0:
                emb = np.array(result[0]["embedding"], dtype=np.float64)
                print(f"[FACE] Extracted embedding (relaxed): dims={len(emb)}, model={FACE_MODEL}")
                return emb
        except Exception as e2:
            print(f"[FACE] Relaxed detection also failed: {e2}")

        print("[FACE] Could not extract any embedding from image")
        return None

    except Exception as e:
        print(f"[FACE] Unexpected error in extract_face_embedding: {e}")
        return None


def compare_faces(
    embedding1: np.ndarray,
    embedding2: np.ndarray,
    threshold: float = None,
) -> Tuple[bool, float]:
    """
    Compare two face embeddings with cosine similarity.

    Returns:
        (match: bool, similarity_score: float in [0, 1])
    """
    if threshold is None:
        threshold = FACE_THRESHOLD

    try:
        if embedding1 is None or embedding2 is None:
            return False, 0.0

        # ── Dimension guard ───────────────────────────────────────────────────
        # If embeddings have different shapes the stored one is stale (old model).
        # We return 0 similarity so a clear error can be raised by the caller.
        if embedding1.shape != embedding2.shape:
            print(
                f"[FACE] Shape mismatch: stored={embedding1.shape}, current={embedding2.shape}. "
                "Re-registration required."
            )
            return False, 0.0

        e1 = embedding1.astype(np.float64)
        e2 = embedding2.astype(np.float64)

        norm1 = np.linalg.norm(e1)
        norm2 = np.linalg.norm(e2)

        if norm1 == 0 or norm2 == 0:
            return False, 0.0

        similarity = float(np.dot(e1 / norm1, e2 / norm2))
        # Clamp to [0, 1] — cosine can be negative for very different faces
        similarity = max(0.0, min(1.0, similarity))

        match = similarity >= threshold
        print(f"[FACE] Similarity={similarity:.4f} threshold={threshold:.2f} match={match}")
        return match, similarity

    except Exception as e:
        print(f"[FACE] Error comparing embeddings: {e}")
        return False, 0.0


# ── Serialisation ─────────────────────────────────────────────────────────────
# NEW format: JSON  {"v": 2, "model": "ArcFace", "dims": 512, "data": [float, ...]}
# OLD format: raw base64 bytes (np.float32) — detected by attempting JSON parse

def embedding_to_base64(embedding: np.ndarray, model: str = None) -> str:
    """
    Serialize embedding to a base64-encoded JSON string.

    Stores shape and model so mismatches are caught on load.
    """
    try:
        payload = {
            "v": 2,
            "model": model or FACE_MODEL,
            "dims": len(embedding),
            "dtype": "float64",
            "data": embedding.astype(np.float64).tolist(),
        }
        json_bytes = json.dumps(payload).encode("utf-8")
        return base64.b64encode(json_bytes).decode("utf-8")
    except Exception as e:
        print(f"[FACE] Error encoding embedding: {e}")
        return ""


def base64_to_embedding(embedding_str: str) -> Optional[np.ndarray]:
    """
    Deserialize an embedding from base64.

    Handles both the new JSON format (v2) and the old raw-bytes format (v1).
    Returns None if the stored data is corrupt.
    """
    try:
        raw = base64.b64decode(embedding_str.encode("utf-8"))

        # ── Try new JSON format first ─────────────────────────────────────────
        try:
            payload = json.loads(raw.decode("utf-8"))
            if isinstance(payload, dict) and "data" in payload:
                arr = np.array(payload["data"], dtype=np.float64)
                stored_model = payload.get("model", "unknown")
                if stored_model != FACE_MODEL:
                    print(
                        f"[FACE] Stored embedding model={stored_model} but current FACE_MODEL={FACE_MODEL}. "
                        "Re-registration strongly recommended."
                    )
                print(f"[FACE] Loaded embedding v2: dims={len(arr)}, model={stored_model}")
                return arr
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass  # Not JSON — fall through to legacy path

        # ── Legacy: raw float32 bytes ─────────────────────────────────────────
        arr = np.frombuffer(raw, dtype=np.float32).copy().astype(np.float64)
        print(
            f"[FACE] Loaded legacy embedding (v1 raw bytes): dims={len(arr)}. "
            "Re-registration required for best accuracy."
        )
        return arr

    except Exception as e:
        print(f"[FACE] Error decoding embedding: {e}")
        return None
