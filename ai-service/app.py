from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
from ultralytics import YOLO
import os
import time
import shutil
import numpy as np

app = FastAPI(title="Smart Pothole AI Service")

# =============================
# CORS
# =============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# MODEL LOAD
# =============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "ai-model", "best.pt")

model = YOLO(MODEL_PATH)
print("✅ YOLO Model Loaded")

# =============================
# CAMERA SETUP
# =============================
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
time.sleep(2)

if not cap.isOpened():
    print("❌ Camera not working")
else:
    print("✅ Camera started")

# =============================
# SETTINGS
# =============================
CONF_THRESHOLD = 0.5
PROCESS_EVERY_N = 2
FRAME_SIZE = 640

REAL_POTHOLE_HEIGHT = 0.5
FOCAL_LENGTH = 700

latest_data = {
    "potholes": 0,
    "severity": "None",
    "confidence": 0,
    "distance": 0,
    "address": "Bangalore, India"
}

uploaded_video_path = None

# =============================
# SEVERITY FUNCTION
# =============================
def get_severity(count):
    if count == 0:
        return "None"
    elif count == 1:
        return "Low"
    elif count <= 3:
        return "Medium"
    else:
        return "High"

# =============================
# DISTANCE ESTIMATION
# =============================
def estimate_distance(box_height_pixels):
    if box_height_pixels == 0:
        return 0
    return round((REAL_POTHOLE_HEIGHT * FOCAL_LENGTH) / box_height_pixels, 2)

# =============================
# LIVE CAMERA STREAM
# =============================
def generate_live_stream():
    frame_count = 0

    while True:
        success, frame = cap.read()
        if not success:
            continue

        frame_count += 1
        frame_resized = cv2.resize(frame, (FRAME_SIZE, FRAME_SIZE))

        if frame_count % PROCESS_EVERY_N != 0:
            ret, buffer = cv2.imencode(".jpg", frame_resized)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + buffer.tobytes()
                + b"\r\n"
            )
            continue

        results = model(frame_resized, conf=CONF_THRESHOLD, verbose=False)
        annotated_frame = frame_resized.copy()

        pothole_count = 0
        valid_conf = []
        distance_val = 0
        frame_height = FRAME_SIZE

        if results[0].boxes is not None and len(results[0].boxes) > 0:
            for box in results[0].boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0]) * 100

                box_width = x2 - x1
                box_height = y2 - y1
                box_area = box_width * box_height

                # FILTERS
                if y1 < frame_height * 0.4:
                    continue

                if box_area < 4000:
                    continue

                aspect_ratio = box_width / box_height
                if aspect_ratio < 1.0:
                    continue

                pothole_count += 1
                valid_conf.append(conf)
                distance_val = estimate_distance(box_height)

                label = f"Pothole | {round(conf,1)}% | {distance_val}m"

                cv2.rectangle(
                    annotated_frame,
                    (int(x1), int(y1)),
                    (int(x2), int(y2)),
                    (0, 0, 255),
                    2
                )

                cv2.putText(
                    annotated_frame,
                    label,
                    (int(x1), int(y1) - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 255),
                    2
                )

        avg_confidence = round(float(np.mean(valid_conf)), 2) if valid_conf else 0
        severity = get_severity(pothole_count)

        latest_data.update({
            "potholes": pothole_count,
            "severity": severity,
            "confidence": avg_confidence,
            "distance": distance_val
        })

        ret, buffer = cv2.imencode(".jpg", annotated_frame)
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + buffer.tobytes()
            + b"\r\n"
        )

@app.get("/live")
def live_video():
    return StreamingResponse(
        generate_live_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

# =============================
# UPLOAD VIDEO
# =============================
@app.post("/upload-stream")
async def upload_stream(video: UploadFile = File(...)):
    global uploaded_video_path

    uploaded_video_path = f"temp_{video.filename}"

    with open(uploaded_video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    return {"message": "Upload successful"}

# =============================
# STREAM UPLOADED VIDEO
# =============================
def generate_uploaded_stream():
    global uploaded_video_path

    cap_video = cv2.VideoCapture(uploaded_video_path)

    while True:
        ret, frame = cap_video.read()
        if not ret:
            break

        results = model(frame, conf=CONF_THRESHOLD, verbose=False)
        annotated_frame = results[0].plot()

        pothole_count = len(results[0].boxes) if results[0].boxes else 0
        severity = get_severity(pothole_count)

        latest_data["potholes"] = pothole_count
        latest_data["severity"] = severity

        ret, buffer = cv2.imencode(".jpg", annotated_frame)

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + buffer.tobytes()
            + b"\r\n"
        )

    cap_video.release()

    if uploaded_video_path and os.path.exists(uploaded_video_path):
        os.remove(uploaded_video_path)

@app.get("/upload-live")
def upload_live():
    return StreamingResponse(
        generate_uploaded_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

@app.get("/live-stats")
def live_stats():
    return latest_data

@app.get("/")
def home():
    return {"message": "🚀 Smart Pothole AI Running"}