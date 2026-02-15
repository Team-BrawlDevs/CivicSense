# Deploy CivicSense Frontend on Netlify

This project is set up to deploy the **frontend** (CivicSense_Figma) to Netlify. The repo root includes a `netlify.toml` that points to the frontend subfolder.

## Option 1: Deploy from GitHub (recommended)

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Add Netlify config"
   git push origin main
   ```

2. **Log in to Netlify**: Go to [netlify.com](https://www.netlify.com) and sign in (GitHub is easiest).

3. **Add a new site**:
   - Click **Add new site** → **Import an existing project**.
   - Choose **GitHub** and authorize Netlify if needed.
   - Select the **CivicSense** repository.

4. **Build settings** (usually auto-filled from `netlify.toml`):
   - **Base directory:** `CivicSense_Figma`
   - **Build command:** `npm run build`
   - **Publish directory:** `build`

   If these are already set by the config file, you can leave them as is.

5. **Environment variables** (optional):
   - If your app uses a backend API, add:
     - Key: `VITE_API_URL`
     - Value: your API URL (e.g. `https://your-backend.onrender.com`)

6. Click **Deploy site**. Netlify will install dependencies, run `npm run build`, and publish the `build` folder.

7. After the first deploy you get a URL like `https://random-name-12345.netlify.app`. You can change it in **Site settings** → **Domain management**.

---

## Option 2: Deploy with Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Log in**:
   ```bash
   netlify login
   ```

3. **From the repo root** (`CivicSense`):
   ```bash
   netlify init
   ```
   - Choose “Create & configure a new site”.
   - Pick your team and a site name (or leave default).

4. **Deploy**:
   ```bash
   netlify deploy --prod
   ```
   Netlify will use the settings from `netlify.toml` (build from `CivicSense_Figma`, publish `build`).

---

## Backend (API)

The **Python/FastAPI backend** is not run on Netlify. Deploy it separately, for example:

- [Render](https://render.com) (Web Service)
- [Railway](https://railway.app)
- [Fly.io](https://fly.io)

Then set `VITE_API_URL` in Netlify to that backend URL so the frontend can call the API.

---

## SPA routing

The app uses hash-based routing (`#/overview`, `#/scenario-simulation`, etc.). The included redirect rule in `netlify.toml` sends all paths to `index.html` so the client router works. No extra setup is needed.
