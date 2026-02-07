
import sqlite3
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    conn = sqlite3.connect('backend/roadguard.db')
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables: {tables}")
    
    # Check reports
    try:
        cursor.execute("SELECT id, location FROM reports")
        reports = cursor.fetchall()
        print(f"Reports count: {len(reports)}")
        for r in reports:
            print(f"ID: {r[0]}, Location: {r[1]}")
    except sqlite3.OperationalError as e:

        print(f"Error accessing reports table: {e}")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
