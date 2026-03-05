import asyncio
from app.database import users_collection, face_embeddings_collection

async def check_user_face():
    user = await users_collection.find_one({'email': 'aswinanaik2103@gmail.com'})
    if user:
        print(f'User ID: {user["_id"]}')
        face = await face_embeddings_collection.find_one({'user_id': str(user['_id'])})
        print(f'Face registered: {face is not None}')
    else:
        print('User not found')

asyncio.run(check_user_face())