<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally with integrated PyTorch model for road damage detection.

View your app in AI Studio: https://ai.studio/apps/drive/1PrRH_M0yblBruPS__1CBDEJDzSjIA04Q

## Run Locally

**Prerequisites:**  
- Node.js (for frontend)
- Python 3.8+ (for backend model)
- PyTorch model file: `best (1).pt` (place in root directory)

### Step 1: Setup Backend (Python)

1. Navigate to backend folder:
   ```bash
   cd backend
   ```

2. Create a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the backend server:
   ```bash
   python app.py
   ```
   The server will start on `http://localhost:5000`

### Step 2: Setup Frontend (Node.js)

In a new terminal window:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `VITE_BACKEND_URL` in [.env.local](.env.local) (default is `http://localhost:5000`)

3. Run the app:
   ```bash
   npm run dev
   ```
   The app will start on `http://localhost:3000`

## Model Integration

The app uses a local PyTorch model (`best (1).pt`) for detecting:
- **Cracks**: Linear fissures and structural damage
- **Potholes**: Depressions and missing pavement sections

The backend processes images/videos and returns:
- Detection status
- Severity level (0-4)
- Bounding boxes for detected damages
- Detailed damage descriptions

## Features

✅ Real-time road damage detection  
✅ Severity classification (Low → Critical)  
✅ GPS location tagging  
✅ Before/after repair tracking  
✅ Corporation dashboard for infrastructure management  
✅ IndexedDB storage for large media files  

## Architecture

```
Frontend (React + TypeScript + Vite)
    ↓ (HTTP requests with base64 images)
Python Backend (Flask)
    ↓ (loads model)
PyTorch Model (best.pt)
    ↓ (returns detections)
Backend (JSON responses with bounding boxes)
    ↓ (visualized in UI)
```

## Troubleshooting

**Backend Connection Error:**
- Ensure `python app.py` is running on port 5000
- Check that `best (1).pt` is in the root directory
- Verify `VITE_BACKEND_URL` in `.env.local` matches backend address

**Model Not Loading:**
- Install PyTorch: `pip install torch torchvision`
- Check model file exists and is not corrupted
- Verify CUDA compatibility if using GPU

**Out of Memory Error:**
- Reduce image/video size before uploading
- Consider running on a machine with more RAM
- Use CPU mode (automatic fallback in app.py)
# Road_Guard
# Road_Guard
