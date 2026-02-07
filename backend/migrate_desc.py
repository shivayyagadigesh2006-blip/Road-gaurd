
import sqlite3
import os

DB_NAME = 'roadguard.db'

def migrate_desc():
    if not os.path.exists(DB_NAME):
        print(f"Database {DB_NAME} does not exist. No migration needed.")
        return

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    try:
        # Check columns in reports table
        c.execute("PRAGMA table_info(reports)")
        columns = [info[1] for info in c.fetchall()]
        
        if 'user_description' not in columns:
            print("Adding 'user_description' column...")
            c.execute("ALTER TABLE reports ADD COLUMN user_description TEXT")
            conn.commit()
            print("Migration complete: user_description added.")
        else:
            print("Column 'user_description' already exists.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_desc()
