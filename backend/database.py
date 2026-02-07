import os
import json
from datetime import datetime
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import time

# MongoDB Configuration
MONGO_URI = "mongodb+srv://yogihiremath018_db_user:DRtMcwrP7apXds6u@cluster0.6nwbtcr.mongodb.net/?appName=Cluster0"
DB_NAME = "roadguard"

def get_db():
    try:
        client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
        # Send a ping to confirm a successful connection
        # client.admin.command('ping') 
        # print("Pinged your deployment. You successfully connected to MongoDB!")
        return client[DB_NAME]
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        raise e

def init_db():
    """
    Initialize MongoDB collections and indexes.
    Seeding is done internally in app.py or here if needed, 
    but commonly Mongo doesn't need explicit 'init' like SQLite.
    We'll create indexes here to ensure uniqueness.
    """
    try:
        db = get_db()
        users = db.users
        reports = db.reports
        
        # Create indexes
        users.create_index("email", unique=True)
        reports.create_index("timestamp")
        
        print(f"[INFO] MongoDB {DB_NAME} initialized with indexes.")
        
        # Seed Default Users
        seed_users(users)
        
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")

def seed_users(users_collection):
    """Seed default users if they don't exist"""
    default_users = [
        # Admin & Citizen
        {'id': 'u1', 'username': 'Citizen_One', 'email': 'user@gmail.com', 'password': 'password123', 'role': 'USER'},
        {'id': 'a1', 'username': 'System_Admin', 'email': 'admin@gmail.com', 'password': 'adminpassword', 'role': 'ADMIN'},
        
        # Departments
        {'id': 'd1', 'username': 'Roads_Department', 'email': 'roads@gov.in', 'password': 'password123', 'role': 'CORPORATION', 'department': 'ROADS'},
        {'id': 'd2', 'username': 'Drainage_Department', 'email': 'water@gov.in', 'password': 'password123', 'role': 'CORPORATION', 'department': 'DRAINAGE'},
        {'id': 'd3', 'username': 'Traffic_Department', 'email': 'traffic@gov.in', 'password': 'password123', 'role': 'CORPORATION', 'department': 'TRAFFIC'},
        
        # Wards
        {'id': 'w1', 'username': 'Ward_1_Roads', 'email': 'ward_roads@gov.in', 'password': 'password123', 'role': 'CORPORATION', 'department': 'ROADS'},
        {'id': 'w2', 'username': 'Ward_1_Drainage', 'email': 'ward_drainage@gov.in', 'password': 'password123', 'role': 'CORPORATION', 'department': 'DRAINAGE'},
        
        # Contractors
        {'id': 'c1', 'username': 'Roads_Contractor_A', 'email': 'contractor_roads@gmail.com', 'password': 'password123', 'role': 'CONTRACTOR', 'department': 'ROADS'},
        {'id': 'c2', 'username': 'Drainage_Contractor_B', 'email': 'contractor_water@gmail.com', 'password': 'password123', 'role': 'CONTRACTOR', 'department': 'DRAINAGE'},
    ]
    
    for user in default_users:
        try:
            # Upsert based on email to avoid duplicates
            users_collection.update_one(
                {'email': user['email']}, 
                {'$setOnInsert': user}, 
                upsert=True
            )
        except Exception as e:
            print(f"[WARN] Failed to seed user {user['username']}: {e}")
            
    print("[INFO] Default users seeded.")

def get_contractors(department=None):
    db = get_db()
    users = db.users
    query = {"role": "CONTRACTOR"}
    if department:
        query["department"] = department
        
    contractors = list(users.find(query, {"_id": 0})) # Hide Mongo _id
    return contractors

def get_wards(department=None):
    db = get_db()
    users = db.users
    # Regex search for users starting with 'Ward' and role 'CORPORATION'
    query = {
        "role": "CORPORATION",
        "username": {"$regex": "^Ward"}
    }
    if department:
        query["department"] = department
        
    wards = list(users.find(query, {"_id": 0}))
    return wards

def assign_report_to_ward(report_id, ward_id):
    db = get_db()
    reports = db.reports
    try:
        result = reports.update_one(
            {"id": report_id},
            {"$set": {
                "assignedWardId": ward_id,
                "status": "ASSIGNED_TO_WARD"
            }}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error assigning report to ward: {e}")
        return False

def assign_report(report_id, contractor_id):
    db = get_db()
    reports = db.reports
    try:
        result = reports.update_one(
            {"id": report_id},
            {"$set": {
                "assignedContractorId": contractor_id,
                "status": "IN_PROGRESS"
            }}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error assigning report: {e}")
        return False

def add_user(user):
    db = get_db()
    users = db.users
    try:
        # Check if user exists using _id or email
        if users.find_one({"email": user["email"]}):
            return False
            
        # MongoDB uses _id, but we have our own 'id' field from frontend logic/seeds
        # We'll just store 'id' as a field. 
        users.insert_one(user)
        return True
    except Exception as e:
        print(f"Error adding user: {e}")
        return False

def get_user_by_email(email):
    db = get_db()
    users = db.users
    user = users.find_one({"email": email}, {"_id": 0})
    return user

def save_report(report):
    db = get_db()
    reports = db.reports
    try:
        # Mongo handles dicts natively, no need for JSON serialization of fields
        # Ensure we don't have None for keys we might query? No, Mongo is flexible.
        
        # We might need to ensure certain keys exist if they are optional in TS but widely used
        reports.insert_one(report)
        return True
    except Exception as e:
        print(f"Error saving report: {e}")
        return False

def get_reports():
    db = get_db()
    reports_col = db.reports
    # Convert cursor to list and strip _id
    reports = list(reports_col.find({}, {"_id": 0}).sort("timestamp", -1))
    return reports

def update_report_status(report_id, status, repair_media_url=None):
    db = get_db()
    reports = db.reports
    try:
        update_data = {"status": status}
        if repair_media_url:
            update_data["repairMediaUrl"] = repair_media_url
            update_data["resolvedTimestamp"] = datetime.now().timestamp()
            
        result = reports.update_one(
            {"id": report_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error updating report: {e}")
        return False
