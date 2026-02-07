from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import sys

uri = "mongodb+srv://yogihiremath018_db_user:DRtMcwrP7apXds6u@cluster0.6nwbtcr.mongodb.net/?appName=Cluster0"

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
