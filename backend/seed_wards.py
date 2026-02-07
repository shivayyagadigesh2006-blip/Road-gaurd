import database
import sys

print("Seeding Ward Users...")

wards = [
    {'id': 'w1', 'username': 'Ward_1_Roads', 'email': 'ward_roads@gov.in', 'dept': 'ROADS'},
    {'id': 'w2', 'username': 'Ward_1_Drainage', 'email': 'ward_drainage@gov.in', 'dept': 'DRAINAGE'},
]

for w in wards:
    if not database.get_user_by_email(w['email']):
        try:
            database.add_user({
                'id': w['id'],
                'username': w['username'],
                'email': w['email'],
                'password': 'password123',
                'role': 'CORPORATION',
                'department': w['dept']
            })
            print(f"Created {w['dept']} ward user: {w['username']}")
        except Exception as e:
            print(f"Failed to create {w['username']}: {e}")
    else:
        print(f"User {w['username']} already exists.")

print("Verification:")
print(database.get_wards())
