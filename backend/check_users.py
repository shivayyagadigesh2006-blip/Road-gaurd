import sqlite3

def check_users():
    conn = sqlite3.connect('roadguard.db')
    conn.row_factory = sqlite3.Row
    users = conn.execute("SELECT * FROM users").fetchall()
    
    print(f"Found {len(users)} users.")
    for u in users:
        print(f"ID: {u['id']}, User: {u['username']}, Role: {u['role']}, Dept: {u['department']}")
        
    conn.close()

if __name__ == "__main__":
    check_users()
