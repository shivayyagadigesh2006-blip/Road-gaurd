import sqlite3
import json

DB_NAME = 'roadguard.db'

def fix_departments():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    print("Checking for reports with NULL department...")
    c.execute("SELECT COUNT(*) FROM reports WHERE department IS NULL")
    count = c.fetchone()[0]
    print(f"Found {count} reports needing update.")
    
    if count > 0:
        print("Updating reports to default department 'ROADS'...")
        c.execute("UPDATE reports SET department = 'ROADS' WHERE department IS NULL")
        conn.commit()
        print("Update complete.")
    else:
        print("No updates needed.")
        
    conn.close()

if __name__ == '__main__':
    fix_departments()
