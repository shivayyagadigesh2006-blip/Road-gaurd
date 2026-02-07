
import requests
import json

try:
    response = requests.get('http://localhost:5000/reports')
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        reports = response.json()
        print(f"Reports count: {len(reports)}")
        if len(reports) > 0:
            print("First report sample:")
            print(json.dumps(reports[0], indent=2))
    else:
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
