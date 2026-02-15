# Deploy CivicSense Backend on Railway

This guide walks through deploying the **FastAPI backend** (`backend/`) on [Railway](https://railway.app). The backend serves the CivicSense API used by the React frontend.

## Prerequisites

- Code pushed to **GitHub** (Railway deploys from Git).
- A **Railway** account: [railway.app](https://railway.app) (sign in with GitHub).

---

## 1. Create a new project on Railway

1. Go to [railway.app](https://railway.app) and log in.
2. Click **Start a New Project**.
3. Choose **Deploy from GitHub repo**.
4. Select your **CivicSense** repository (authorize Railway if needed).
5. Railway will add the repo. Do **not** deploy yet—configure the service first.

---

## 2. Configure the backend service

### Set the root directory

The backend code lives in the `backend/` subfolder. Railway must run from that folder.

1. Open the new **Service** (the card that was created).
2. Go to **Settings**.
3. Under **Build**, set **Root Directory** to:
   ```text
   backend
   ```
4. Save. Railway will now run all build and start commands from `backend/`.

### Build and start commands

Railway will usually detect Python and use `backend/requirements.txt` and `backend/Procfile`:

- **Build:** installs from `requirements.txt` (no custom command needed unless you add one).
- **Start:** from `Procfile`: `uvicorn main:app --host 0.0.0.0 --port $PORT`.

If your service does **not** use the Procfile:

1. In **Settings** → **Deploy**, set **Start Command** to:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
2. Leave **Build Command** empty (Railway will run `pip install -r requirements.txt` by default).

### Optional: Nixpacks build command

If you need to force a clean install:

- **Build Command:** `pip install -r requirements.txt`

---

## 3. Environment variables

Set these in **Variables** (or **Settings** → **Variables**).

| Variable           | Required | Description |
|--------------------|----------|-------------|
| `GEMINI_API_KEY`   | Optional | Google Gemini API key for scenario parsing and policy suggestions. Without it, some AI features fall back to rule-based behavior. |
| `GOOGLE_API_KEY`   | Optional | Same as above (backend checks both). |

To add a variable:

1. Open your service → **Variables**.
2. Click **New Variable**.
3. Add `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) and paste your key.

Get a key: [Google AI Studio](https://aistudio.google.com/apikey).

---

## 4. Deploy

1. Trigger a deploy: **Deploy** (or push a commit to the linked branch).
2. Wait for the build to finish (first run can take a few minutes because of `geopandas` / `osmnx`).
3. Open **Settings** → **Networking** → **Generate Domain**.
4. Copy the URL (e.g. `https://your-service.up.railway.app`).

Your API is available at that URL, e.g.:

- `https://your-service.up.railway.app/docs` — Swagger UI  
- `https://your-service.up.railway.app/api/roads/geojson` — example endpoint  

---

## 5. Connect the frontend to the deployed API

In your **frontend** (e.g. Netlify or local):

1. Set the API base URL to your Railway URL.
2. **Netlify:** Site **Settings** → **Environment variables** → add:
   - **Key:** `VITE_API_URL`  
   - **Value:** `https://your-service.up.railway.app`  
   (no trailing slash)
3. **Local:** In `CivicSense_Figma/.env`:
   ```env
   VITE_API_URL=https://your-service.up.railway.app
   ```
4. Redeploy the frontend (or restart `npm run dev`) so it uses the new API.

---

## 6. CORS

The backend already allows all origins (`allow_origins=["*"]`). If you later restrict origins, add your Netlify (or production) frontend URL.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| Build fails on `geopandas` / `osmnx` | First deploy can take 5–10 minutes. Ensure **Root Directory** is `backend` and `backend/requirements.txt` exists. |
| 503 or “Application failed to respond” | Confirm **Start Command** is `uvicorn main:app --host 0.0.0.0 --port $PORT` and Root Directory is `backend`. |
| API returns 404 | Call paths with the `/api/...` prefix (e.g. `/api/roads/geojson`). Check **Generate Domain** is done and you use the HTTPS URL. |
| GenAI features don’t work | Set `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) in Railway **Variables** and redeploy. |

---

## Summary

- **Root Directory:** `backend`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT` (or use `backend/Procfile`)
- **Variables:** `GEMINI_API_KEY` or `GOOGLE_API_KEY` (optional)
- **Frontend:** Set `VITE_API_URL` to your Railway API URL (e.g. `https://your-service.up.railway.app`)
