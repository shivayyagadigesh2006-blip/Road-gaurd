import torch
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from io import BytesIO
from PIL import Image, ExifTags, UnidentifiedImageError
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    print("[INFO] HEIC support registered")
except ImportError:
    print("[WARN] pillow-heif not installed, HEIC support disabled")
import os
import warnings
import database
warnings.filterwarnings('ignore')

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024 # 100MB Limit
database.init_db()
# Enable CORS for all domains on all routes
CORS(app, resources={r"/*": {"origins": "*"}})

# Explicitly serve static files for Render/Gunicorn
from flask import send_from_directory
@app.route('/static/<path:path>')
def send_static(path):
    print(f"[DEBUG] Serving static file: {path}")
    response = send_from_directory('static', path)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

import logging
logging.basicConfig(filename='backend_error.log', level=logging.DEBUG, 
                    format='%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s')


# Load the YOLOv5 model using ultralytics
MODEL_PATHS = [
    os.path.join(os.path.dirname(__file__), 'best.pt'),  # Backend folder
    os.path.join(os.path.dirname(__file__), 'best (1).pt'),  # Backend folder with original name
]

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

model = None
model_path_used = None

print("=" * 60)
print("Loading RoadGuard AI YOLOv5 Model")
print("=" * 60)

for model_path in MODEL_PATHS:
    if os.path.exists(model_path):
        try:
            print(f"Found model file: {model_path}")
            print(f"File size: {os.path.getsize(model_path) / (1024*1024):.1f} MB")
            
            # Use ultralytics YOLO directly
            from ultralytics import YOLO
            model = YOLO(model_path)
            model.to(device)
            model_path_used = model_path
            print(f"✓ Model loaded successfully!")
            print(f"✓ Device: {device}")
            print("=" * 60)
            break
        except Exception as load_error:
            print(f"✗ Error loading model: {load_error}")
            print(f"  Attempting next location...")
            continue

if model is None:
    print(f"✗ WARNING: Model not found in expected locations")
    print(f"  Expected locations:")
    for p in MODEL_PATHS:
        exists = "✓" if os.path.exists(p) else "✗"
        print(f"  {exists} {p}")
    print("\n✓ Backend will run in analysis-disabled mode")
    print("=" * 60)

# Severity mapping based on confidence and bbox area
def calculate_severity(confidence, bbox_area_ratio):
    """
    Calculate severity (0-4) based on detection confidence and bounding box area
    0: Low/Healthy
    1: Minor Wear
    2: Moderate Damage
    3: Severe Damage
    4: Critical Infrastructure Risk
    """
    if confidence < 0.5:
        return 0
    elif confidence < 0.6 and bbox_area_ratio < 0.05:
        return 1
    elif confidence < 0.75 and bbox_area_ratio < 0.15:
        return 2
    elif confidence < 0.85 and bbox_area_ratio < 0.3:
        return 3
    else:
        return 4

def merge_overlapping_boxes(boxes, img_width, img_height):
    """
    Merge overlapping boxes of the same class to create larger, cleaner detections.
    Also expands boxes slightly to cover 'total area'.
    """
    if not boxes:
        return []
        
    # Group by class
    by_class = {}
    for box in boxes:
        cls = int(box.cls[0].cpu().numpy()) if box.cls is not None else 0
        if cls not in by_class:
            by_class[cls] = []
        by_class[cls].append(box)
    
    final_boxes = []
    padding = 30 # pixels - increased to better group nearby cracks
    
    for cls, class_boxes in by_class.items():
        # Convert to list of [x1, y1, x2, y2, conf]
        rects = []
        for box in class_boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0].cpu().numpy()) if box.conf is not None else 0.5
            
            # Expand
            x1 = max(0, x1 - padding)
            y1 = max(0, y1 - padding)
            x2 = min(img_width, x2 + padding)
            y2 = min(img_height, y2 + padding)
            
            rects.append([x1, y1, x2, y2, conf])
            
        # Merge overlapping rects
        # Simple iterative merge
        merged = []
        while rects:
            # Take first
            current = rects.pop(0)
            cx1, cy1, cx2, cy2, cconf = current
            
            # Find overlaps
            has_overlap = True
            while has_overlap:
                has_overlap = False
                rest = []
                for other in rects:
                    ox1, oy1, ox2, oy2, oconf = other
                    
                    # Check overlap
                    xx1 = max(cx1, ox1)
                    yy1 = max(cy1, oy1)
                    xx2 = min(cx2, ox2)
                    yy2 = min(cy2, oy2)
                    
                    if xx1 < xx2 and yy1 < yy2:
                        # Overlaps - merge into current
                        cx1 = min(cx1, ox1)
                        cy1 = min(cy1, oy1)
                        cx2 = max(cx2, ox2)
                        cy2 = max(cy2, oy2)
                        cconf = max(cconf, oconf)
                        has_overlap = True # Restart check since current grew
                    else:
                        rest.append(other)
                rects = rest
            
            merged.append({'box': [cx1, cy1, cx2, cy2], 'conf': cconf, 'cls': cls})
            
        final_boxes.extend(merged)
        
    return final_boxes

