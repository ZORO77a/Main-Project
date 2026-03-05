from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL environment variable not set")

if not DB_NAME:
    raise RuntimeError("DB_NAME environment variable not set")

client = AsyncIOMotorClient(
    MONGO_URL,
    serverSelectionTimeoutMS=5000,  # fail fast
    connectTimeoutMS=5000,
    socketTimeoutMS=5000,
)

database = client[DB_NAME]

# Collections (single source of truth)
users_collection = database["users"]
otp_collection = database["otp"]  # keep as-is, but be consistent everywhere
files_collection = database["files"]
access_logs_collection = database["access_logs"]
work_from_home_requests_collection = database["work_from_home_requests"]
face_embeddings_collection = database["face_embeddings"]
device_fingerprints_collection = database["device_fingerprints"]
sessions_collection = database["sessions"]  # Track active sessions with face verification status

# NEW: RBAC Collections
roles_collection = database["roles"]  # NEW: Store role definitions
file_sharing_collection = database["file_sharing"]  # NEW: Store file sharing records