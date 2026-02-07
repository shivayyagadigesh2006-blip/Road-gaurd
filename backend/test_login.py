import requests
import json

url = 'http://localhost:5000/auth/login'
headers = {'Content-Type': 'application/json'}
data = {
    'email': 'user@gmail.com',
    'password': 'password123'
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
