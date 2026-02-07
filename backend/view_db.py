import sqlite3
import json

def view_data():
    conn = sqlite3.connect('roadguard.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    print("="*60)
    print("USERS TABLE")
    print("="*60)
    users = c.execute('SELECT * FROM users').fetchall()
    if not users:
        print("No users found.")
    for u in users:
        print(dict(u))

    print("\n" + "="*60)
    print("REPORTS TABLE")
    print("="*60)
    reports = c.execute('SELECT id, user_name, status, timestamp, resolved_timestamp FROM reports').fetchall()
    if not reports:
        print("No reports found.")
    for r in reports:
        print(dict(r))
        
    conn.close()

if __name__ == "__main__":
    view_data()
