# WhereIsProf

Real-time campus faculty locator, classroom updates, and QR-based attendance platform.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Socket.IO client, Html5 QR scanner
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.IO
- **Upload**: Cloudinary (via backend route)

---

## Core Features

- Faculty live status (`cabin`, `busy`, `in_classroom`, `logoff`) with socket sync
- Faculty Intelligence (search/filter faculty with multi-department support)
- Campus map with dynamic room blocks from rooms + class sessions
- Faculty broadcast updates (text + file/image attachments)
- Student updates feed with inline image rendering and file download
- QR attendance flow:
  - Faculty starts attendance session for timetable class
  - Rotating QR token refreshes every 10 seconds
  - Student scans QR and attendance is marked securely
  - Faculty gets live present/absent summary and attendee list
- Student-only device binding (single-device session control by fingerprint)
- Face-enforced attendance gate for students:
  - Face enrollment endpoint stores encrypted face template vectors (not raw image blobs)
  - Liveness + face verification required before QR scan
  - One-time face verification token is required by backend attendance scan API

---

## Project Structure

```text
WhereIsProf/
├─ src/                  # Frontend (React)
├─ server/               # Backend (Express + Mongo + Socket.IO)
│  ├─ controllers/
│  ├─ models/
│  ├─ routes/
│  ├─ config/
│  └─ server.js
├─ face-service/         # Face verification service (FastAPI + InsightFace + liveness)
└─ README.md
```

---

## Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- Cloudinary account (for attachment uploads)

---

## Environment Variables

Create env files from examples:

```bash
cp .env.example .env
cp server/.env.example server/.env
cp face-service/.env.example face-service/.env
```

### Frontend (`.env`)

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### Backend (`server/.env`)

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/whereisprof
JWT_SECRET=replace_with_secure_random_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FACE_SERVICE_URL=http://localhost:8000
FACE_SERVICE_SECRET=replace_with_shared_face_secret
```

### Face service (`face-service/.env`)

```env
FACE_SERVICE_SECRET=replace_with_shared_face_secret
FACE_MATCH_THRESHOLD=0.52
```

---

## Installation

### 1) Frontend

```bash
npm install
```

### 2) Backend

```bash
cd server
npm install
```

### 3) Face service

Option A (recommended): Docker

```bash
cd face-service
docker build -t whereisprof-face-service .
```

Option B: Python virtual environment

```bash
cd face-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Run Locally

Start in this order.

### 1) Start face service

Option A (Docker):

```bash
cd face-service
docker run --rm -p 8000:8000 --env-file .env whereisprof-face-service
```

Option B (venv):

```bash
cd face-service
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Face service runs on `http://localhost:8000`.

### 2) Start backend

```bash
cd server
npm run dev
```

Backend runs on `http://localhost:5001`.

### 3) Start frontend

```bash
# from project root
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## Key Routes

### Frontend

- `/` → Landing page
- `/login` → Login
- `/register` → Register
- `/locator` → Faculty Intelligence (protected)
- `/faculty` → Faculty dashboard (faculty only)
- `/attendance` → Attendance (student scan + faculty QR)
- `/updates` → Updates feed
- `/map` → Campus map
- `/classroom` → Timetable/class controls

### Backend (selected)

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/profile`
- `GET /api/users/faculty`
- `PUT /api/users/profile`
- `POST /api/broadcasts`
- `GET /api/broadcasts`
- `POST /api/uploads/broadcast-attachment`
- `GET /api/classroom/timetable`
- `POST /api/classroom/attendance/session/start`
- `GET /api/classroom/attendance/session/:id/token`
- `POST /api/classroom/attendance/scan`
- `GET /api/classroom/attendance/session/:id/summary`

---

## Device Binding (Student Only)

- Enforced by backend using `X-Device-Fingerprint`
- Same student account cannot be active across multiple devices simultaneously
- Same device cannot be used for multiple student accounts at once
- Faculty/admin are not restricted by this policy

---

## Troubleshooting

### 1) CORS error for `x-device-fingerprint`

If browser shows:
`Request header field x-device-fingerprint is not allowed...`

- Ensure backend is updated and restarted.
- `server/server.js` must include `X-Device-Fingerprint` in `allowedHeaders`.

### 2) Cloudinary upload error: `"Must supply api_key"`

- Confirm backend env vars are set in `server/.env`:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Restart backend after env change.
- Ensure backend starts from `server/` folder.

### 3) Legacy status enum validation errors

If login/save fails due to old status values (e.g. `available`), ensure backend is updated with compatibility mapping and restarted.

### 4) QR scanner opens but camera doesn’t start

- Allow camera permission in browser/site settings.
- Use HTTPS or `localhost`.
- Try mobile browser with back camera permissions enabled.

---

## Notes

- Department records are auto-seeded on backend startup.
- Broadcast image attachments render inline in student/faculty views.
- Attendance session summary updates periodically while active.

---

## License

Private/internal project (update as needed).
