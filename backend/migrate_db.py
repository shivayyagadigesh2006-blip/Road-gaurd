
import sqlite3
import os

DB_NAME = 'roadguard.db'

def migrate():
    if not os.path.exists(DB_NAME):
        print(f"Database {DB_NAME} does not exist. No migration needed.")
        return

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    try:
        # Check if length of columns in users table includes phone/city
        # Pragma table_info returns: cid, name, type, notnull, dflt_value, pk
        c.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in c.fetchall()]
        
        if 'phone' not in columns:
            print("Adding 'phone' column...")
            c.execute("ALTER TABLE users ADD COLUMN phone TEXT")
            
        if 'city' not in columns:
            print("Adding 'city' column...")
            c.execute("ALTER TABLE users ADD COLUMN city TEXT")
            
        conn.commit()
        print("Migration complete.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
