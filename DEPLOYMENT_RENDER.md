## Render Deployment Split

Deploy as 4 services from the same repo:

1. `frontend` (main web app)
2. `backend` (Node API)
3. `ml` (Python model API)
4. `virtual-dustbin` (dustbin input web app)

### 1) ML Service
- Root Directory: `ml`
- Build Command: `pip install -r requirements.txt`
- Start Command: `python app.py`
- Env:
  - `PORT` (Render sets automatically)

### 2) Backend Service
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Env:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `FRONTEND_ORIGIN` (comma-separated origins supported)
  - `VIRTUAL_DUSTBIN_ORIGIN`
  - `ML_SERVICE_URL` (example: `https://ecowaste-ml.onrender.com`)
  - `VIRTUAL_DUSTBIN_KEY` (optional secret for virtual dustbin endpoint)
  - `POINTS_PER_KG` (optional)

### 3) Main Frontend Service
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run preview -- --host 0.0.0.0 --port $PORT`
- Env:
  - `VITE_API_URL` (backend public URL, no trailing `/api`)
  - `VITE_VIRTUAL_DUSTBIN_URL` (public URL of virtual-dustbin frontend)

### 4) Virtual Dustbin Frontend Service
- Root Directory: `virtual-dustbin`
- Build Command: `npm install && npm run build`
- Start Command: `npm run preview -- --host 0.0.0.0 --port $PORT`
- Env:
  - `VITE_API_URL` (backend public URL, no trailing `/api`)
  - `VITE_VIRTUAL_DUSTBIN_KEY` (must match backend `VIRTUAL_DUSTBIN_KEY` if enabled)

## New Endpoint for Virtual Dustbin

`POST /api/reports/:id/virtual-dustbin`

Body:
```json
{
  "beforeImageBase64": "<base64>",
  "afterImageBase64": "<base64>",
  "weightBeforeKg": 12.3,
  "weightAfterKg": 13.1,
  "depthBefore": 2.1,
  "depthAfter": 2.9,
  "depthUnit": "meter"
}
```

Header (optional, if backend `VIRTUAL_DUSTBIN_KEY` configured):
- `x-virtual-dustbin-key: <secret>`

Context bootstrap endpoint used when launched from frontend pickup image:

`GET /api/reports/:id/virtual-dustbin/context`
