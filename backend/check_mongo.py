from database import get_db, init_db
import sys
from datetime import datetime

try:
    print("Checking Mongo Connection...")
    db = get_db()
    # Ping the database
    db.command("ping")
    print("Connection successful!")
    
    print("Checking initialization...")
    init_db()
    
    print("Checking Write Operation...")
    result = db.migration_test.insert_one({"test": True, "timestamp": datetime.now()})
    print(f"Inserted test doc with ID: {result.inserted_id}")
    
    print("Checking Read Operation...")
    doc = db.migration_test.find_one({"_id": result.inserted_id})
    if doc:
        print(f"Read back successfully: {doc}")
    else:
        print("Failed to read back document.")
        sys.exit(1)
        
    print("MONGODB VERIFICATION SUCCESS")
except Exception as e:
    print(f"MONGODB VERIFICATION FAILED: {e}")
    sys.exit(1)
