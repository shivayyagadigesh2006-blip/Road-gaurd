
import sys
import os
import numpy as np
from PIL import Image

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import analyze_image, model

print(f"Model loaded: {model is not None}")
if model:
    print(f"Model classes: {model.names}")

# Create a blank image
img = np.zeros((640, 640, 3), dtype=np.uint8)
# Add some fake "features" (random noise) to see if it triggers anything or just runs
# img = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)

print("Running inference on blank image...")
result = analyze_image(img)
print("Result:", result)
