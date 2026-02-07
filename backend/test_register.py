import requests
import json
import random

random_id = random.randint(1000, 9999)
email = f'newuser{random_id}@gmail.com'

url = 'http://localhost:5000/auth/register'
headers = {'Content-Type': 'application/json'}
data = {
    'id': f'u{random_id}',
    'username': f'TestUser{random_id}',
    'email': email,
    'password': 'password123',
    'role': 'USER'
}

try:
    print(f"Registering {email}...")
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
