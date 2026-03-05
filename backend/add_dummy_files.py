import asyncio
from datetime import datetime

from app.database import files_collection, users_collection
from app.utils import encrypt_file


async def add_dummy_files():
    admin = await users_collection.find_one({"role": "admin"})
    if not admin:
        print("No admin user found. Run create_admin.py first.")
        return

    admin_id = str(admin["_id"])

    dummy_files = [
        ("Q4_Financial_Report_2024.pdf", b"""CONFIDENTIAL - COMPANY EYES ONLY
Q4 Financial Report 2024
Revenue: $50M
Expenses: $35M
Net Profit: $15M
"""),
        ("Employee_Salary_Database.xlsx", b"""CONFIDENTIAL EMPLOYEE DATA
John Doe: $120,000
Jane Smith: $95,000
"""),
        ("Company_Secrets_Document.docx", b"""TOP SECRET - LEVEL 5 CLEARANCE REQUIRED
Proprietary Algorithm: [REDACTED]
"""),
        ("Legal_Contracts_Archive.zip", b"""CONFIDENTIAL LEGAL DOCUMENTS
NDA, employment, vendor contracts
"""),
        ("IT_Infrastructure_Map.vsd", b"""CRITICAL INFRASTRUCTURE MAP
Network topology and server IPs
"""),
    ]

    for filename, content in dummy_files:
        encrypted_content, key, alg = encrypt_file(content)

        doc = {
            "filename": filename,
            "encrypted_content": encrypted_content,
            "encryption_key": key,
            "encryption_alg": alg,
            "owner_id": admin_id,
            "created_at": datetime.utcnow(),
            "is_encrypted": True,
        }

        result = await files_collection.insert_one(doc)
        print(f"Added dummy file: {filename} → {result.inserted_id}")

    print("All dummy files added successfully!")


if __name__ == "__main__":
    asyncio.run(add_dummy_files())
