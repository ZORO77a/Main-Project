import asyncio

from create_admin import create_initial_admin
from create_employee import create_employee

async def bootstrap():
    """Run both helper scripts to ensure the default admin and employee exist."""
    await create_initial_admin()
    await create_employee()


if __name__ == "__main__":
    asyncio.run(bootstrap())
