import sqlite3
import json

DB_NAME = 'roadguard.db'

def fix_departments():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        # Get all reports
        rows = c.execute('SELECT id, analysis, department FROM reports').fetchall()
        print(f"Found {len(rows)} reports.")
        
        count = 0
        for row in rows:
            r_id = row['id']
            dept = row['department']
            analysis_str = row['analysis']
            
            if not dept:
                # Try to extract from analysis
                try:
                    analysis = json.loads(analysis_str)
                    new_dept = analysis.get('department', 'ROADS')
                except:
                    new_dept = 'ROADS'
                
                print(f"Updating report {r_id}: Dept {dept} -> {new_dept}")
                c.execute("UPDATE reports SET department = ? WHERE id = ?", (new_dept, r_id))
                count += 1
                
        conn.commit()
        print(f"Updated {count} reports.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    fix_departments()
