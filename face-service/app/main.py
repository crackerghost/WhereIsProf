import base64
import os
from typing import List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="WhereIsProf Face Service", version="1.0.0")

FACE_SERVICE_SECRET = os.getenv("FACE_SERVICE_SECRET", "")
FACE_MATCH_THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.52"))
LIVENESS_MIN_SCORE = float(os.getenv("LIVENESS_MIN_SCORE", "0.38"))

_face_model = None
_model_error = None
_face_mesh = None

EYE_LEFT = [33, 160, 158, 133, 153, 144]
EYE_RIGHT = [362, 385, 387, 263, 373, 380]
NOSE_TIP = 1
LEFT_EYE_OUTER = 33
RIGHT_EYE_OUTER = 263


class EnrollRequest(BaseModel):
    userId: str
    images: List[str] = Field(min_length=1, max_length=6)


class VerifyRequest(BaseModel):
    userId: str
    images: List[str] = Field(min_length=8, max_length=20)
    template: List[float] = Field(min_length=128)


def _load_model():
    global _face_model, _model_error, _face_mesh
    try:
        from insightface.app import FaceAnalysis
        face_mesh_ctor = None
        mp_import_errors = []

        # Variant 1: common mediapipe API
        try:
            import mediapipe as mp  # type: ignore

            face_mesh_ctor = mp.solutions.face_mesh.FaceMesh
        except Exception as exc:
            mp_import_errors.append(f"mediapipe as mp failed: {exc}")

        # Variant 2: explicit solutions import
        if face_mesh_ctor is None:
            try:
                from mediapipe import solutions as mp_solutions  # type: ignore

                face_mesh_ctor = mp_solutions.face_mesh.FaceMesh
            except Exception as exc:
                mp_import_errors.append(f"mediapipe.solutions failed: {exc}")

        # Variant 3: legacy internal path
        if face_mesh_ctor is None:
            try:
                from mediapipe.python.solutions.face_mesh import FaceMesh as face_mesh_ctor  # type: ignore
            except Exception as exc:
                mp_import_errors.append(f"mediapipe.python.solutions failed: {exc}")

        if face_mesh_ctor is None:
            # Keep service available with fallback liveness path when MediaPipe is unavailable.
            _model_error = "MediaPipe FaceMesh import failed: " + " | ".join(mp_import_errors)

        model = FaceAnalysis(name="buffalo_l")
        model.prepare(ctx_id=-1, det_size=(640, 640))
        _face_model = model
        if face_mesh_ctor is not None:
            _face_mesh = face_mesh_ctor(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
    except Exception as exc:
        _model_error = str(exc)


@app.on_event("startup")
def startup_event():
    _load_model()


@app.get("/health")
def health():
    return {
        "ok": True,
        "modelLoaded": _face_model is not None,
        "modelError": _model_error,
        "threshold": FACE_MATCH_THRESHOLD,
        "livenessMinScore": LIVENESS_MIN_SCORE,
    }


def _assert_authorized(secret: Optional[str]):
    if not FACE_SERVICE_SECRET:
        raise HTTPException(status_code=500, detail="FACE_SERVICE_SECRET is not configured")
    if secret != FACE_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized face service request")


def _decode_image(data_uri: str) -> np.ndarray:
    try:
        payload = data_uri.split(",", 1)[1] if "," in data_uri else data_uri
        raw = base64.b64decode(payload)
        arr = np.frombuffer(raw, dtype=np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Invalid image")
        return image
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image payload: {exc}") from exc


def _extract_embedding(image: np.ndarray) -> np.ndarray:
    if _face_model is None:
        raise HTTPException(status_code=503, detail=f"Face model unavailable: {_model_error or 'load failure'}")

    faces = _face_model.get(image)
    if not faces:
        raise HTTPException(status_code=400, detail="No face detected")

    # Pick largest detected face for stability.
    largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    emb = np.array(largest.embedding, dtype=np.float32)
    norm = np.linalg.norm(emb)
    if norm == 0:
        raise HTTPException(status_code=400, detail="Invalid face embedding")
    return emb / norm


def _mean_embedding(images: List[str]) -> np.ndarray:
    vectors = [_extract_embedding(_decode_image(img)) for img in images]
    stacked = np.vstack(vectors)
    mean_vec = np.mean(stacked, axis=0)
    norm = np.linalg.norm(mean_vec)
    if norm == 0:
        raise HTTPException(status_code=400, detail="Invalid averaged embedding")
    return mean_vec / norm


def _distance(a, b):
    return float(np.linalg.norm(np.array(a, dtype=np.float32) - np.array(b, dtype=np.float32)))


def _eye_aspect_ratio(landmarks, eye_indices):
    pts = [(landmarks[i].x, landmarks[i].y) for i in eye_indices]
    horizontal = _distance(pts[0], pts[3]) + 1e-6
    vertical = _distance(pts[1], pts[5]) + _distance(pts[2], pts[4])
    return vertical / (2.0 * horizontal)


def _analyze_liveness(images: List[str]):
    if _face_model is None:
        raise HTTPException(status_code=503, detail=f"Face model unavailable: {_model_error or 'load failure'}")

    if _face_mesh is None:
        # Fallback liveness without MediaPipe: uses InsightFace detection dynamics.
        yaws = []
        motion = []
        sharpness = []
        bbox_areas = []
        prev_gray = None

        for image_str in images:
            frame = _decode_image(image_str)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = _face_model.get(frame)
            if not faces:
                raise HTTPException(status_code=400, detail="No face detected for liveness")

            f = max(faces, key=lambda face: (face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1]))
            x1, y1, x2, y2 = f.bbox
            area = max(1.0, float((x2 - x1) * (y2 - y1)))
            bbox_areas.append(area)

            # 5-point landmarks: [left_eye, right_eye, nose, left_mouth, right_mouth]
            kps = np.array(f.kps, dtype=np.float32)
            left_eye = kps[0]
            right_eye = kps[1]
            nose = kps[2]
            eye_dist = max(_distance(left_eye, right_eye), 1e-6)
            yaws.append(float((nose[0] - ((left_eye[0] + right_eye[0]) / 2.0)) / eye_dist))

            if prev_gray is not None:
                diff = cv2.absdiff(gray, prev_gray)
                motion.append(float(np.mean(diff)))
            prev_gray = gray

            sharpness.append(float(cv2.Laplacian(gray, cv2.CV_64F).var()))

        yaw_range = float(max(yaws) - min(yaws)) if yaws else 0.0
        motion_median = float(np.median(motion)) if motion else 0.0
        sharpness_mean = float(np.mean(sharpness)) if sharpness else 0.0
        area_ratio = float((max(bbox_areas) / max(min(bbox_areas), 1.0))) if bbox_areas else 1.0

        turn_detected = yaw_range > 0.06
        motion_detected = motion_median > 0.7
        texture_ok = sharpness_mean > 14.0
        depth_variation = area_ratio > 1.015

        score = (
            min(1.0, max(0.0, (yaw_range / 0.16))) +
            min(1.0, max(0.0, (motion_median / 4.0))) +
            min(1.0, max(0.0, (sharpness_mean / 120.0))) +
            min(1.0, max(0.0, ((area_ratio - 1.0) / 0.12)))
        ) / 4.0

        passed = (turn_detected or depth_variation) and motion_detected and texture_ok and score >= LIVENESS_MIN_SCORE
        return {
            "passed": passed,
            "blinkDetected": None,
            "turnDetected": turn_detected,
            "motionDetected": motion_detected,
            "textureOk": texture_ok,
            "depthVariation": depth_variation,
            "score": round(float(score), 4),
            "fallbackMode": "insightface-dynamics",
            "metrics": {
                "yawRange": round(yaw_range, 4),
                "motionMedian": round(motion_median, 4),
                "sharpnessMean": round(sharpness_mean, 2),
                "bboxAreaRatio": round(area_ratio, 4),
            },
        }

    ears = []
    yaws = []
    motion = []
    sharpness = []
    prev_gray = None

    for image_str in images:
        frame = _decode_image(image_str)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = _face_mesh.process(rgb)
        if not result.multi_face_landmarks:
            raise HTTPException(status_code=400, detail="No face landmarks detected for liveness")

        lm = result.multi_face_landmarks[0].landmark
        ear_l = _eye_aspect_ratio(lm, EYE_LEFT)
        ear_r = _eye_aspect_ratio(lm, EYE_RIGHT)
        ears.append((ear_l + ear_r) / 2.0)

        nose_x = lm[NOSE_TIP].x
        left_x = lm[LEFT_EYE_OUTER].x
        right_x = lm[RIGHT_EYE_OUTER].x
        eye_dist = max(abs(right_x - left_x), 1e-6)
        yaws.append((nose_x - ((left_x + right_x) / 2.0)) / eye_dist)

        if prev_gray is not None:
            diff = cv2.absdiff(gray, prev_gray)
            motion.append(float(np.mean(diff)))
        prev_gray = gray

        sharpness.append(float(cv2.Laplacian(gray, cv2.CV_64F).var()))

    if len(ears) < 6:
        raise HTTPException(status_code=400, detail="Insufficient frames for liveness analysis")

    ear_min = float(min(ears))
    ear_max = float(max(ears))
    ear_drop = ear_max - ear_min
    blink_detected = ear_min < 0.22 and ear_drop > 0.03 and ear_max > 0.23

    yaw_range = float(max(yaws) - min(yaws))
    turn_detected = yaw_range > 0.07

    motion_median = float(np.median(motion)) if motion else 0.0
    motion_detected = motion_median > 0.75

    sharpness_mean = float(np.mean(sharpness)) if sharpness else 0.0
    texture_ok = sharpness_mean > 16.0

    score = (
        min(1.0, max(0.0, (ear_drop / 0.08))) +
        min(1.0, max(0.0, (yaw_range / 0.18))) +
        min(1.0, max(0.0, (motion_median / 4.0))) +
        min(1.0, max(0.0, (sharpness_mean / 120.0)))
    ) / 4.0

    passed = (blink_detected or turn_detected) and motion_detected and texture_ok and score >= LIVENESS_MIN_SCORE
    return {
        "passed": passed,
        "blinkDetected": blink_detected,
        "turnDetected": turn_detected,
        "motionDetected": motion_detected,
        "textureOk": texture_ok,
        "score": round(float(score), 4),
        "metrics": {
            "earMin": round(ear_min, 4),
            "earMax": round(ear_max, 4),
            "earDrop": round(ear_drop, 4),
            "yawRange": round(yaw_range, 4),
            "motionMedian": round(motion_median, 4),
            "sharpnessMean": round(sharpness_mean, 2),
        },
    }


@app.post("/face/enroll")
def face_enroll(payload: EnrollRequest, x_face_service_secret: Optional[str] = Header(default=None)):
    _assert_authorized(x_face_service_secret)

    template = _mean_embedding(payload.images)
    return {
        "userId": payload.userId,
        "template": template.astype(float).tolist(),
        "modelVersion": "insightface-buffalo_l",
    }


@app.post("/face/verify")
def face_verify(payload: VerifyRequest, x_face_service_secret: Optional[str] = Header(default=None)):
    _assert_authorized(x_face_service_secret)

    liveness = _analyze_liveness(payload.images)
    live = _mean_embedding(payload.images)
    base = np.array(payload.template, dtype=np.float32)
    base_norm = np.linalg.norm(base)
    if base_norm == 0:
        raise HTTPException(status_code=400, detail="Invalid stored face template")
    base = base / base_norm

    confidence = float(np.dot(live, base))
    matched = confidence >= FACE_MATCH_THRESHOLD and liveness["passed"]

    return {
        "userId": payload.userId,
        "matched": matched,
        "confidence": round(confidence, 4),
        "liveness": liveness,
        "threshold": FACE_MATCH_THRESHOLD,
        "modelVersion": "insightface-buffalo_l",
    }
