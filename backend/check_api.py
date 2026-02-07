import requests
import json

try:
    response = requests.get('http://localhost:5000/reports')
    if response.status_code == 200:
        reports = response.json()
        print(f"Fetched {len(reports)} reports.")
        if len(reports) > 0:
            print("Sample Report Keys:")
            print(reports[0].keys())
            
            # Check for assignedWardId
            found = False
            for r in reports:
                if 'assignedWardId' in r and r['assignedWardId']:
                    print(f"Found report with assignedWardId: {r['assignedWardId']}")
                    found = True
                    break
            if not found:
                print("No reports found with assignedWardId value set (might be null).")
                
            # Check strict key existence
            if 'assignedWardId' in reports[0]:
                print("PASS: 'assignedWardId' key exists in JSON.")
            else:
                print("FAIL: 'assignedWardId' key MISSING in JSON.")
    else:
        print(f"Error: {response.status_code}")
except Exception as e:
    print(f"Connection failed: {e}")
