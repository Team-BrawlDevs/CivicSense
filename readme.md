# CivicSense 🏙️

### Ward-Level Digital Twin for Urban Policy Simulation

CivicSense is a **ward-level digital twin platform** that helps urban planners and policymakers **simulate, analyze, and evaluate policy decisions** before real-world execution.

The system models a city ward as an interconnected digital environment and enables _what-if_ analysis across urban infrastructure. This repository includes a **Proof of Concept (PoC)** focused on **road-closure-based traffic impact simulation**, plus a **React web app** aligned with the full platform wireframes.

---

## 📁 Project Structure

| Path | Description |
|------|-------------|
| `backend/` | **FastAPI** server – exposes roads, POIs, path calculation, and scenario parsing as REST APIs |
| `CivicSense_Figma/` | **React (Vite)** web app – dashboard, scenario simulation, and map-based UI from Figma wireframes |
| `frontend/` | Legacy **HTML/JS** map UI (optional) |
| `app.py` | **Streamlit** app – original PoC UI (optional) |

- **Primary integration:** The React app in `CivicSense_Figma/` talks to the FastAPI backend for Scenario Simulation and map data.
- See **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** for API details and **[FEATURES_INTEGRATION.md](FEATURES_INTEGRATION.md)** for feature coverage.

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** (backend)
- **Node.js 18+** (React frontend)
- (Optional) **Gemini API key** for AI-powered scenario parsing – set `GEMINI_API_KEY` or use `apikey.txt` in the project root

### 1. Backend (FastAPI)

```bash
# From project root
pip install -r requirements.txt
pip install fastapi uvicorn   # if not already in requirements

cd backend
uvicorn main:app --reload --port 8000
```

API base: **http://localhost:8000**

### 2. Frontend (React)

```bash
cd CivicSense_Figma
npm install
npm run dev
```

App URL: **http://localhost:5173** (Vite default)

### 3. (Optional) Streamlit PoC

```bash
pip install streamlit
streamlit run app.py
```

---

## 🎨 UI / UX Wireframes

The full CivicSense platform UI is designed in Figma. The **CivicSense_Figma** app implements these wireframes as a React application.

🔗 **Figma wireframe:**  
https://www.figma.com/make/DQZ23LsHDtESkz9JnDax2v/CivicSense-Web-App-Wireframe?t=jTAV2iWMVbSGg6We-1

Implemented views include:

- **Digital Ward Dashboard** – KPIs, map layers, active alerts (collapsible panels)
- **Scenario Simulation** – Text-to-simulation (keywords or AI), click-to-block roads, start/end route selection, path comparison
- **Mobility & Transportation** – Before/after metrics, heatmaps, rerouted paths
- **Other domain pages** – Drainage, Water, Power, Waste, Population, Public Services, Cross-System Impact, Scenario Comparison, Risk & Resilience, Data Sources

---

## 🔍 What This PoC Demonstrates

- Conversion of a real-world ward road network (OpenStreetMap) into a digital graph
- **Policy intervention** simulation (e.g. road closures)
- Recalculation of routes and impact (distance, unreachable detection)
- **Text-to-simulation** – natural language or AI (Gemini) to block roads by scenario
- Interactive map: click roads to block, set start/end for path comparison
- Visualization of original vs new path and policy impact metrics

End-to-end flow:

> **Digital modeling → Policy intervention → Simulation → Impact evaluation**

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Python, FastAPI, OSMnx, NetworkX, GeoPandas, Shapely |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Radix UI |
| **Maps** | Leaflet, react-leaflet |
| **Data** | OpenStreetMap (OSM) |
| **AI (optional)** | Google Gemini for scenario parsing |

---

## 🚧 Planned Features (Work in Progress)

These are part of the full vision and are **WIP**:

- **Drainage & flood risk** – Drainage network, rainfall stress, flood zones
- **Water supply** – Demand modeling, supply stress, disruption risk
- **Power & utilities** – Load modeling, overload simulation, cascades
- **Waste management** – Generation modeling, collection routes, overflow risk
- **Population & demographics** – Growth/migration, density hotspots, capacity stress
- **Public services & emergency** – Accessibility, response times, failure-first analysis
- **Cross-system impact** – Cascading effects, interdependency views, resilience scoring
- **Visualization & decision support** – Multi-layer dashboard, scenario comparison, risk classification

---

## 🧠 Why This PoC Matters

- Shows that ward-scale urban systems can be modeled and simulated digitally
- Enables policy experimentation without real-world risk
- Provides a base for scaling to multi-domain urban systems
- Supports data-driven governance and decision support

---

## ⚠️ Disclaimer

This repository is an **early-stage Proof of Concept**. The **road-closure traffic simulation** and **Scenario Simulation** flow are implemented; other domains are under design and development (**WIP**).

---

## 📌 License

MIT License (or update as applicable)

---

## 🤝 Contributions

Contributions, ideas, and discussions are welcome. Open an issue to propose enhancements or report bugs.
