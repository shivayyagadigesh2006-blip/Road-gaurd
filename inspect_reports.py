import sqlite3
import json

DB_NAME = 'roadguard.db'

def inspect_reports():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        rows = c.execute('SELECT id, department, status FROM reports').fetchall()
        print(f"Found {len(rows)} reports.")
        for row in rows:
            print(f"Report: {row['id']}, Dept: {row['department']}, Status: {row['status']}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    inspect_reports()
