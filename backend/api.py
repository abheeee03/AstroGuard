from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import cv2
import io
import os
from pathlib import Path
from ultralytics import YOLO
import base64

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 