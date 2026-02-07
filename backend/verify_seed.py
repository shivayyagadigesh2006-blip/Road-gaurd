from database import get_db, seed_users
import sys

try:
    print("Connecting to DB...")
    db = get_db()
    users_col = db.users
    
    print("Testing Seed Function...")
    # Run the seed function which we fixed
    seed_users(users_col)
    
    print("Checking if users exist...")
    admin = users_col.find_one({"email": "admin@gmail.com"})
    if admin:
        print(f"SUCCESS: Found admin user: {admin.get('username')}")
    else:
        print("FAILURE: Admin user not found.")
        sys.exit(1)
        
    citizen = users_col.find_one({"email": "user@gmail.com"})
    if citizen:
        print(f"SUCCESS: Found citizen user: {citizen.get('username')}")
        
except Exception as e:
    print(f"TEST FAILED with error: {e}")
    sys.exit(1)
