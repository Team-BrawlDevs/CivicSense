# CivicSense Web App

React (Vite + TypeScript) frontend for the CivicSense ward-level digital twin platform. Implements the [Figma wireframes](https://www.figma.com/design/DQZ23LsHDtESkz9JnDax2v/CivicSense-Web-App-Wireframe).

## Running the app

```bash
npm install
npm run dev
```

Development server: **http://localhost:5173**

Production build: `npm run build`

## App flow

- **Landing** (`#` or `#landing`) – Entry page; “Enter dashboard” goes to ward selection.
- **Ward selection** (`#ward-selection`) – Choose a ward; on confirm, opens the dashboard with **Scenario Simulation** as the first page.
- **Dashboard** – Navbar + sidebar. First page is **Scenario Simulation**; other pages: Digital Ward Dashboard, Mobility, Drainage, Water, Power, Waste, Population, Public Services, Cross-System Impact, Scenario Comparison, Risk & Resilience, Data Sources.

## Main features

- **Scenario Simulation** – Define scenario (text or AI), block roads on the map, view blocked roads list, generate Policy Insights (AI reasoning, blocked roads summary, critical bottlenecks, policy suggestions).
- **Digital Ward Dashboard** – KPIs, map layers, active alerts (all sections expandable).
- **Other domain pages** – Placeholder/wireframe views for mobility, drainage, water, power, waste, population, public services, cross-system impact, scenario comparison, impact evaluation, data sources.

## Tech stack

- React 18, Vite, TypeScript
- Tailwind CSS, Radix UI, Lucide icons
- Leaflet / react-leaflet for maps
- Recharts for charts

The app expects the CivicSense **FastAPI backend** (e.g. `http://localhost:8000`) for scenario parsing, policy suggestions, and map data. See the root [README](../readme.md) and [INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md) for backend setup and API details.
