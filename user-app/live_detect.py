import cv2
from ultralytics import YOLO
import os
import time

# =============================
# PATH SETUP
# =============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "ai-model", "best.pt")
SAVE_DIR = os.path.join(BASE_DIR, "captures")

os.makedirs(SAVE_DIR, exist_ok=True)

# =============================
# LOAD MODEL
# =============================
model = YOLO(MODEL_PATH)
print("✅ Model loaded")

# =============================
# CAMERA
# =============================
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

if not cap.isOpened():
    print("❌ Camera not working")
    exit()

print("✅ Camera started")

# =============================
# SETTINGS
# =============================
CONF_THRESHOLD = 0.5
SAVE_COOLDOWN = 3  # seconds between saves
last_save_time = 0

# =============================
# LOOP
# =============================
while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_resized = cv2.resize(frame, (640, 480))

    results = model(frame_resized, conf=CONF_THRESHOLD, verbose=False)
    annotated_frame = results[0].plot()

    pothole_count = 0
    if results[0].boxes is not None:
        pothole_count = len(results[0].boxes)

    # =============================
    # AUTO SAVE LOGIC 🔥
    # =============================
    current_time = time.time()

    if pothole_count > 0 and (current_time - last_save_time) > SAVE_COOLDOWN:
        filename = f"pothole_{int(current_time)}.jpg"
        filepath = os.path.join(SAVE_DIR, filename)
        cv2.imwrite(filepath, frame_resized)
        print(f"📸 Saved: {filename}")
        last_save_time = current_time

    # =============================
    # DISPLAY COUNT
    # =============================
    cv2.putText(
        annotated_frame,
        f"Potholes: {pothole_count}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 0, 255),
        2
    )

    cv2.imshow("🚗 Pothole Live Detection", annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
print("👋 Detection stopped")
