from ultralytics import YOLO
import cv2

# Load trained model
model = YOLO("ecowaste_model.pt")

# Average weights (grams)
weights = {
    "battery": 24,
    "can": 14,
    "cardboard": 120,
    "drink carton": 32,
    "glass bottle": 200,
    "paper": 5,
    "plastic bag": 6,
    "plastic bottle": 18,
    "plastic bottle cap": 2,
    "pop tab": 1
}

# Points for each waste type
points = {
    "battery": 15,
    "can": 8,
    "cardboard": 6,
    "drink carton": 6,
    "glass bottle": 10,
    "paper": 2,
    "plastic bag": 4,
    "plastic bottle": 7,
    "plastic bottle cap": 1,
    "pop tab": 1
}

cap = cv2.VideoCapture(0)

while True:

    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame)

    detected_counts = {}
    total_weight = 0
    total_points = 0

    for r in results:
        boxes = r.boxes

        for box in boxes:
            class_id = int(box.cls)
            label = model.names[class_id]

            detected_counts[label] = detected_counts.get(label, 0) + 1

    for waste_type, count in detected_counts.items():

        weight = weights.get(waste_type, 0)
        point = points.get(waste_type, 0)

        total_weight += weight * count
        total_points += point * count

    annotated_frame = results[0].plot()

    info = f"Weight: {total_weight} g | Points: {total_points}"

    cv2.putText(
        annotated_frame,
        info,
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )

    cv2.imshow("ECOWASTE Detection", annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