def get_decimal_from_dms(dms, ref):
    degrees = dms[0]
    minutes = dms[1]
    seconds = dms[2]
    
    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    
    if ref in ['S', 'W']:
        decimal = -decimal
        
    return decimal

def extract_gps_location(image):
    try:
        exif = image._getexif()
        if not exif:
            return None
            
        gps_info = {}
        for tag, value in exif.items():
            decoded = ExifTags.TAGS.get(tag, tag)
            if decoded == 'GPSInfo':
                gps_info = value
                break
        
        if not gps_info:
            return None
            
        # 1 = N, 2 = Lat, 3 = E, 4 = Lon
        # GPSInfo keys are integers
        # 1: GPSLatitudeRef, 2: GPSLatitude, 3: GPSLongitudeRef, 4: GPSLongitude
        
        if 2 in gps_info and 4 in gps_info:
            lat_dms = gps_info[2]
            lat_ref = gps_info.get(1, 'N')
            lon_dms = gps_info[4]
            lon_ref = gps_info.get(3, 'E')
            
            lat = get_decimal_from_dms(lat_dms, lat_ref)
            lon = get_decimal_from_dms(lon_dms, lon_ref)
            
            return {"lat": lat, "lng": lon}
            
    except Exception as e:
        print(f"[DEBUG] Error extracting GPS: {e}")
        return None
    return None

