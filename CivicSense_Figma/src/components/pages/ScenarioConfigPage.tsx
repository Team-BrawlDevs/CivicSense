import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Layers
} from 'lucide-react';
import { EnhancedMapView } from '../EnhancedMapView';
import {
  fetchRoadsGeoJSON,
  fetchPOIsGeoJSON,
  fetchCriticalRoadsGeoJSON,
  fetchDrainageGeoJSON,
  parseScenario,
  getBlockedEdges,
  calculatePath,
  findNearestNode,
  type GeoJSONCollection,
  type ScenarioIntent,
} from '../../services/api';

export function ScenarioConfigPage() {
  // Map data state
  const [roadsGeoJSON, setRoadsGeoJSON] = useState<GeoJSONCollection | null>(null);
  const [poisGeoJSON, setPOIsGeoJSON] = useState<GeoJSONCollection | null>(null);
  const [criticalRoadsGeoJSON, setCriticalRoadsGeoJSON] = useState<GeoJSONCollection | null>(null);
  const [drainageGeoJSON, setDrainageGeoJSON] = useState<GeoJSONCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(true);
  const [showPOIs, setShowPOIs] = useState(true);
  const [showCriticalRoads, setShowCriticalRoads] = useState(true);
  const [showDrainage, setShowDrainage] = useState(true);

  // Scenario state
  const [scenarioText, setScenarioText] = useState('');
  const [isParsingScenario, setIsParsingScenario] = useState(false);
  const [scenarioIntent, setScenarioIntent] = useState<ScenarioIntent | null>(null);
  const [scenarioMessage, setScenarioMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [useLLM, setUseLLM] = useState(false);

  // Route simulation state
  const [startNode, setStartNode] = useState<number | null>(null);
  const [endNode, setEndNode] = useState<number | null>(null);
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [blockedEdges, setBlockedEdges] = useState<[number, number][]>([]);
  const [originalPath, setOriginalPath] = useState<number[] | null>(null);
  const [originalLength, setOriginalLength] = useState<number>(0);
  const [currentPath, setCurrentPath] = useState<number[] | null>(null);
  const [currentLength, setCurrentLength] = useState<number>(0);
  const [originalPathCoords, setOriginalPathCoords] = useState<[number, number][]>([]);
  const [newPathCoords, setNewPathCoords] = useState<[number, number][]>([]);
  const [isCalculatingPath, setIsCalculatingPath] = useState(false);

  // Simulation result (for single road click)
  const [simulationResult, setSimulationResult] = useState<string>('Click any road or set start/end points');

  // Load map data on mount
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setIsLoading(true);
        const [roads, pois, critical, drainage] = await Promise.all([
          fetchRoadsGeoJSON(),
          fetchPOIsGeoJSON(),
          fetchCriticalRoadsGeoJSON(),
          fetchDrainageGeoJSON(),
        ]);
        setRoadsGeoJSON(roads);
        setPOIsGeoJSON(pois);
        setCriticalRoadsGeoJSON(critical);
        setDrainageGeoJSON(drainage);
      } catch (error) {
        console.error('Failed to load map data:', error);
        setScenarioMessage({ kind: 'error', text: `Failed to load map data: ${error instanceof Error ? error.message : 'Unknown error'}` });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMapData();
  }, []);

  // Handle scenario parsing (Text-to-Simulation)
  const handleRunScenario = async () => {
    if (!scenarioText.trim()) {
      setScenarioMessage({ kind: 'error', text: 'Please enter a scenario description.' });
      return;
    }

    try {
      setIsParsingScenario(true);
      setScenarioMessage(null);

      // Parse scenario
      const parseResult = await parseScenario(scenarioText, useLLM);
      setScenarioIntent(parseResult.intent);

      // Get blocked edges
      const blockedResult = await getBlockedEdges(scenarioText, useLLM);
      setBlockedEdges(blockedResult.blocked_edges);

      const aiNote = useLLM ? '✨ AI' : '✓';
      setScenarioMessage({
        kind: 'success',
        text: `${aiNote} Blocked ${blockedResult.blocked_edges.length} roads (${parseResult.intent.road_filter} near ${parseResult.intent.location_type}).`
      });

      // Recalculate path if start/end are set
      if (startNode && endNode) {
        await recalculatePath(startNode, endNode, blockedResult.blocked_edges);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setScenarioMessage({ kind: 'error', text: errorMsg });
    } finally {
      setIsParsingScenario(false);
    }
  };

  // Handle road click (block road)
  const handleRoadClick = async (u: number, v: number) => {
    const edge: [number, number] = [u, v];
    if (!blockedEdges.some(([eu, ev]) => eu === u && ev === v)) {
      const newBlocked = [...blockedEdges, edge];
      setBlockedEdges(newBlocked);
      
      // Recalculate path if start/end are set
      if (startNode && endNode) {
        await recalculatePath(startNode, endNode, newBlocked);
      }
    }
  };

  // Handle map click (set start/end points)
  const handleMapClick = async (lat: number, lon: number) => {
    try {
      const nodeResult = await findNearestNode(lat, lon);
      
      if (!startNode) {
        setStartNode(nodeResult.node_id);
        setStartCoords(nodeResult.coords);
        setEndNode(null);
        setEndCoords(null);
        setOriginalPath(null);
        setCurrentPath(null);
        setOriginalPathCoords([]);
        setNewPathCoords([]);
      } else if (!endNode) {
        setEndNode(nodeResult.node_id);
        setEndCoords(nodeResult.coords);
        await recalculatePath(startNode, nodeResult.node_id, blockedEdges);
      } else {
        // Reset and start new path
        setStartNode(nodeResult.node_id);
        setStartCoords(nodeResult.coords);
        setEndNode(null);
        setEndCoords(null);
        setOriginalPath(null);
        setCurrentPath(null);
        setOriginalPathCoords([]);
        setNewPathCoords([]);
      }
    } catch (error) {
      console.error('Failed to handle map click:', error);
    }
  };

  // Recalculate path with blocked edges
  const recalculatePath = async (start: number, end: number, blocked: [number, number][]) => {
    try {
      setIsCalculatingPath(true);
      const pathResult = await calculatePath(start, end, blocked);
      
      if (pathResult.success && pathResult.path_coords) {
        if (!originalPath) {
          // First calculation - this is the original path
          setOriginalPath(pathResult.path || []);
          setOriginalLength(pathResult.length || 0);
          setOriginalPathCoords(pathResult.path_coords);
        }
        setCurrentPath(pathResult.path || []);
        setCurrentLength(pathResult.length || 0);
        setNewPathCoords(pathResult.path_coords);
      } else {
        setCurrentPath(null);
        setCurrentLength(0);
        setNewPathCoords([]);
      }
    } catch (error) {
      console.error('Failed to calculate path:', error);
      setCurrentPath(null);
      setCurrentLength(0);
      setNewPathCoords([]);
    } finally {
      setIsCalculatingPath(false);
    }
  };

  // Reset simulation
  const handleReset = () => {
    setStartNode(null);
    setEndNode(null);
    setStartCoords(null);
    setEndCoords(null);
    setBlockedEdges([]);
    setOriginalPath(null);
    setOriginalLength(0);
    setCurrentPath(null);
    setCurrentLength(0);
    setOriginalPathCoords([]);
    setNewPathCoords([]);
    setScenarioText('');
    setScenarioIntent(null);
    setScenarioMessage(null);
    setSimulationResult('Click any road or set start/end points');
  };

  // Handle single road simulation result
  const handleSimulationResult = (result: unknown) => {
    setSimulationResult(JSON.stringify(result, null, 2));
  };

  const percentageIncrease = originalLength > 0 
    ? ((currentLength - originalLength) / originalLength) * 100 
    : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8 bg-[#f8fafc] font-sans">
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Left Panel */}
        <div
          className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-300 overflow-hidden ${
            isLeftPanelCollapsed ? 'w-12 min-w-[3rem]' : 'w-80 min-w-[20rem]'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            {!isLeftPanelCollapsed && (
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                🚧 Traffic Control
              </h2>
            )}
            <button
              onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
              aria-label={isLeftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {isLeftPanelCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          {!isLeftPanelCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-cyan-700 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Simulation
              </button>

              <div className="border-t border-slate-200 pt-4">
                {/* Text-to-Simulation */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-slate-700">Text-to-Simulation</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Works with keywords (no API needed) or AI (if quota available)
                  </p>
                  <textarea
                    value={scenarioText}
                    onChange={(e) => setScenarioText(e.target.value)}
                    placeholder='e.g. "Simulate a flash flood near the market area that blocks all minor roads."'
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 resize-none"
                    rows={4}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useLLM"
                      checked={useLLM}
                      onChange={(e) => setUseLLM(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="useLLM" className="text-xs text-slate-600">
                      Use AI (Gemini) for better parsing
                    </label>
                  </div>
                  <button
                    onClick={handleRunScenario}
                    disabled={isParsingScenario || !scenarioText.trim()}
                    className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isParsingScenario ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Run Scenario
                      </>
                    )}
                  </button>

                  {scenarioMessage && (
                    <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                      scenarioMessage.kind === 'success' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {scenarioMessage.kind === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <span>{scenarioMessage.text}</span>
                    </div>
                  )}
                </div>

                {/* Policy Impact Result */}
                {endNode && (
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-700">📊 Policy Impact Result</h3>
                    {currentPath ? (
                      <>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Original Distance (Blue)</div>
                          <div className="text-lg font-bold text-slate-900">{originalLength.toFixed(0)} m</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">New Distance (Red)</div>
                          <div className="text-lg font-bold text-red-600">
                            {currentLength.toFixed(0)} m
                            {percentageIncrease > 0 && (
                              <span className="text-xs ml-2">({percentageIncrease.toFixed(2)}% Penalty)</span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                        🚨 DESTINATION UNREACHABLE
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-slate-200 pt-4">
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    Blocked Roads: {blockedEdges.length}
                  </div>
                </div>

                {/* Data Layers */}
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-700">🗺️ Data Layers (OSM)</h3>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPOIs}
                      onChange={(e) => setShowPOIs(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Public services (schools, hospitals, etc.)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCriticalRoads}
                      onChange={(e) => setShowCriticalRoads(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Suggested critical roads (policy)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDrainage}
                      onChange={(e) => setShowDrainage(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Drainage & waterways
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <h2 className="px-6 py-4 text-xl font-semibold text-slate-800 border-b border-slate-200">
            Digital Ward Simulator: Tambaram
          </h2>

          <div className="flex-1 relative min-h-0">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
              </div>
            ) : (
              <EnhancedMapView
                roadsGeoJSON={roadsGeoJSON}
                poisGeoJSON={showPOIs ? poisGeoJSON : null}
                criticalRoadsGeoJSON={showCriticalRoads ? criticalRoadsGeoJSON : null}
                drainageGeoJSON={showDrainage ? drainageGeoJSON : null}
                blockedEdges={blockedEdges}
                startNode={startNode}
                endNode={endNode}
                startCoords={startCoords}
                endCoords={endCoords}
                originalPathCoords={originalPathCoords}
                newPathCoords={newPathCoords}
                showPOIs={showPOIs}
                showCriticalRoads={showCriticalRoads}
                showDrainage={showDrainage}
                onRoadClick={handleRoadClick}
                onMapClick={handleMapClick}
                onSimulationResult={handleSimulationResult}
                center={[12.9229, 80.1275]}
                zoom={15}
              />
            )}
          </div>

          {/* Simulation Result Section */}
          <div className="border-t border-slate-200 bg-white">
            <h3 className="px-6 py-2 text-sm font-semibold text-slate-700 bg-slate-50">
              Simulation Result
            </h3>
            <pre
              className="px-6 py-4 bg-slate-900 text-emerald-400 text-xs font-mono overflow-auto max-h-40"
            >
              {simulationResult}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
