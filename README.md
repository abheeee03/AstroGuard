# AstroGuard

AstroGuard is an advanced object detection system designed to identify and locate critical equipment in the International Space Station (ISS) environment. Using computer vision and deep learning techniques, the system can detect fire extinguishers, toolboxes, oxygen tanks, and other vital equipment in images.

![AstroGuard](https://place-hold.it/800x400&text=AstroGuard&fontsize=30)

## Project Overview

AstroGuard consists of two main components:

1. **Backend**: Python FastAPI server with YOLOv8 object detection model
2. **Frontend**: Next.js web application with modern UI for image upload and visualization

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

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16.8.0+
- npm or yarn

### Setup and Installation

1. **Clone the repository**:

```bash
git clone https://github.com/yourusername/AstroGuard.git
cd AstroGuard
```

2. **Set up the backend**:

```bash
cd backend
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
pip install -r requirements.txt
```

3. **Set up the frontend**:

```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start the backend server**:

```bash
cd backend
python api.py
```

2. **Start the frontend development server**:

```bash
cd frontend
npm run dev
```

3. **Access the application** at [http://localhost:3000](http://localhost:3000)

## Usage

1. Navigate to the application in your web browser
2. Upload an image containing ISS equipment
3. Click "Detect Objects" to process the image
4. View the detection results with highlighted equipment and confidence scores

## License

MIT

## Acknowledgements

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) for the object detection model
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [Next.js](https://nextjs.org/) and [React](https://reactjs.org/) for the frontend framework
- [Shadcn UI](https://ui.shadcn.com/) for the UI components 