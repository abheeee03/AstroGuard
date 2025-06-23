from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import numpy as np
import cv2
import io
import os
from pathlib import Path
from ultralytics import YOLO
import base64
import tempfile
import shutil
import uuid
import asyncio
from typing import List, Dict, Any

# Initialize FastAPI app
app = FastAPI(title="AstroGuard API")

# Add CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # NextJS default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the YOLO model at startup
MODEL_PATH = None

@app.on_event("startup")
async def startup_event():
    global MODEL_PATH, model
    
    this_dir = Path(__file__).parent
    detect_path = this_dir / "runs" / "detect"
    
    # Find the latest training folder
    train_folders = [f for f in os.listdir(detect_path) if os.path.isdir(detect_path / f) and f.startswith("train")]
    if len(train_folders) == 0:
        # Fallback to the default YOLOv8 model if no trained model exists
        MODEL_PATH = this_dir / "yolov8s.pt"
    else:
        # Use the latest trained model
        train_folders.sort()
        latest_train_folder = train_folders[-1]
        MODEL_PATH = detect_path / latest_train_folder / "weights" / "best.pt"
    
    # Load the model
    model = YOLO(MODEL_PATH)
    print(f"Model loaded from {MODEL_PATH}")

# Load class names
def get_class_names():
    with open(Path(__file__).parent / "classes.txt", "r") as f:
        return [line.strip() for line in f if line.strip()]

@app.get("/")
async def root():
    return {"message": "Welcome to AstroGuard Object Detection API"}

@app.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    # Read image from request
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Perform detection
    results = model.predict(img, conf=0.5)
    result = results[0]
    
    # Process detection results
    detections = []
    class_names = get_class_names()
    
    for box in result.boxes:
        # Extract class, confidence, and bounding box coordinates
        class_id = int(box.cls)
        confidence = float(box.conf)
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        
        # Get class name
        class_name = class_names[class_id] if class_id < len(class_names) else f"Class {class_id}"
        
        # Add detection to result
        detections.append({
            "class_id": class_id,
            "class_name": class_name,
            "confidence": confidence,
            "bbox": [x1, y1, x2, y2]  # x1, y1, x2, y2 format
        })
    
    # Generate output image with bounding boxes
    output_img = result.plot()
    
    # Convert the image to base64 for sending back to frontend
    _, buffer = cv2.imencode('.jpg', output_img)
    img_str = base64.b64encode(buffer).decode()
    
    return JSONResponse({
        "detections": detections,
        "image": img_str,
        "count": len(detections)
    })

@app.post("/detect-video")
async def detect_objects_in_video(file: UploadFile = File(...)):
    # Create a temp directory to store the video
    temp_dir = Path(tempfile.mkdtemp())
    video_path = temp_dir / f"{uuid.uuid4()}.mp4"
    
    try:
        # Save the uploaded file
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Open the video file
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return JSONResponse({"error": "Could not open video file"}, status_code=400)
        
        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Process video frames and collect results
        class_names = get_class_names()
        frame_count = 0
        processed_frames = []
        
        # Determine step size based on video length
        # For longer videos, we'll process fewer frames
        if total_frames > 300:  # Longer videos
            frame_step = 15
        elif total_frames > 100:  # Medium videos
            frame_step = 10
        else:  # Short videos
            frame_step = 5
            
        # Limit number of processed frames for memory and performance
        max_frames_to_process = 20
        frames_processed = 0
        
        while frames_processed < max_frames_to_process:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Process only every nth frame
            if frame_count % frame_step == 0:
                # Resize frame if it's too large
                if width > 1280 or height > 720:
                    frame = cv2.resize(frame, (min(1280, width), min(720, height)))
                
                # Perform detection
                try:
                    results = model.predict(frame, conf=0.4)  # Lower confidence threshold to catch more objects
                    result = results[0]
                    
                    # Process detection results
                    frame_detections = []
                    
                    for box in result.boxes:
                        # Extract class, confidence, and bounding box coordinates
                        class_id = int(box.cls)
                        confidence = float(box.conf)
                        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                        
                        # Get class name
                        class_name = class_names[class_id] if class_id < len(class_names) else f"Class {class_id}"
                        
                        # Add detection to result
                        frame_detections.append({
                            "class_id": class_id,
                            "class_name": class_name,
                            "confidence": confidence,
                            "bbox": [x1, y1, x2, y2]  # x1, y1, x2, y2 format
                        })
                    
                    # Generate output image with bounding boxes
                    output_img = result.plot()
                    
                    # Compress the image for response
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]  # 85% quality
                    _, buffer = cv2.imencode('.jpg', output_img, encode_param)
                    img_str = base64.b64encode(buffer).decode()
                    
                    # Add to results
                    processed_frames.append({
                        "frame_number": frame_count,
                        "detections": frame_detections,
                        "image": img_str
                    })
                    
                    frames_processed += 1
                except Exception as e:
                    print(f"Error processing frame {frame_count}: {e}")
            
            frame_count += 1
            
            # Safety check to prevent processing too many frames
            if frame_count > 1000:  # Limit total frames checked to prevent infinite loop
                break
        
        cap.release()
        
        # If we didn't process any frames successfully
        if len(processed_frames) == 0:
            return JSONResponse({
                "error": "Could not process any frames from the video"
            }, status_code=400)
        
        # Compile statistics
        class_counts = {}
        for frame in processed_frames:
            for detection in frame["detections"]:
                class_name = detection["class_name"]
                if class_name in class_counts:
                    class_counts[class_name] += 1
                else:
                    class_counts[class_name] = 1
        
        return JSONResponse({
            "total_frames": total_frames,
            "processed_frames": processed_frames,
            "fps": fps,
            "class_counts": class_counts,
            "status": "success",
            "video_info": {
                "width": width,
                "height": height,
                "duration_seconds": total_frames / max(1, fps)
            }
        })
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        # Clean up temporary directory
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 