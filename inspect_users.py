import sqlite3

DB_NAME = 'roadguard.db'

def inspect_users():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        rows = c.execute('SELECT username, role, department FROM users').fetchall()
        print(f"Found {len(rows)} users.")
        for row in rows:
            print(f"User: {row['username']}, Role: {row['role']}, Department: {row['department']}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    inspect_users()
