# RoadGuard AI - Backend Setup Complete ✓

## Status
✅ **Backend Server**: Running on `http://localhost:5000`
✅ **Frontend Server**: Running on `http://localhost:3000`
✅ **YOLOv5 Model**: Loaded successfully (`best.pt` - 6.0 MB)
✅ **Device**: CPU (GPU available if installed)

## What Was Done

### 1. **Created Python Backend** (`backend/app.py`)
- Flask REST API server
- Loads your `best.pt` YOLOv5 model using Ultralytics
- Two endpoints:
  - `GET /health` - Health check
  - `POST /analyze` - Analyze images for cracks/potholes
  - `POST /analyze/video` - Analyze video frames

### 2. **Updated Frontend Service** (`services/geminiService.ts`)
- Changed from Gemini API to local Python backend
- Communicates with backend on port 5000
- Returns results in same format

### 3. **Installed Dependencies**
All Python packages installed:
- ✓ torch (PyTorch)
- ✓ torchvision
- ✓ opencv-python
- ✓ numpy, Pillow
- ✓ Flask, Flask-CORS
- ✓ ultralytics (YOLOv5)
- ✓ seaborn, matplotlib, PyYAML
- ✓ requests, py-cpuinfo

### 4. **Created Startup Scripts**
- `start.bat` - For Windows (one-click startup)
- `start.sh` - For macOS/Linux
- `backend/test.py` - Diagnostics script

## How It Works

```
User Uploads Image/Video
          ↓
Frontend (React/TypeScript)
          ↓ (HTTP POST with base64)
Backend (Flask on port 5000)
          ↓
YOLOv5 Model (best.pt)
          ↓ (detects damage)
Returns JSON with:
  - detected: boolean
  - severity: 0-4
  - damageTypes: ['crack', 'pothole']
  - boundingBoxes: [[ymin, xmin, ymax, xmax]]
          ↓
Frontend displays results with overlays
```

## Quick Commands

**To start both servers:**
```bash
./start.bat        # Windows
bash start.sh      # macOS/Linux
```

**Or start manually:**
```bash
# Terminal 1 - Backend (already running)
cd backend
python app.py

# Terminal 2 - Frontend
npm run dev
```

## Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/health
- **API Docs**: Check Flask console logs

## Testing

To test the backend:
```bash
cd backend
python test.py
```

## Model Information
- **File**: `best.pt` (6.0 MB)
- **Location**: `backend/best.pt`
- **Type**: YOLOv5 Detection Model
- **Classes**: Crack, Pothole (based on training)
- **Output**: Bounding boxes with confidence scores

## Troubleshooting

**Backend won't start:**
- Verify `best.pt` exists in `backend/` folder
- Check Python dependencies: `pip list | grep torch`
- Try: `python backend/test.py`

**Frontend can't connect to backend:**
- Ensure backend is running on port 5000
- Check `.env.local`: `VITE_BACKEND_URL=http://localhost:5000`
- Check browser console for CORS errors

**Out of Memory:**
- Reduce image size before upload
- Model runs on CPU (GPU if available)
- System RAM needed: 4GB minimum

## Next Steps

1. Open http://localhost:3000 in your browser
2. Create an account (citizen or corporation)
3. Upload road images/videos
4. System will detect cracks and potholes
5. View results with severity ratings

---

**Status**: Ready to use! Both servers are running. 🚀
