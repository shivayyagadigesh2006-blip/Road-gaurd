
import sqlite3
import os

DB_NAME = 'roadguard.db'

def ensure_user():
    if not os.path.exists(DB_NAME):
        print("Database not found. Please run the app first to initialize it.")
        return

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    email = "yogihiremath019@gmail.com"
    password = "000000"
    username = "Department_Official"
    role = "CORPORATION"
    department = "ROADS" # Defaulting to Roads, but as Corp they might see more depending on logic
    
    try:
        # Check if user exists
        c.execute("SELECT * FROM users WHERE email = ?", (email,))
        user_exists = c.fetchone()
        
        if user_exists:
            print(f"User {email} already exists. Updating password...")
            c.execute("UPDATE users SET password = ?, role = ?, department = ? WHERE email = ?", 
                     (password, role, department, email))
        else:
            print(f"Creating user {email}...")
            user_id = "dept_restrict_1"
            c.execute("INSERT INTO users (id, username, email, password, role, department) VALUES (?, ?, ?, ?, ?, ?)",
                     (user_id, username, email, password, role, department))
            
        conn.commit()
        print("Credential setup complete.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    ensure_user()
