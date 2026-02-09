# CivicSense Backend Integration Guide

This guide explains how to integrate the Streamlit backend functionality with the React frontend.

## Architecture

- **Backend**: FastAPI (`backend/main.py`) - Exposes all Streamlit functionality as REST APIs
- **Frontend**: React (`CivicSense_Figma/`) - Consumes backend APIs via service layer
- **Integration Point**: `ScenarioConfigPage` component - The Scenario Simulation page

## Setup Instructions

### 1. Install Dependencies

#### Backend Dependencies
The backend uses the existing `requirements.txt`. Ensure you have:
```bash
pip install fastapi uvicorn osmnx networkx geopandas shapely google-generativeai
```

#### Frontend Dependencies
Navigate to `CivicSense_Figma` and install:
```bash
cd CivicSense_Figma
npm install
```

This will install the newly added dependencies:
- `leaflet` - Map library
- `react-leaflet` - React bindings for Leaflet
- `@types/leaflet` - TypeScript types

### 2. Configure Environment Variables

Create a `.env` file in `CivicSense_Figma` (or set environment variables):
```env
VITE_API_URL=http://localhost:8000
```

Or update `src/services/api.ts` to change the default API URL.

### 3. Start the Backend

```bash
# From project root
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### 4. Start the Frontend

```bash
# From CivicSense_Figma directory
npm run dev
```

The React app will typically run on `http://localhost:5173` (Vite default)

## API Endpoints

The backend exposes the following endpoints:

### Map Data
- `GET /api/roads/geojson` - Get all roads as GeoJSON
- `GET /api/pois/geojson` - Get POIs (Points of Interest) as GeoJSON
- `GET /api/critical-roads/geojson` - Get critical roads as GeoJSON
- `GET /api/drainage/geojson` - Get drainage features as GeoJSON

### Scenario Simulation
- `POST /api/scenario/parse` - Parse natural language scenario description
- `POST /api/scenario/blocked-edges` - Get blocked edges for a scenario
- `POST /api/path/calculate` - Calculate shortest path with blocked edges

### Map Interaction
- `POST /api/map/nearest-node` - Find nearest node to coordinates
- `POST /api/map/nearest-edge` - Find nearest edge to coordinates
- `POST /api/simulate/edge` - Simulate blocking a single edge

## Usage in React

### ScenarioConfigPage Integration

The `ScenarioConfigPage` component now:

1. **Loads map data on mount** - Fetches roads, POIs, critical roads, and drainage
2. **Accepts scenario text input** - Users can type natural language scenarios
3. **Parses scenarios** - Uses keyword-based parser (or LLM if configured)
4. **Visualizes blocked edges** - Shows which roads are blocked on the map
5. **Calculates paths** - Users can click on map to set start/end points and see detour paths

### Example Usage

```typescript
import { parseScenario, getBlockedEdges, calculatePath } from '../services/api';

// Parse a scenario
const result = await parseScenario("Simulate a flash flood near the market that blocks all minor roads");

// Get blocked edges
const blocked = await getBlockedEdges("block minor roads near market");

// Calculate path
const path = await calculatePath(startNode, endNode, blockedEdges);
```

## Features Integrated

✅ **Text-to-Simulation**: Natural language scenario parsing  
✅ **Road Network Visualization**: Interactive Leaflet map  
✅ **POI Display**: Schools, hospitals, and other public services  
✅ **Critical Roads**: Highlighted based on betweenness centrality  
✅ **Drainage Features**: OSM drainage and synthetic drainage  
✅ **Path Calculation**: Shortest path with blocked edges  
✅ **Real-time Updates**: Map updates as scenarios are parsed  

## File Structure

```
CivicSense/
├── backend/
│   └── main.py                 # Enhanced FastAPI backend
├── CivicSense_Figma/
│   ├── src/
│   │   ├── services/
│   │   │   └── api.ts         # API service layer
│   │   ├── components/
│   │   │   ├── MapView.tsx    # Leaflet map component
│   │   │   └── pages/
│   │   │       └── ScenarioConfigPage.tsx  # Integrated scenario page
│   │   └── main.tsx           # Entry point (with Leaflet CSS)
│   └── package.json           # Updated with Leaflet dependencies
└── INTEGRATION_GUIDE.md       # This file
```

## Troubleshooting

### Backend not starting
- Check if port 8000 is available
- Verify all Python dependencies are installed
- Check for errors in the terminal

### Frontend can't connect to backend
- Verify backend is running on `http://localhost:8000`
- Check CORS settings in `backend/main.py`
- Verify `VITE_API_URL` environment variable

### Map not displaying
- Ensure Leaflet CSS is imported (check `main.tsx`)
- Check browser console for errors
- Verify map data is loading (check Network tab)

### Scenario parsing fails
- Check if scenario text is not empty
- Verify backend API is responding
- Check browser console for error messages

## Next Steps

1. **Add LLM Support**: Enable Gemini API for better scenario parsing
2. **Enhance Map Features**: Add markers for blocked edges, start/end points
3. **Add More Visualizations**: Show impact metrics, risk scores
4. **Improve Error Handling**: Better user feedback for API errors
5. **Add Caching**: Cache map data to reduce API calls

## Notes

- The backend loads all map data on startup (cached in memory)
- The frontend fetches map data once on component mount
- Scenario parsing uses keyword matching by default (no API key needed)
- LLM parsing requires Gemini API key in `apikey.txt` or environment variable
