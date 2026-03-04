from ultralytics import YOLO
import sys
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
MODEL_PATH = SCRIPT_DIR / "best.pt"
model = YOLO(str(MODEL_PATH))

POINTS = {
    "ConstructionWaste": 8,
    "GeneralWaste": 5,
    "GreenWaste": 4,
    "HazardousWaste": 20,
    "MedicalWaste": 25,
    "OrganicWaste": 3,
    "RecyclebleWaste": 10
}


def detect_waste(image_path):
    results = model(image_path, conf=0.25, verbose=False)

    waste_items = []
    total_points = 0

    for r in results:
        boxes = r.boxes
        if boxes is None:
            continue

        for i in range(len(boxes.cls)):
            class_id = int(boxes.cls[i])
            class_name = model.names[class_id]
            confidence = float(boxes.conf[i])

            bbox = boxes.xyxy[i].tolist() if boxes.xyxy is not None else []

            item_points = POINTS.get(class_name, 0)
            total_points += item_points

            waste_items.append({
                "class_name": class_name,
                "confidence": confidence,
                "bbox": bbox,
                "points": item_points
            })

    return {
        "wasteItems": waste_items,
        "totalPoints": total_points,
        "confidenceMet": len(waste_items) > 0
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "image path required"}))
        sys.exit(1)

    image_path = sys.argv[1]
    result = detect_waste(image_path)

    print(json.dumps(result))
