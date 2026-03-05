import asyncio
from app.database import face_embeddings_collection

async def check_faces():
    faces = await face_embeddings_collection.find({}).to_list(None)
    print(f'Found {len(faces)} face embeddings:')
    for face in faces:
        print(f'User ID: {face["user_id"]}')

asyncio.run(check_faces())