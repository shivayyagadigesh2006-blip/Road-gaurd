import requests
import json

BASE_URL = 'http://localhost:5000'

def test_login():
    url = f"{BASE_URL}/auth/login"
    payload = {
        "email": "roads@gov.in",
        "password": "password123"
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            user = response.json()
            print("Login Successful")
            print(json.dumps(user, indent=2))
            
            # Check variable types
            print(f"Role type: {type(user.get('role'))}")
            print(f"Department type: {type(user.get('department'))}")
            
        else:
            print("Login Failed")
            print(response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_login()
