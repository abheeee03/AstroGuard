# AstroGuard

AstroGuard is an advanced object detection system designed to identify and locate critical equipment in the International Space Station (ISS) environment. Using computer vision and FALCON AI by duality AI, the system can detect fire extinguishers, toolboxes, oxygen tanks, and other vital equipment in images.

## Overview

AstroGuard helps astronauts and ground control maintain awareness of safety equipment locations aboard the ISS, ensuring quick access during emergencies and efficient inventory management.

- **Object Detection:** Powered by FALCON AI from duality AI, trained on specialized ISS equipment imagery
- **Real-time Analysis:** Process live camera feeds or uploaded images
- **Inventory Management:** Track available safety equipment quantities

## Documentation

- [![Watch the video]](https://www.youtube.com/watch?v=YrEeXRXBT90)

## Architecture

The system consists of two main components:

1. **Backend:** Python-based FastAPI server with YOLOv8 object detection model
2. **Frontend:** Next.js web application with modern UI for image upload and results visualization

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16.8.0+

### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
pip install -r requirements.txt
python api.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Access the application at [http://localhost:3000](http://localhost:3000)

## Features

- **Object Detection**: Identify critical ISS equipment with high accuracy
- **Visual Feedback**: View detection results with bounding boxes and confidence scores
- **User-Friendly Interface**: Easy-to-use web application for uploading and analyzing images
- **Fast Processing**: Optimized for quick results with minimal latency

## Technologies Used

- **Backend**:
  - Python 3.x
  - FastAPI
  - YOLOv8 (Ultralytics)
  - OpenCV
  
- **Frontend**:
  - Next.js 15
  - React 19
  - Tailwind CSS
  - Shadcn UI

## Project Structure

```
AstroGuard/
├── backend/              # Python FastAPI backend
│   ├── api.py            # API server
│   ├── predict.py        # YOLOv8 prediction utilities
│   ├── train.py          # Model training script
│   └── ...
│
└── frontend/             # Next.js frontend
    ├── src/              # Source code
    │   ├── app/          # Next.js app pages
    │   ├── components/   # Reusable components
    │   └── ...
    └── ...
```

## License

MIT

## Acknowledgements

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) for the object detection model
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [Next.js](https://nextjs.org/) and [React](https://reactjs.org/) for the frontend framework
- [Shadcn UI](https://ui.shadcn.com/) for the UI components 