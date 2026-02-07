import sqlite3
import csv
import os

def export_table(cursor, table_name, filename):
    try:
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        if not rows:
            print(f"No data found in table: {table_name}")
            return

        # Get column names
        headers = [description[0] for description in cursor.description]

        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
        print(f"Successfully exported '{table_name}' to '{filename}' ({len(rows)} rows)")
    except Exception as e:
        print(f"Error exporting table {table_name}: {e}")

def main():
    db_path = 'roadguard.db'
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return

    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Export Users
    export_table(c, 'users', 'roadguard_users.csv')
    
    # Export Reports
    export_table(c, 'reports', 'roadguard_reports.csv')

    conn.close()
    print("Export complete.")

if __name__ == "__main__":
    main()