def preprocess_image(image_data):
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to enhance
    details like cracks and potholes in shadows or low contrast areas.
    """
    try:
        # Check if we need to convert color space
        if len(image_data.shape) == 3 and image_data.shape[2] == 3:
            # Convert RGB to LAB
            lab = cv2.cvtColor(image_data, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE to L-channel
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            cl = clahe.apply(l)
            
            # Merge and convert back to RGB
            limg = cv2.merge((cl, a, b))
            enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
            return enhanced
        return image_data
    except Exception as e:
        print(f"[WARN] Preprocessing failed: {e}")
        return image_data

def analyze_image(image_input, image_height=1000, image_width=1000):
    """
    Analyze image using the loaded model
    Input can be PIL Image or numpy array
    Returns RoadAnalysis format compatible with frontend
    """
    if model is None:
        return {
            "detected": False,
            "damageTypes": [],
            "severity": 0,
            "description": "Model not loaded",
            "boundingBoxes": []
        }
    
    try:
        # Convert PIL Image to numpy array if needed
        # Also try to extract GPS if it is a PIL Image
        extracted_location = None
        
        if isinstance(image_input, Image.Image):
            extracted_location = extract_gps_location(image_input)
            if extracted_location:
                print(f"[DEBUG] Extracted EXIF Location: {extracted_location}")
            image_data = np.array(image_input)
        else:
            image_data = image_input
        
        print(f"[DEBUG] Input image shape: {image_data.shape}")
        print(f"[DEBUG] Image dtype: {image_data.dtype}")
        
        # Ensure image is in uint8 format
        if image_data.dtype != np.uint8:
            image_data = (image_data * 255).astype(np.uint8) if image_data.max() <= 1 else image_data.astype(np.uint8)
        
        
        # 1. Keep ORIGINAL for display (Preserve Colors)
        original_image_rgb = image_data.copy()
        
        # 2. Preprocess copy for AI (Enhance Contrast)
        print(f"[DEBUG] Preprocessing image to enhance details...")
        enhanced_image = preprocess_image(image_data)
        
        # 3. Run inference on ENHANCED
        print(f"[DEBUG] Running model inference...")
        # Lower confidence to 0.10 (Sync with video logic)
        results = model.predict(enhanced_image, conf=0.10, verbose=False)
        
        print(f"[DEBUG] Model returned {len(results)} result(s)")
        
        if not results or len(results) == 0:
            return {
                "detected": False,
                "damageTypes": [],
                "severity": 0,
                "description": "No inference results",
                "boundingBoxes": []
            }
        
        result = results[0]
        print(f"[DEBUG] Result type: {type(result)}")
        print(f"[DEBUG] Result has boxes: {result.boxes is not None}")
        
        # Get detections
        if result.boxes is None or len(result.boxes) == 0:
            print("[DEBUG] No boxes found in result")
            return {
                "detected": False,
                "damageTypes": [],
                "severity": 0,
                "description": "No damage detected",
                "boundingBoxes": []
            }
        
        print(f"[DEBUG] Found {len(result.boxes)} detections")
        detections = result.boxes
        
        damage_types = []
        bounding_boxes = []
        max_severity = 0
        
        img_height, img_width = image_data.shape[:2]
        print(f"[DEBUG] Image dimensions: {img_height}x{img_width}")
        
        # Get class names
        class_names = model.names if hasattr(model, 'names') else {0: 'crack', 1: 'pothole'}
        print(f"[DEBUG] Class names: {class_names}")
        
        # Merge overlapping boxes first
        merged_detections = merge_overlapping_boxes(detections, img_width, img_height)
        print(f"[DEBUG] Merged {len(detections)} detections into {len(merged_detections)} unique areas")
        
        # Process each detection
        for idx, det in enumerate(merged_detections):
            try:
                print(f"[DEBUG] Processing merged detection {idx}")
                
                # Get coordinates
                x1, y1, x2, y2 = det['box']
                
                # Get confidence and class
                conf = det['conf']
                cls = det['cls']
                
                print(f"[DEBUG] Box coords: ({x1:.1f}, {y1:.1f}, {x2:.1f}, {y2:.1f}), conf: {conf:.3f}, class: {cls}")
                
                # Normalize coordinates to 0-1000 scale
                ymin = max(0, min(int((y1 / img_height) * image_height), image_height))
                xmin = max(0, min(int((x1 / img_width) * image_width), image_width))
                ymax = max(0, min(int((y2 / img_height) * image_height), image_height))
                xmax = max(0, min(int((x2 / img_width) * image_width), image_width))
                
                # Skip invalid boxes
                if ymin >= ymax or xmin >= xmax:
                    print(f"[DEBUG] Skipping invalid box")
                    continue
                
                # Calculate area ratio
                bbox_area = (xmax - xmin) * (ymax - ymin)
                total_area = image_height * image_width
                area_ratio = bbox_area / total_area if total_area > 0 else 0
                
                # Get damage label
                damage_label = class_names.get(cls, f'damage_{cls}')
                
                if damage_label not in damage_types:
                    damage_types.append(damage_label)
                
                # Calculate severity
                severity = calculate_severity(conf, area_ratio)
                max_severity = max(max_severity, severity)
                
                bounding_boxes.append({
                    "box_2d": [ymin, xmin, ymax, xmax],
                    "label": damage_label.capitalize()
                })
                
                print(f"[DEBUG] Added detection: {damage_label} severity={severity}")
                
            except Exception as e:
                print(f"[DEBUG] Error processing detection {idx}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        severity_labels = {
            0: "No damage detected",
            1: "Minor wear detected",
            2: "Moderate damage detected",
            3: "Severe damage detected",
            4: "Critical infrastructure risk"
        }
        
        detected = len(bounding_boxes) > 0
        description = severity_labels.get(max_severity, "Analysis complete")
        if damage_types:
            description = f"Detected {', '.join(damage_types)}: {description}"
        
        print(f"[DEBUG] Final result: detected={detected}, severity={max_severity}, types={damage_types}, boxes={len(bounding_boxes)}")
        
        # Generate annotated image
        try:
            # Draw manually on original_image_rgb to preserve colors
            annotated_frame_rgb = original_image_rgb.copy()
            
            if results and len(results) > 0 and results[0].boxes:
                for box in results[0].boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    
                    # Draw Red Box (255, 0, 0) - we are in RGB
                    cv2.rectangle(annotated_frame_rgb, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 2)
                    
                    # Draw Label
                    cls_id = int(box.cls[0].item())
                    class_name = model.names[cls_id] if hasattr(model, 'names') else str(cls_id)
                    conf = float(box.conf[0].item())
                    label = f"{class_name.capitalize()} {conf:.2f}"
                    
                    cv2.putText(annotated_frame_rgb, label, (int(x1), int(max(0, y1-10))), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
            
            pil_img = Image.fromarray(annotated_frame_rgb)
            buff = BytesIO()
            pil_img.save(buff, format="JPEG")
            processed_base64 = base64.b64encode(buff.getvalue()).decode('utf-8')
            processed_url = f"data:image/jpeg;base64,{processed_base64}"
        except Exception as e:
            print(f"[ERROR] Failed to generate annotated image: {e}")
            processed_url = None

        # Auto-Routing Logic
        department = 'ROADS' # Default
        
        # Check detected classes
        # damage_types contains strings like 'Pothole', 'Crack' etc (capitalized in loop?)
        # Actually line 320 damage_label is from class_names. 
        # let's normalize to lower case for checking
        
        d_types_lower = [d.lower() for d in damage_types]
        
        if any(x in d_types_lower for x in ['water', 'flood', 'drainage']):
            department = 'DRAINAGE'
        elif any(x in d_types_lower for x in ['accident', 'collision', 'traffic']):
            department = 'TRAFFIC'
        elif any(x in d_types_lower for x in ['tree', 'fallen']):
            department = 'DRAINAGE'
        elif any(x in d_types_lower for x in ['utility', 'pole', 'wire']):
            department = 'UTILITY'
            
        print(f"[DEBUG] Auto-routed to: {department}")

        return {
            "detected": detected,
            "damageTypes": damage_types,
            "severity": max_severity,
            "description": description,
            "boundingBoxes": bounding_boxes,
            "imageDimensions": {"width": img_width, "height": img_height},
            "processedMediaUrl": processed_url,
            "location": extracted_location,
            "department": department
        }
    
    except Exception as e:
        print(f"[ERROR] Error during analysis: {e}")
        import traceback
        traceback.print_exc()
        return {
            "detected": False,
            "damageTypes": [],
            "severity": 0,
            "description": f"Analysis error: {str(e)}",
            "boundingBoxes": []
        }

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "online",
        "service": "RoadGuard AI Backend",
        "endpoints": ["/health", "/analyze"]
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    status = "ready" if model is not None else "model_not_loaded"
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": model_path_used,
        "analysis_status": status,
        "device": str(device)
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze road image/video for damage
    Expected JSON: {
        "image": base64_encoded_image,
        "mimeType": "image/jpeg" or "video/mp4"
    }
    """
    try:
        data = request.json
        
        if not data or 'image' not in data:
            return jsonify({"error": "Missing image data"}), 400
        
        mime_type = data.get('mimeType', 'image/jpeg')
        base64_image = data['image']
        
        # Handle data URLs
        if ',' in base64_image:
            header, base64_image = base64_image.split(',', 1)
            print(f"[DEBUG] Header found: {header}")
        
        print(f"[DEBUG] Base64 len: {len(base64_image)}")
        print(f"[DEBUG] Base64 prefix: {base64_image[:30]}...")
        
        try:
            # Decode base64
            image_bytes = base64.b64decode(base64_image)
            image = Image.open(BytesIO(image_bytes)).convert('RGB')
            image_array = np.array(image)
            
            # OpenCV uses BGR, PIL uses RGB - keep as RGB for model
            print(f"Image shape: {image_array.shape}")
            
            # Analyze
            result = analyze_image(image_array)
            
            return jsonify(result)
        except UnidentifiedImageError:
            print("[ERROR] PIL could not identify image format")
            return jsonify({
                "error": "Unsupported image format. Please upload a standard JPG or PNG image.",
                "detected": False
            }), 400
        except Exception as decode_error:
            print(f"Error decoding image: {decode_error}")
            import traceback
            traceback.print_exc()
            raise
    
    except Exception as e:
        print(f"Error in /analyze: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "detected": False,
            "damageTypes": [],
            "severity": 0,
            "description": f"Analysis failed: {str(e)}",
            "boundingBoxes": []
        }), 500
        return jsonify({
            "error": str(e),
            "detected": False,
            "damageTypes": [],
            "severity": 0,
            "description": f"Analysis failed: {str(e)}",
            "boundingBoxes": []
        }), 500
    except Exception as e:
        import sys
        print(f"!!! CRITICAL EXCEPTION IN /analyze: {e}")
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

