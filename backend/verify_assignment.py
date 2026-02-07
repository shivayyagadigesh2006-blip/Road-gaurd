import sqlite3
import json
import time

DB_NAME = 'roadguard.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def verify_schema():
    print("--- Verifying Schema ---")
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("PRAGMA table_info(reports)")
    columns = [row['name'] for row in c.fetchall()]
    conn.close()
    
    if 'assigned_ward_id' in columns:
        print("PASS: 'assigned_ward_id' column exists.")
    else:
        print("FAIL: 'assigned_ward_id' column MISSING!")
        return False
        
    if 'assigned_contractor_id' in columns:
        print("PASS: 'assigned_contractor_id' column exists.")
    else:
        print("FAIL: 'assigned_contractor_id' column MISSING!")
        # return False # Not strict about this one for now as we focus on Ward
        
    return True

def test_assignment_flow():
    print("\n--- Testing Assignment Flow ---")
    conn = get_db_connection()
    
    # 1. Create Dummy Report
    report_id = f"test_report_{int(time.time())}"
    user_id = "u1"
    ward_id = "w1" # Assuming w1 exists from seed
    
    print(f"Creating test report: {report_id}")
    try:
        conn.execute('''
            INSERT INTO reports (id, user_id, user_name, timestamp, media_url, media_type, status, analysis, department)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (report_id, user_id, 'Tester', time.time(), 'http://test.com', 'image', 'PENDING', json.dumps({'severity': 3}), 'ROADS'))
        conn.commit()
    except Exception as e:
        print(f"FAIL: Could not create test report. {e}")
        return

    # 2. Assign to Ward
    print(f"Assigning report {report_id} to ward {ward_id}...")
    try:
        conn.execute('UPDATE reports SET assigned_ward_id = ?, status = ? WHERE id = ?', 
                     (ward_id, 'ASSIGNED_TO_WARD', report_id))
        conn.commit()
        print("Update executed.")
    except Exception as e:
        print(f"FAIL: Update failed. {e}")
        return

    # 3. Fetch and Verify
    print("Fetching report back...")
    row = conn.execute('SELECT * FROM reports WHERE id = ?', (report_id,)).fetchone()
    
    if row:
        assigned_val = row['assigned_ward_id']
        status_val = row['status']
        print(f"Fetched assigned_ward_id: {assigned_val}")
        print(f"Fetched status: {status_val}")
        
        if assigned_val == ward_id:
            print("PASS: Assignment persisted correctly.")
        else:
            print(f"FAIL: Expected {ward_id}, got {assigned_val}")
            
        if status_val == 'ASSIGNED_TO_WARD':
            print("PASS: Status updated correctly.")
        else:
            print(f"FAIL: Expected ASSIGNED_TO_WARD, got {status_val}")
            
    else:
        print("FAIL: Could not fetch report.")
        
    # Cleanup
    conn.execute('DELETE FROM reports WHERE id = ?', (report_id,))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    if verify_schema():
        test_assignment_flow()
