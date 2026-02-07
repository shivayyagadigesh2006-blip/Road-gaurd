import sys
import os
import logging
import traceback
import numpy as np
from PIL import Image

# Setup logging
logging.basicConfig(filename='debug_inference.log', level=logging.DEBUG, 
                    format='%(asctime)s %(levelname)s: %(message)s')
console = logging.StreamHandler()
console.setLevel(logging.DEBUG)
logging.getLogger('').addHandler(console)

print("Starting debug script...")
logging.info("Starting debug script")

try:
    print("Importing torch...")
    import torch
    print(f"Torch version: {torch.__version__}")
    logging.info(f"Torch version: {torch.__version__}")
    
    print("Importing cv2...")
    import cv2
    print(f"OpenCV version: {cv2.__version__}")
    
    print("Importing ultralytics...")
    from ultralytics import YOLO
    print("Ultralytics imported.")

except Exception as e:
    print(f"Import Error: {e}")
    logging.error(f"Import Error: {e}")
    logging.error(traceback.format_exc())
    sys.exit(1)

# Paths
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'backend', 'best.pt')
if not os.path.exists(MODEL_PATH):
    # Try current dir
    MODEL_PATH = 'best.pt'

print(f"Model path: {MODEL_PATH}")
logging.info(f"Model path: {MODEL_PATH}")

if not os.path.exists(MODEL_PATH):
    print("Model file not found!")
    logging.error("Model file not found")
    sys.exit(1)

try:
    print("Loading model...")
    model = YOLO(MODEL_PATH)
    print("Model loaded.")
    logging.info("Model loaded")
    
    # Create dummy image
    print("Creating dummy image...")
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    
    print("Running prediction...")
    results = model.predict(img, conf=0.10)
    print(f"Prediction complete. Results: {len(results)}")
    logging.info("Prediction success")

except Exception as e:
    print(f"Runtime Error: {e}")
    logging.error(f"Runtime Error: {e}")
    logging.error(traceback.format_exc())
    sys.exit(1)