# Static dirs
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
VIDEO_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'videos')
ORIGINAL_VIDEO_FOLDER = os.path.join(VIDEO_UPLOAD_FOLDER, 'original')
PROCESSED_VIDEO_FOLDER = os.path.join(VIDEO_UPLOAD_FOLDER, 'processed')

for folder in [ORIGINAL_VIDEO_FOLDER, PROCESSED_VIDEO_FOLDER]:
    os.makedirs(folder, exist_ok=True)

from flask_cors import CORS, cross_origin

@app.route('/analyze/video', methods=['POST', 'OPTIONS'])
@cross_origin()
def analyze_video():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    """
    Video analysis endpoint
    Processes video frames to detect road damage
    """
    try:
        # Check for multipart/form-data (File Upload) - Efficient
        if 'video' in request.files:
            file = request.files['video']
            print(f"[DEBUG] Received file via multipart: {file.filename}")
            
            # Generate UUID
            import uuid
            file_id = str(uuid.uuid4())
            
            # Save directly
            original_filename = f"{file_id}.mp4"
            original_path = os.path.join(ORIGINAL_VIDEO_FOLDER, original_filename)
            file.save(original_path)
            
            # No base64 decoding needed!
            video_bytes = None 
            video_data = None
            
        # Fallback to JSON (Legacy/Base64) - High Memory Usage
        else:
            data = request.json
            if not data or 'video' not in data:
                return jsonify({"error": "No video data provided"}), 400
                
            print("[DEBUG] Starting video analysis (Base64 mode)...")
            video_data = data['video']
            if ',' in video_data:
                video_data = video_data.split(',')[1]
                
            try:
                video_bytes = base64.b64decode(video_data)
            except Exception as e:
                return jsonify({"error": f"Invalid base64 video data: {str(e)}"}), 400
            
            # Generate UUID
            import uuid
            file_id = str(uuid.uuid4())
            
            # Save Original Video
            original_filename = f"{file_id}.mp4"
            original_path = os.path.join(ORIGINAL_VIDEO_FOLDER, original_filename)
            
            with open(original_path, "wb") as f:
                f.write(video_bytes)
                
            # FREE MEMORY
            del video_bytes
            del video_data
        
        import gc
        gc.collect()
        
        print(f"[DEBUG] Video saved to {original_path}")
        
        # Verify file size
        if os.path.getsize(original_path) == 0:
             os.unlink(original_path)
             return jsonify({"error": "Saved video file is empty"}), 400

        cap = cv2.VideoCapture(original_path)
        if not cap.isOpened():
            os.unlink(original_path)
            return jsonify({"error": "Could not open video file"}), 400
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0: fps = 30 # Fallback
        
        # Video Writer Setup
        processed_filename = f"{file_id}_processed.mp4"
        output_path = os.path.join(PROCESSED_VIDEO_FOLDER, processed_filename)
        
        # Frame size from capture
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Try to initialize VideoWriter with multiple codecs
        # Render/Linux often lacks h264 hardware support, so we prioritize software-friendly codecs
        codecs_to_try = [
            ('mp4v', 'mp4'),  # Most compatible software codec
            ('avc1', 'mp4'),  # H.264 (might fail without openh264)
            ('h264', 'mp4'),  # Alternative H.264
            ('XVID', 'avi')   # Fallback AVI
        ]
        
        out_writer = None
        used_codec = None
        
        for codec, ext in codecs_to_try:
            try:
                fourcc = cv2.VideoWriter_fourcc(*codec)
                temp_out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
                if temp_out.isOpened():
                    out_writer = temp_out
                    used_codec = codec
                    print(f"[INFO] Successfully initialized VideoWriter with codec: {codec}")
                    break
            except Exception as e:
                print(f"[WARN] Failed to init codec {codec}: {e}")

        if not out_writer or not out_writer.isOpened():
            print("[ERROR] Could not initialize any VideoWriter codec.")
            cap.release()
            return jsonify({"error": "Server failed to process video (Codec Error)"}), 500
        
        try:
            # Output FPS
            out_fps = fps
            
            # Windows/OpenCV often fails with avc1 without openh264 dll.
            # We prioritize mp4v for backend stability, even if it means 
            # some browsers might not play it natively (they often can play mp4v in .mp4 container though).
            # OR we try avc1 inside a broad try/catch to avoid crashing the thread.
            
            codecs_to_try = ['avc1', 'mp4v', 'h264']
            
            for codec in codecs_to_try:
                try:
                    fourcc = cv2.VideoWriter_fourcc(*codec)
                    out_writer = cv2.VideoWriter(output_path, fourcc, out_fps, (frame_width, frame_height))
                    if out_writer.isOpened():
                        print(f"[INFO] Initialized VideoWriter with codec: {codec}")
                        break
                except Exception as e:
                    print(f"[WARN] Failed to init codec {codec}: {e}")
            
            if not out_writer or not out_writer.isOpened():
                 print("[ERROR] Failed to open VideoWriter with all codecs.")
                 out_writer = None

        except Exception as e:
            print(f"[ERROR] Failed to init VideoWriter loop: {e}")
            out_writer = None
            
        frame_count = 0
        video_damage_types = set()
        max_video_severity = 0
        video_detections = []
        
        frame_skip = 5  # Process every 5th frame to speed up
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process only every Nth frame
            if frame_count % frame_skip == 0:
                # Convert to RGB for consistently with image analysis & preprocessing
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Enhance for AI "Vision"
                enhanced_frame = preprocess_image(frame_rgb)
                
                # Predict (using enhanced RGB image)
                # Conf 0.10 for maximum sensitivity
                results = model.predict(enhanced_frame, conf=0.10, verbose=False)
                
                # Draw detections on ORIGINAL frame (to keep colors/quality)
                if len(results) > 0 and results[0].boxes is not None:
                    boxes = results[0].boxes
                    frame_boxes = []
                    
                    for box in boxes:
                        # Get coords
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        
                        # Draw box
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 2)
                        
                        # Get details
                        cls_id = int(box.cls[0].item())
                        class_name = model.names[cls_id] if hasattr(model, 'names') else str(cls_id)
                        conf = float(box.conf[0].item())
                        
                        # Aggregate for report
                        damage_label = class_name.capitalize()
                        video_damage_types.add(damage_label)
                        
                        # Calculate area for severity
                        bbox_area = (x2 - x1) * (y2 - y1)
                        total_area = frame_width * frame_height
                        area_ratio = bbox_area / total_area if total_area > 0 else 0
                        
                        severity = calculate_severity(conf, area_ratio)
                        max_video_severity = max(max_video_severity, severity)
                        
                        frame_boxes.append({
                            "box": [float(y1), float(x1), float(y2), float(x2)], # Same as image: ymin, xmin, ymax, xmax
                            "label": damage_label,
                            "confidence": conf
                        })
                        
                        # Draw label
                        label = f"{damage_label} {conf:.2f}"
                        cv2.putText(frame, label, (int(x1), int(max(0, y1-10))), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                                  
                    if frame_boxes:
                        video_detections.append({
                            "timestamp": frame_count / fps,
                            "boxes": frame_boxes
                        })

            if out_writer:
                out_writer.write(frame)
                        
            if frame_count % 30 == 0:
                gc.collect()

            frame_count += 1
            
        cap.release()
        if out_writer:
            out_writer.release()
            
        # Construct URLs
        # Flask is usually served on 5000. Static files are at /static/...
        # URL structure: http://localhost:5000/static/uploads/videos/original/<id>.mp4
        
        # We return the relative path from server root. Frontend can prepend backend URL if needed,
        # or we return full URL if we knew the host. Relative is safer for proxying.
        # But wait, frontend `geminiService` calls backend.
        
        # Let's return the full static path relative to domain root
        original_media_url = f"/static/uploads/videos/original/{original_filename}"
        
        processed_video_url = None
        if os.path.exists(output_path):
             processed_video_url = f"/static/uploads/videos/processed/{processed_filename}"
        
        # Auto-Routing Logic (Same as Image)
        department = 'ROADS' # Default
        d_types_lower = [d.lower() for d in list(video_damage_types)]
        
        if any(x in d_types_lower for x in ['water', 'flood', 'drainage']):
            department = 'DRAINAGE'
        elif any(x in d_types_lower for x in ['accident', 'collision', 'traffic']):
            department = 'TRAFFIC'
        elif any(x in d_types_lower for x in ['tree', 'fallen']):
            department = 'DRAINAGE'
        elif any(x in d_types_lower for x in ['utility', 'pole', 'wire']):
            department = 'UTILITY'

        # Return response with processed video
        return jsonify({
             "detected": len(video_damage_types) > 0,
             "damageTypes": list(video_damage_types),
             "severity": max_video_severity,
             "description": f"Analysis Complete. Found: {', '.join(video_damage_types)}" if video_damage_types else "No significant damage detected.",
             "boundingBoxes": [], # Legacy
             "videoDetections": video_detections,
             "processedMediaUrl": processed_video_url, # URL to processed video
             "originalMediaUrl": original_media_url,   # URL to original video (for report card)
             "department": department
        })
            
    except Exception as e:
        print(f"Video analysis error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    user = database.get_user_by_email(data['email'])
    if user and user['password'] == data['password']:
        return jsonify(user)
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/auth/register', methods=['POST'])
def register():
    data = request.json
    success = database.add_user(data)
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "User already exists"}), 400

