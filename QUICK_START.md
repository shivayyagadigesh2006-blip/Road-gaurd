# 🚀 Quick Start - RoadGuard AI

## ✅ Systems Running
- **Backend**: http://localhost:5000 ✓
- **Frontend**: http://localhost:3000 ✓

## 📂 Project Structure
```
roadguard-ai/
├── backend/
│   ├── app.py              # Flask API server
│   ├── best.pt             # YOLOv5 Model (6 MB)
│   ├── requirements.txt     # Python dependencies
│   └── test.py             # Diagnostics script
├── services/
│   └── geminiService.ts    # Backend API client
├── components/             # React components
├── App.tsx                 # Main app component
├── package.json            # Node dependencies
└── README.md               # Documentation
```

## 🎯 Features
✅ Upload images/videos of roads  
✅ AI detects cracks & potholes  
✅ Shows severity (Low to Critical)  
✅ Bounding boxes highlight damage  
✅ GPS location tagging  
✅ Before/after repair tracking  
✅ Dual portal (Citizen & Corporation)  

## 👥 Test Accounts
**Citizen Portal:**
- Email: `user@gmail.com`
- Password: `password123`

**Corporation Portal:**
- Email: `admin@gmail.com`
- Password: `adminpassword`

## 🎬 Usage Steps
1. Go to http://localhost:3000
2. Choose "Citizen" or "Corporation"
3. Login with test credentials
4. Upload a road image or video
5. Wait for analysis (shows progress)
6. See detection results with bounding boxes
7. View damage severity and type

## 🔧 Model Details
- **Model**: `best.pt` (YOLOv5 custom)
- **Classes**: Crack, Pothole
- **Input**: Images/Videos
- **Output**: Detections with bounding boxes
- **Device**: CPU (can use GPU if available)

## 🛠️ If You Need to Restart Servers

**Backend crashed?**
```bash
cd backend
python app.py
```

**Frontend crashed?**
```bash
npm run dev
```

**Both crashed?**
```bash
# Windows:
./start.bat

# macOS/Linux:
bash start.sh
```

## 📊 Severity Levels
| Level | Label | Status |
|-------|-------|--------|
| 0 | Healthy | No damage detected |
| 1 | Minor Wear | Hairline cracks |
| 2 | Moderate | Visible cracks/shallow holes |
| 3 | Severe | Deep potholes/heavy cracks |
| 4 | Critical | Hazardous holes/complete failure |

## 🔍 API Endpoints

**Health Check**
```bash
GET http://localhost:5000/health
```

**Analyze Image**
```bash
POST http://localhost:5000/analyze
Content-Type: application/json

{
  "image": "base64_encoded_image",
  "mimeType": "image/jpeg"
}
```

**Analyze Video**
```bash
POST http://localhost:5000/analyze/video
Content-Type: application/json

{
  "video": "base64_encoded_video",
  "mimeType": "video/mp4"
}
```

## 📝 Environment File
`.env.local` contains:
```env
VITE_BACKEND_URL=http://localhost:5000
```

## ✨ What's Working
- ✅ Image upload & analysis
- ✅ Video upload & frame sampling
- ✅ Real-time progress tracking
- ✅ Bounding box visualization
- ✅ Location tagging
- ✅ Report management
- ✅ Before/after comparison
- ✅ Admin dashboard
- ✅ Severity filtering
- ✅ IndexedDB persistence

## 🎓 Learn More
- See [README.md](README.md) for full documentation
- Check [SETUP_COMPLETE.md](SETUP_COMPLETE.md) for detailed setup info
- Run `backend/test.py` to verify dependencies

---

**Ready to go!** 🎉 Both servers are running and the YOLOv5 model is loaded.
