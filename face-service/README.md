# Face Service (FastAPI + InsightFace)

This service provides secure face enrollment and verification for attendance gating.

## Endpoints
- `GET /health`
- `POST /face/enroll`
- `POST /face/verify`

All POST endpoints require `x-face-service-secret` header.

## Environment Variables
- `FACE_SERVICE_SECRET` (required)
- `FACE_MATCH_THRESHOLD` (default `0.52`)

## Local Run
```bash
cd face-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