@app.route('/reports', methods=['GET'])
def get_reports():
    reports = database.get_reports()
    return jsonify(reports)

@app.route('/reports', methods=['POST'])
def save_report():
    data = request.json
    success = database.save_report(data)
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "Failed to save report"}), 500

@app.route('/reports/<id>', methods=['PATCH'])
def update_report(id):
    data = request.json
    status = data.get('status')
    repair_url = data.get('repairMediaUrl')
    
    success = database.update_report_status(id, status, repair_url)
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "Failed to update report"}), 500

@app.route('/contractors', methods=['GET'])
def get_contractors_route():
    dept = request.args.get('department')
    contractors = database.get_contractors(dept)
    return jsonify(contractors)

@app.route('/wards', methods=['GET'])
def get_wards_route():
    dept = request.args.get('department')
    wards = database.get_wards(dept)
    return jsonify(wards)

@app.route('/reports/assign', methods=['POST'])
def assign_report_route():
    data = request.json
    report_id = data.get('reportId')
    contractor_id = data.get('contractorId')
    
    if not report_id or not contractor_id:
        return jsonify({"error": "Missing reportId or contractorId"}), 400
        
    success = database.assign_report(report_id, contractor_id)
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "Failed to assign report"}), 500

@app.route('/reports/assign-ward', methods=['POST'])
def assign_ward_route():
    data = request.json
    report_id = data.get('reportId')
    ward_id = data.get('wardId')
    
    if not report_id or not ward_id:
        return jsonify({"error": "Missing reportId or wardId"}), 400
        
    success = database.assign_report_to_ward(report_id, ward_id)
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "Failed to assign report"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
