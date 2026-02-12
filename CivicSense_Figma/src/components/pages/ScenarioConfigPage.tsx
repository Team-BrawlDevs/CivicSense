import { useState, useEffect } from "react";
import {
  Loader2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Layers,
} from "lucide-react";
import { EnhancedMapView } from "../EnhancedMapView";
import {
  fetchRoadsGeoJSON,
  fetchPOIsGeoJSON,
  fetchCriticalRoadsGeoJSON,
  fetchDrainageGeoJSON,
  parseScenario,
  getBlockedEdges,
  calculatePath,
  findNearestNode,
  computeRiskScores,
  getPolicySuggestions,
  type GeoJSONCollection,
  type ScenarioIntent,
  type RiskScores,
  type PolicySuggestionsResult,
} from "../../services/api";

export function ScenarioConfigPage() {
  // Map data state
  const [roadsGeoJSON, setRoadsGeoJSON] = useState<GeoJSONCollection | null>(
    null,
  );
  const [poisGeoJSON, setPOIsGeoJSON] = useState<GeoJSONCollection | null>(
    null,
  );
  const [criticalRoadsGeoJSON, setCriticalRoadsGeoJSON] =
    useState<GeoJSONCollection | null>(null);
  const [drainageGeoJSON, setDrainageGeoJSON] =
    useState<GeoJSONCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [showPOIs, setShowPOIs] = useState(true);
  const [showCriticalRoads, setShowCriticalRoads] = useState(true);
  const [showDrainage, setShowDrainage] = useState(true);

  // Scenario state
  const [scenarioText, setScenarioText] = useState("");
  const [isParsingScenario, setIsParsingScenario] = useState(false);
  const [scenarioIntent, setScenarioIntent] = useState<ScenarioIntent | null>(
    null,
  );
  const [scenarioMessage, setScenarioMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
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
  const [originalPathCoords, setOriginalPathCoords] = useState<
    [number, number][]
  >([]);
  const [newPathCoords, setNewPathCoords] = useState<[number, number][]>([]);
  const [isCalculatingPath, setIsCalculatingPath] = useState(false);

  // Simulation result (for single road click)
  const [simulationResult, setSimulationResult] = useState<string>(
    "Click any road or set start/end points",
  );

  // Risk scores and policy suggestions
  const [riskScores, setRiskScores] = useState<RiskScores | null>(null);
  const [policySuggestions, setPolicySuggestions] =
    useState<PolicySuggestionsResult | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [scenarioBlockedRoadNames, setScenarioBlockedRoadNames] = useState<
    string[]
  >([]);
  const [scenarioLocationName, setScenarioLocationName] = useState<string>("");
  const [scenarioEvent, setScenarioEvent] = useState<string>("");

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
        console.error("Failed to load map data:", error);
        setScenarioMessage({
          kind: "error",
          text: `Failed to load map data: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMapData();
  }, []);

  // Handle scenario parsing (Text-to-Simulation)
  const handleRunScenario = async () => {
    if (!scenarioText.trim()) {
      setScenarioMessage({
        kind: "error",
        text: "Please enter a scenario description.",
      });
      return;
    }

    try {
      setIsParsingScenario(true);
      setScenarioMessage(null);

      // Parse scenario
      const parseResult = await parseScenario(scenarioText, useLLM);
      setScenarioIntent(parseResult.intent);

      // Get blocked edges with enhanced summary
      const blockedResult = await getBlockedEdges(scenarioText, useLLM);
      setBlockedEdges(blockedResult.blocked_edges);
      setScenarioBlockedRoadNames(blockedResult.blocked_road_names || []);
      setScenarioLocationName(blockedResult.location_name || "");
      setScenarioEvent(blockedResult.event || "");

      // Compute risk scores
      const pathDetourPct = endNode && currentPath ? percentageIncrease : 0;
      const riskScoresResult = await computeRiskScores(
        blockedResult.blocked_edges,
        pathDetourPct,
      );
      setRiskScores(riskScoresResult);

      // Build enhanced message with street names
      const aiNote = useLLM ? "✨ AI" : "✓";
      let message = `${aiNote} Blocked ${blockedResult.blocked_edges.length} roads`;
      if (blockedResult.location_name) {
        message += ` near ${blockedResult.location_name}`;
      }
      if (blockedResult.event) {
        message += ` (${blockedResult.event.replace("_", " ")})`;
      }
      if (
        blockedResult.blocked_road_names &&
        blockedResult.blocked_road_names.length > 0
      ) {
        const nameList = blockedResult.blocked_road_names
          .slice(0, 3)
          .join(", ");
        const more =
          blockedResult.blocked_road_names.length > 3
            ? ` and ${blockedResult.blocked_road_names.length - 3} more`
            : "";
        message += `: ${nameList}${more}`;
      }
      setScenarioMessage({ kind: "success", text: message });

      // Recalculate path if start/end are set
      if (startNode && endNode) {
        await recalculatePath(startNode, endNode, blockedResult.blocked_edges);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setScenarioMessage({ kind: "error", text: errorMsg });
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
      } else {
        // Update risk scores even without a path
        const riskScoresResult = await computeRiskScores(newBlocked, 0);
        setRiskScores(riskScoresResult);
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
      console.error("Failed to handle map click:", error);
    }
  };

  // Recalculate path with blocked edges
  const recalculatePath = async (
    start: number,
    end: number,
    blocked: [number, number][],
  ) => {
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

        // Update risk scores with new detour percentage
        const newDetourPct =
          originalLength > 0
            ? ((pathResult.length - originalLength) / originalLength) * 100
            : 0;
        const riskScoresResult = await computeRiskScores(blocked, newDetourPct);
        setRiskScores(riskScoresResult);
      } else {
        setCurrentPath(null);
        setCurrentLength(0);
        setNewPathCoords([]);
        // Recalculate risk scores when path becomes unreachable
        const riskScoresResult = await computeRiskScores(blocked, 0);
        setRiskScores(riskScoresResult);
      }
    } catch (error) {
      console.error("Failed to calculate path:", error);
      setCurrentPath(null);
      setCurrentLength(0);
      setNewPathCoords([]);
      // Recalculate risk scores on error (e.g. network failure) so UI stays in sync
      try {
        const riskScoresResult = await computeRiskScores(blocked, 0);
        setRiskScores(riskScoresResult);
      } catch (_) {}
    } finally {
      setIsCalculatingPath(false);
    }
  };

  // Generate policy suggestions (clear previous so each click produces a fresh set)
  const handleGeneratePolicySuggestions = async () => {
    setPolicySuggestions(null);
    try {
      setIsGeneratingSuggestions(true);
      const result = await getPolicySuggestions(
        blockedEdges,
        startNode,
        endNode,
        originalPath,
        originalLength,
        currentPath,
        currentLength,
      );
      setPolicySuggestions(result);
    } catch (error) {
      console.error("Failed to generate policy suggestions:", error);
      setScenarioMessage({
        kind: "error",
        text: `Failed to generate suggestions: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsGeneratingSuggestions(false);
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
    setScenarioText("");
    setScenarioIntent(null);
    setScenarioMessage(null);
    setSimulationResult("Click any road or set start/end points");
    setRiskScores(null);
    setPolicySuggestions(null);
    setScenarioBlockedRoadNames([]);
    setScenarioLocationName("");
    setScenarioEvent("");
  };

  // Handle single road simulation result
  const handleSimulationResult = (result: unknown) => {
    setSimulationResult(JSON.stringify(result, null, 2));
  };

  const percentageIncrease =
    originalLength > 0
      ? ((currentLength - originalLength) / originalLength) * 100
      : 0;

  /** Severity label from risk score 0–100 */
  const severityLabel = (
    score: number,
  ): { label: string; className: string } => {
    if (score <= 25)
      return {
        label: "Low",
        className: "text-emerald-600 bg-emerald-50 border-emerald-200",
      };
    if (score <= 50)
      return {
        label: "Medium",
        className: "text-amber-600 bg-amber-50 border-amber-200",
      };
    if (score <= 75)
      return {
        label: "High",
        className: "text-orange-600 bg-orange-50 border-orange-200",
      };
    return {
      label: "Critical",
      className: "text-red-600 bg-red-50 border-red-200",
    };
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] -m-8 bg-[#f8fafc] font-sans">
      <h2 className="px-6 py-3 text-lg font-semibold text-slate-800 border-b border-slate-200 bg-white">
        Digital Ward Simulator: Tambaram
      </h2>

      {/* 3 columns: Left | Center (Map) | Right */}
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        {/* Left column: Text-to-Simulation + Data layers (fixed width, no expand) */}
        <div
          className="flex-none flex flex-col bg-white border-r border-slate-200 overflow-hidden overflow-y-scroll overflow-x-hidden p-4 space-y-4"
          style={{ width: "18rem" }}
        >
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-cyan-700 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Simulation
          </button>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <h3 className="text-sm font-bold text-slate-700">
                Text-to-Simulation
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Keywords or AI (if quota available)
            </p>
            <textarea
              value={scenarioText}
              onChange={(e) => setScenarioText(e.target.value)}
              placeholder='e.g. "Flash flood near market blocking minor roads"'
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 resize-none"
              rows={3}
            />
            <button
              onClick={handleRunScenario}
              disabled={isParsingScenario || !scenarioText.trim()}
              className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isParsingScenario ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Running...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Run Scenario
                </>
              )}
            </button>

            {scenarioMessage && (
              <div className="min-w-0 w-full overflow-hidden">
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 min-w-0 overflow-hidden ${
                    scenarioMessage.kind === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <span className="break-words whitespace-normal">
                      {scenarioMessage.text}
                    </span>

                    {scenarioBlockedRoadNames.length > 0 && (
                      <details className="mt-2 block w-full max-w-full overflow-hidden">
                        <summary className="cursor-pointer w-full max-w-full break-all">
                          📋 Blocked streets ({scenarioBlockedRoadNames.length})
                        </summary>

                        <ul className="mt-1 ml-4 space-y-1 w-full max-w-full">
                          {scenarioBlockedRoadNames.map((name, idx) => (
                            <li
                              key={idx}
                              className="text-xs break-all w-full max-w-full"
                            >
                              • {name}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="text-xs font-bold text-slate-700 mb-2">
              Blocked Roads: {blockedEdges.length}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-700">
                🗺️ Data Layers (OSM)
              </h3>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showPOIs}
                onChange={(e) => setShowPOIs(e.target.checked)}
                className="w-4 h-4"
              />
              Public services (schools, hospitals)
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showCriticalRoads}
                onChange={(e) => setShowCriticalRoads(e.target.checked)}
                className="w-4 h-4"
              />
              Critical roads (policy)
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

        {/* Center column: Map */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="relative flex-1 min-h-[420px] p-4">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
              </div>
            ) : (
              <EnhancedMapView
                roadsGeoJSON={roadsGeoJSON}
                poisGeoJSON={showPOIs ? poisGeoJSON : null}
                criticalRoadsGeoJSON={
                  showCriticalRoads ? criticalRoadsGeoJSON : null
                }
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
          <div className="border-t border-slate-200 bg-white px-4 py-2">
            <h3 className="text-sm font-semibold text-slate-700">
              Simulation Result
            </h3>
            <pre className="mt-1 bg-slate-900 text-emerald-400 text-xs font-mono overflow-auto max-h-28 rounded p-2">
              {simulationResult}
            </pre>
          </div>
        </div>

        {/* Right column: Risk Scores + severity */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-white border-l border-slate-200 overflow-y-auto p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">⚠️ Risk Scores</h3>
          <p className="text-xs text-slate-500">
            0 = low risk, 100 = high risk
          </p>

          {riskScores ? (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-600">🌊 Flood</span>
                  <span className="text-sm font-bold text-slate-900">
                    {riskScores.flood_risk}
                  </span>
                </div>
                <div
                  className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium border ${severityLabel(riskScores.flood_risk).className}`}
                >
                  Severity: {severityLabel(riskScores.flood_risk).label}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {riskScores.flood_reason}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-600">🚗 Traffic</span>
                  <span className="text-sm font-bold text-slate-900">
                    {riskScores.traffic_risk}
                  </span>
                </div>
                <div
                  className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium border ${severityLabel(riskScores.traffic_risk).className}`}
                >
                  Severity: {severityLabel(riskScores.traffic_risk).label}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {riskScores.traffic_reason}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-600">
                    🚑 Emergency Access
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {riskScores.emergency_access_risk}
                  </span>
                </div>
                <div
                  className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium border ${severityLabel(riskScores.emergency_access_risk).className}`}
                >
                  Severity:{" "}
                  {severityLabel(riskScores.emergency_access_risk).label}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {riskScores.emergency_reason}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Run a scenario or block roads to see risk scores.
            </p>
          )}

          {endNode && (
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-700">
                📊 Policy Impact
              </h3>
              {currentPath ? (
                <>
                  <div className="p-2 bg-slate-50 rounded text-xs">
                    <span className="text-slate-500">Original:</span>{" "}
                    <span className="font-bold">
                      {originalLength.toFixed(0)} m
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded text-xs">
                    <span className="text-slate-500">New:</span>{" "}
                    <span className="font-bold text-red-600">
                      {currentLength.toFixed(0)} m
                    </span>
                    {percentageIncrease > 0 && (
                      <span className="ml-1">
                        (+{percentageIncrease.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-2 bg-red-50 text-red-700 rounded text-xs font-bold">
                  🚨 DESTINATION UNREACHABLE
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full-width: Policy suggestions below */}
      <div className="border-t border-slate-200 bg-white p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">
          💡 Infrastructure Policy Suggestions
        </h3>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={handleGeneratePolicySuggestions}
            disabled={isGeneratingSuggestions || blockedEdges.length === 0}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGeneratingSuggestions ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate Policy Suggestions
              </>
            )}
          </button>
          {!policySuggestions && blockedEdges.length > 0 && (
            <span className="text-xs text-slate-500">
              Block roads or run a scenario, then generate.
            </span>
          )}
        </div>

        {policySuggestions && (
          <div className="space-y-3">
            {policySuggestions.used_fallback && (
              <p className="text-xs text-amber-600">
                📌 Rule-based (API quota exceeded or unavailable)
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {policySuggestions.suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-slate-700"
                >
                  <span className="font-semibold">{idx + 1}.</span> {suggestion}
                </div>
              ))}
            </div>
            {policySuggestions.analysis && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-800">
                  📊 Analysis Summary
                </summary>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <p>
                    • {policySuggestions.analysis.blocked_roads_count} blocked
                    roads
                  </p>
                  <p>
                    •{" "}
                    {policySuggestions.analysis.path_detour_percent.toFixed(1)}%
                    detour impact
                  </p>
                  <p>
                    • {policySuggestions.analysis.hotspot_areas.length} hotspot
                    areas
                  </p>
                  <p>
                    • {policySuggestions.analysis.bottleneck_roads.length}{" "}
                    critical bottlenecks
                  </p>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
