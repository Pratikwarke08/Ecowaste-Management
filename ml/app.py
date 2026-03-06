import base64
import os
import tempfile
from typing import Dict, List

from flask import Flask, jsonify, request

from detect_waste import detect_waste

app = Flask(__name__)


def _decode_base64_to_temp_file(image_base64: str) -> str:
    normalized = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
    fd, path = tempfile.mkstemp(prefix="ecowaste_", suffix=".jpg")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(base64.b64decode(normalized))
    return path


def _get_input_value(data: Dict, key: str) -> float:
    value = data.get(key)
    if value is None:
        return 0.0
    try:
        return float(value)
    except Exception:
        return 0.0


def _calculate_depth_percentage(value: float, unit: str) -> float:
    if unit == "meter":
        return max(0.0, min(100.0, value * 10.0))
    return max(0.0, min(100.0, value))


def _count_items(detected: Dict) -> int:
    return len(detected.get("wasteItems", []))


def _compute_genuinity(
    pickup_result: Dict,
    before_result: Dict,
    after_result: Dict,
    weight_before_kg: float,
    weight_after_kg: float,
    depth_before_raw: float,
    depth_after_raw: float,
    depth_unit: str,
) -> Dict:
    reasons: List[str] = []
    checks: Dict[str, bool] = {}

    observed_weight_delta_grams = (weight_after_kg - weight_before_kg) * 1000.0
    depth_before_percentage = _calculate_depth_percentage(depth_before_raw, depth_unit)
    depth_after_percentage = _calculate_depth_percentage(depth_after_raw, depth_unit)
    depth_delta_percentage = depth_after_percentage - depth_before_percentage

    pickup_weight_range = pickup_result.get("estimatedWeightRangeGrams", {}) or {}
    expected_min = float(pickup_weight_range.get("min", 0))
    expected_max = float(pickup_weight_range.get("max", 0))

    image_count_before = _count_items(before_result)
    image_count_after = _count_items(after_result)
    image_count_delta = image_count_after - image_count_before

    checks["weight_non_negative"] = observed_weight_delta_grams >= 0
    checks["depth_non_negative"] = depth_delta_percentage >= 0
    checks["image_count_non_negative"] = image_count_delta >= 0

    if not checks["weight_non_negative"]:
        reasons.append("Weight decreased after disposal.")
    if not checks["depth_non_negative"]:
        reasons.append("Dustbin depth/capacity reduced after disposal.")
    if not checks["image_count_non_negative"]:
        reasons.append("Detected waste count reduced in after image.")

    # Compare measured weight against pickup-detected expected weight.
    if expected_min > 0:
        checks["weight_matches_expected_lower_bound"] = observed_weight_delta_grams >= expected_min * 0.35
        if not checks["weight_matches_expected_lower_bound"]:
            reasons.append("Weight increase is too low for detected pickup waste.")
    else:
        checks["weight_matches_expected_lower_bound"] = True

    if expected_max > 0:
        checks["weight_matches_expected_upper_bound"] = observed_weight_delta_grams <= expected_max * 3.0
        if not checks["weight_matches_expected_upper_bound"]:
            reasons.append("Weight increase is too high for detected pickup waste.")
    else:
        checks["weight_matches_expected_upper_bound"] = True

    checks["at_least_one_signal_increased"] = (
        observed_weight_delta_grams > 0
        or depth_delta_percentage > 0
        or image_count_delta > 0
    )
    if not checks["at_least_one_signal_increased"]:
        reasons.append("No increase observed across weight, depth, or image signals.")

    passed_checks = sum(1 for ok in checks.values() if ok)
    total_checks = len(checks) if checks else 1
    confidence_score = round((passed_checks / total_checks) * 100, 2)
    is_genuine = confidence_score >= 70 and checks["weight_non_negative"] and checks["depth_non_negative"] and checks["image_count_non_negative"]

    return {
        "isGenuine": is_genuine,
        "confidenceScore": confidence_score,
        "reasons": reasons,
        "checks": checks,
        "observed": {
            "weightDeltaGrams": round(observed_weight_delta_grams, 2),
            "depthBeforePercentage": round(depth_before_percentage, 2),
            "depthAfterPercentage": round(depth_after_percentage, 2),
            "depthDeltaPercentage": round(depth_delta_percentage, 2),
            "imageItemCountBefore": image_count_before,
            "imageItemCountAfter": image_count_after,
            "imageItemCountDelta": image_count_delta,
        },
        "expectedWeightRangeGrams": {
            "min": expected_min,
            "max": expected_max,
        },
    }


@app.get("/")
def root_health():
    return jsonify({"status": "ok", "service": "ecowaste-ml"})


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "ecowaste-ml"})


@app.get("/api/health")
def api_health():
    return jsonify({"status": "ok", "service": "ecowaste-ml"})


@app.post("/analyze-report")
def analyze_report():
    payload = request.get_json(silent=True) or {}

    pickup_image = payload.get("pickupImageBase64")
    dustbin_before_image = payload.get("dustbinBeforeImageBase64")
    dustbin_after_image = payload.get("dustbinAfterImageBase64")

    if not pickup_image:
        return jsonify({"error": "pickupImageBase64 is required"}), 400

    temp_files: List[str] = []
    try:
        pickup_path = _decode_base64_to_temp_file(pickup_image)
        temp_files.append(pickup_path)
        pickup_result = detect_waste(pickup_path)

        before_result = {"wasteItems": [], "totalPoints": 0, "confidenceMet": False, "estimatedWeightRangeGrams": {"min": 0, "max": 0}}
        after_result = {"wasteItems": [], "totalPoints": 0, "confidenceMet": False, "estimatedWeightRangeGrams": {"min": 0, "max": 0}}

        if dustbin_before_image:
            before_path = _decode_base64_to_temp_file(dustbin_before_image)
            temp_files.append(before_path)
            before_result = detect_waste(before_path)

        if dustbin_after_image:
            after_path = _decode_base64_to_temp_file(dustbin_after_image)
            temp_files.append(after_path)
            after_result = detect_waste(after_path)

        weight_before_kg = _get_input_value(payload, "dustbinWeightBeforeKg")
        weight_after_kg = _get_input_value(payload, "dustbinWeightAfterKg")
        depth_before_raw = _get_input_value(payload, "dustbinDepthBefore")
        depth_after_raw = _get_input_value(payload, "dustbinDepthAfter")
        depth_unit = payload.get("dustbinDepthUnit", "meter")

        genuinity = _compute_genuinity(
            pickup_result=pickup_result,
            before_result=before_result,
            after_result=after_result,
            weight_before_kg=weight_before_kg,
            weight_after_kg=weight_after_kg,
            depth_before_raw=depth_before_raw,
            depth_after_raw=depth_after_raw,
            depth_unit=depth_unit,
        )

        return jsonify({
            "pickupAnalysis": pickup_result,
            "dustbinBeforeAnalysis": before_result,
            "dustbinAfterAnalysis": after_result,
            "genuinity": genuinity,
            "totalPoints": pickup_result.get("totalPoints", 0)
        })
    except Exception as err:
        return jsonify({"error": f"ML analysis failed: {str(err)}"}), 500
    finally:
        for temp_file in temp_files:
            try:
                os.remove(temp_file)
            except OSError:
                pass


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    app.run(host="0.0.0.0", port=port)
