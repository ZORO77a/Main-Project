import asyncio
import aiohttp
import json

async def test_auth():
    async with aiohttp.ClientSession() as session:
        # Test login
        login_data = {'email': 'test@example.com', 'password': 'test123'}
        print('=== Testing Login ===')
        async with session.post('http://localhost:8000/auth/login', json=login_data) as resp:
            print(f'Login status: {resp.status}')
            result = await resp.json()
            print(f'Login response:')
            print(f'  Message: {result.get("message")}')
            token = result.get('token')
            print(f'  Token: {token[:100] if token else None}...')
            user = result.get('user')
            print(f'  User: {user}')
        
        # Test OTP verify
        print('\n=== Testing OTP Verify ===')
        otp_data = {'email': 'test@example.com', 'otp': '000000'}
        async with session.post('http://localhost:8000/auth/verify-otp', json=otp_data) as resp:
            print(f'OTP verify status: {resp.status}')
            result = await resp.json()
            print(f'OTP response:')
            print(f'  Message: {result.get("message")}')
            token = result.get('token')
            print(f'  Token: {token[:100] if token else None}...')
            user = result.get('user')
            print(f'  User: {user}')
            
            # Test device registration with the token
            if token:
                print('\n=== Testing Device Registration ===')
                headers = {'Authorization': f'Bearer {token}'}
                device_data = {
                    'user_agent': 'Test Browser',
                    'platform': 'Windows',
                    'screen_resolution': '1920x1080',
                    'language': 'en-US'
                }
                async with session.post('http://localhost:8000/auth/device/register', json=device_data, headers=headers) as resp:
                    print(f'Device register status: {resp.status}')
                    result = await resp.json()
                    print(f'Device response: {json.dumps(result, indent=2)}')

asyncio.run(test_auth())
