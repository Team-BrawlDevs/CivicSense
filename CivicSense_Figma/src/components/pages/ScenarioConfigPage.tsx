import { useState, useEffect } from "react";
import {
  Loader2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Layers,
  Activity,
  ShieldCheck,
  Droplets,
  Navigation,
  AlertTriangle,
  Info,
  ArrowRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { EnhancedMapView } from "../EnhancedMapView";
import {
  fetchRoadsGeoJSON,
  fetchPOIsGeoJSON,
  fetchCriticalRoadsGeoJSON,
  fetchDrainageGeoJSON,
  parseScenario,
  getBlockedEdges,
  computeRiskScores,
  getPolicySuggestions,
  type GeoJSONCollection,
  type ScenarioIntent,
  type RiskScores,
  type PolicySuggestionsResult,
} from "../../services/api";

const RiskBadge = ({
  level,
  color,
}: {
  level: string;
  color: "green" | "amber" | "red";
}) => {
  const styles = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${styles[color]}`}
    >
      {level}
    </span>
  );
};

export function ScenarioConfigPage() {
  const [activeTab, setActiveTab] = useState("explanation");
  const [isBottomPanelExpanded, setIsBottomPanelExpanded] = useState(false);

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
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    12.9229, 80.1275,
  ]);

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
      if (
        blockedResult.scenario_center &&
        blockedResult.scenario_center.length === 2
      ) {
        setMapCenter([
          blockedResult.scenario_center[0],
          blockedResult.scenario_center[1],
        ]);
      }

      // Compute risk scores (no path/detour)
      const riskScoresResult = await computeRiskScores(
        blockedResult.blocked_edges,
        0,
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
      const riskScoresResult = await computeRiskScores(newBlocked, 0);
      setRiskScores(riskScoresResult);
    }
  };

  // Generate policy suggestions (clear previous so each click produces a fresh set)
  const handleGeneratePolicySuggestions = async () => {
    setPolicySuggestions(null);
    try {
      setIsGeneratingSuggestions(true);
      const result = await getPolicySuggestions(
        blockedEdges,
        scenarioLocationName || undefined,
      );
      setPolicySuggestions(result);
      if (result.success && result.suggestions.length > 0) {
        setIsBottomPanelExpanded(true);
      }
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
    setBlockedEdges([]);
    setScenarioText("");
    setScenarioIntent(null);
    setScenarioMessage(null);
    setMapCenter([12.9229, 80.1275]);
    setRiskScores(null);
    setPolicySuggestions(null);
    setScenarioBlockedRoadNames([]);
    setScenarioLocationName("");
    setScenarioEvent("");
    setIsBottomPanelExpanded(false);
  };

  /** Severity label from risk score 0–100 */
  const severityLabel = (
    score: number,
  ): {
    label: string;
    className: string;
    badgeColor: "green" | "amber" | "red";
  } => {
    if (score <= 25)
      return {
        label: "Low",
        className: "text-emerald-600 bg-emerald-50 border-emerald-200",
        badgeColor: "green",
      };
    if (score <= 50)
      return {
        label: "Medium",
        className: "text-amber-600 bg-amber-50 border-amber-200",
        badgeColor: "amber",
      };
    if (score <= 75)
      return {
        label: "High",
        className: "text-orange-600 bg-orange-50 border-orange-200",
        badgeColor: "red",
      };
    return {
      label: "Critical",
      className: "text-red-600 bg-red-50 border-red-200",
      badgeColor: "red",
    };
  };

  // Derive system impact data from risk scores
  const systemImpactData = riskScores
    ? [
        {
          name: "Drainage",
          value: 100 - riskScores.flood_risk,
          impact:
            riskScores.flood_risk <= 25
              ? "High Positive"
              : riskScores.flood_risk <= 50
                ? "Moderate Positive"
                : "Temp Negative",
          color:
            riskScores.flood_risk <= 25
              ? "#0d9488"
              : riskScores.flood_risk <= 50
                ? "#0ea5e9"
                : "#f59e0b",
        },
        {
          name: "Mobility",
          value: 100 - riskScores.traffic_risk,
          impact:
            riskScores.traffic_risk <= 25
              ? "High Positive"
              : riskScores.traffic_risk <= 50
                ? "Moderate Positive"
                : "Temp Negative",
          color:
            riskScores.traffic_risk <= 25
              ? "#0d9488"
              : riskScores.traffic_risk <= 50
                ? "#0ea5e9"
                : "#f59e0b",
        },
        {
          name: "Emergency",
          value: 100 - riskScores.emergency_access_risk,
          impact:
            riskScores.emergency_access_risk <= 25
              ? "High Positive"
              : riskScores.emergency_access_risk <= 50
                ? "Moderate Positive"
                : "Temp Negative",
          color:
            riskScores.emergency_access_risk <= 25
              ? "#0d9488"
              : riskScores.emergency_access_risk <= 50
                ? "#0ea5e9"
                : "#f59e0b",
        },
      ]
    : [];

  // Overall risk index (average of three risk scores, inverted)
  const overallRiskIndex = riskScores
    ? Math.round(
        (riskScores.flood_risk +
          riskScores.traffic_risk +
          riskScores.emergency_access_risk) /
          3,
      )
    : null;
  const overallRiskPercent =
    overallRiskIndex !== null ? 100 - overallRiskIndex : 0;

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] font-sans">
      {/* MAIN CONTENT AREA — viewport-based height so map stays fixed and panel can be large below */}
      <div
        className="flex shrink-0 overflow-hidden"
        style={{
          height: "calc(100vh - 4rem - 2.5rem - 44px)",
          minHeight: "400px",
        }}
      >
        {/* 1) LEFT PANEL — POLICY & SCENARIO INPUT */}
        <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-600" />
              Policy Definition
            </h2>
          </div>

          <div className="p-5 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Policy Description
              </label>
              {scenarioText ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed italic">
                  "{scenarioText}"
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 italic">
                  Enter a scenario description below...
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Scenario Input
              </label>
              <textarea
                value={scenarioText}
                onChange={(e) => setScenarioText(e.target.value)}
                placeholder='e.g. "Flash flood near market blocking minor roads"'
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 resize-none"
                rows={3}
              />
              <button
                onClick={handleRunScenario}
                disabled={isParsingScenario || !scenarioText.trim()}
                className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isParsingScenario ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Running...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" /> Run Scenario
                  </>
                )}
              </button>
            </div>

            {scenarioMessage && (
              <div
                className={`p-3 rounded-lg text-[10px] ${
                  scenarioMessage.kind === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {scenarioMessage.text}
              </div>
            )}

            {/* Blocked Roads — expandable list, below green success box; starts collapsed */}
            {(blockedEdges.length > 0 || scenarioBlockedRoadNames.length > 0) && (
              <div className="pt-4">
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="group flex items-center gap-2 w-full text-left">
                    <ChevronDown className="w-4 h-4 text-slate-600 group-data-[state=open]:rotate-180 transition-transform" />
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                      Blocked Roads
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({blockedEdges.length})
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {scenarioBlockedRoadNames.length > 0 ? (
                        scenarioBlockedRoadNames.map((name, i) => (
                          <li
                            key={`${name}-${i}`}
                            className="text-[11px] text-slate-700 py-1 px-2 rounded bg-red-50 border border-red-100"
                          >
                            {name}
                          </li>
                        ))
                      ) : (
                        blockedEdges.map(([u, v], i) => (
                          <li
                            key={`${u}-${v}-${i}`}
                            className="text-[11px] text-slate-600 py-1 px-2 rounded bg-slate-50 border border-slate-200"
                          >
                            Edge {u} → {v}
                          </li>
                        ))
                      )}
                      {scenarioBlockedRoadNames.length > 0 &&
                        blockedEdges.length > scenarioBlockedRoadNames.length && (
                          <li className="text-[10px] text-slate-500 italic py-1 px-2">
                            +{blockedEdges.length - scenarioBlockedRoadNames.length} more on map
                          </li>
                        )}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* AI Interpreted Policy Summary Card */}
            {scenarioIntent && (
              <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest">
                    AI Interpretation
                  </span>
                  <span className="px-2 py-0.5 bg-cyan-500 text-white text-[9px] font-bold rounded uppercase">
                    Policy Simulated
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1 border-b border-cyan-100/50 pb-2">
                    <span className="text-[10px] text-slate-500">
                      Policy Type
                    </span>
                    <span className="text-[10px] font-bold text-slate-900 text-right">
                      {scenarioEvent === "flash_flood"
                        ? "Flood Mitigation"
                        : scenarioEvent === "construction"
                          ? "Infrastructure"
                          : "Traffic Management"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 border-b border-cyan-100/50 pb-2">
                    <span className="text-[10px] text-slate-500">
                      Affected Systems
                    </span>
                    <span className="text-[10px] font-bold text-slate-900 text-right leading-tight">
                      Drainage, Mobility, Emergency
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 border-b border-cyan-100/50 pb-2">
                    <span className="text-[10px] text-slate-500">
                      Impacted Zone
                    </span>
                    <span className="text-[10px] font-bold text-slate-900 text-right">
                      {scenarioLocationName || "Tambaram Ward"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-[10px] text-slate-500">Radius</span>
                    <span className="text-[10px] font-bold text-slate-900 text-right">
                      {scenarioIntent.radius_m || 400} m
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 space-y-3">
              {scenarioMessage?.kind === "success" && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold">Simulation complete</span>
                </div>
              )}
              {policySuggestions && policySuggestions.success && (
                <div className="flex items-center gap-2 text-cyan-600">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold">
                    AI insights generated
                  </span>
                </div>
              )}
            </div>

            {/* Data Layers */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-600" />
                <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                  Data Layers
                </h3>
              </div>
              <label className="flex items-center gap-2 text-[10px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPOIs}
                  onChange={(e) => setShowPOIs(e.target.checked)}
                  className="w-3 h-3"
                />
                Public services
              </label>
              <label className="flex items-center gap-2 text-[10px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCriticalRoads}
                  onChange={(e) => setShowCriticalRoads(e.target.checked)}
                  className="w-3 h-3"
                />
                Critical roads
              </label>
              <label className="flex items-center gap-2 text-[10px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDrainage}
                  onChange={(e) => setShowDrainage(e.target.checked)}
                  className="w-3 h-3"
                />
                Drainage
              </label>
            </div>
          </div>
        </div>

        {/* 2) CENTER — DIGITAL WARD MAP (fixed height, does not grow with right panel) */}
        <div className="flex-1 min-h-0 relative bg-slate-100 flex flex-col overflow-hidden">
          {/* Map Controls */}
          <div className="absolute top-4 left-4 z-[1] flex gap-2">
            <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-200 flex gap-1">
              <button className="px-3 py-1.5 rounded text-[10px] font-bold uppercase bg-slate-900 text-white">
                Scenario View
              </button>
              <button className="px-3 py-1.5 rounded text-[10px] font-bold uppercase text-slate-400 cursor-not-allowed">
                Baseline
              </button>
            </div>
            <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-200">
              <button className="px-3 py-1.5 rounded text-[10px] font-bold uppercase text-slate-600 flex items-center gap-2 hover:bg-slate-50">
                <Layers className="w-3.5 h-3.5" />
                Impact Difference
              </button>
            </div>
          </div>

          {/* Map Legend */}
          {blockedEdges.length > 0 && (
            <div className="absolute bottom-6 left-6 z-[1] bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                Map Legend
              </div>
              <div className="space-y-2">
                {scenarioLocationName && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-cyan-500 rounded-full" />
                    <span className="text-[10px] font-medium text-slate-600">
                      {scenarioLocationName} Highlight
                    </span>
                  </div>
                )}
                {showDrainage && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 border-t-2 border-dashed border-teal-600" />
                    <span className="text-[10px] font-medium text-slate-600">
                      Drainage Features
                    </span>
                  </div>
                )}
                {blockedEdges.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-red-400 opacity-20 border border-red-200 rounded-sm" />
                    <span className="text-[10px] font-medium text-slate-600">
                      Blocked Roads ({blockedEdges.length})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map Canvas — fills center column only; min-h-0 keeps height fixed */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
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
                showPOIs={showPOIs}
                showCriticalRoads={showCriticalRoads}
                showDrainage={showDrainage}
                onRoadClick={handleRoadClick}
                center={mapCenter}
                zoom={15}
              />
            )}
          </div>
        </div>

        {/* 3) RIGHT PANEL — IMPACT SUMMARY */}
        <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Impact Summary
            </h2>
          </div>

          <div className="p-5 space-y-6">
            {/* Metric Cards */}
            {riskScores ? (
              <div className="space-y-3">
                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-teal-600" />
                      <span className="text-xs font-bold text-slate-700">
                        Flood Risk
                      </span>
                    </div>
                    <RiskBadge
                      level={severityLabel(riskScores.flood_risk).label}
                      color={severityLabel(riskScores.flood_risk).badgeColor}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="text-slate-400 line-through font-normal">
                      {riskScores.flood_risk > 0 ? "High" : ""}
                    </span>
                    {riskScores.flood_risk > 0 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span>{riskScores.flood_risk}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {riskScores.flood_reason}
                  </div>
                </div>

                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-700">
                        Traffic Disruption
                      </span>
                    </div>
                    <RiskBadge
                      level={severityLabel(riskScores.traffic_risk).label}
                      color={severityLabel(riskScores.traffic_risk).badgeColor}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span>{riskScores.traffic_risk}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {riskScores.traffic_reason}
                  </div>
                </div>

                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <span className="text-xs font-bold text-slate-700">
                        Emergency Accessibility
                      </span>
                    </div>
                    <RiskBadge
                      level={
                        severityLabel(riskScores.emergency_access_risk).label
                      }
                      color={
                        severityLabel(riskScores.emergency_access_risk)
                          .badgeColor
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span
                      className={
                        riskScores.emergency_access_risk <= 25
                          ? "text-emerald-600"
                          : ""
                      }
                    >
                      {riskScores.emergency_access_risk <= 25
                        ? "Improved"
                        : riskScores.emergency_access_risk}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {riskScores.emergency_reason}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 text-center py-8">
                Run a scenario to see impact summary
              </div>
            )}

            {/* Overall Risk Index */}
            {overallRiskIndex !== null && (
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Overall Risk Index
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">
                    {overallRiskIndex <= 25
                      ? "Low"
                      : overallRiskIndex <= 50
                        ? "Medium"
                        : overallRiskIndex <= 75
                          ? "High"
                          : "Critical"}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${overallRiskPercent}%` }}
                  />
                  <div
                    className="h-full bg-slate-300"
                    style={{ width: `${100 - overallRiskPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* System Impact Breakdown */}
            {systemImpactData.length > 0 && (
              <div className="pt-4 space-y-4 pb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Affected Systems
                </span>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={systemImpactData}
                      layout="vertical"
                      margin={{ top: 0, right: 10, bottom: 0, left: 30 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        style={{ fontSize: "10px" }}
                        width={30}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                        {systemImpactData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {systemImpactData.map((sys) => (
                    <div
                      key={sys.name}
                      className="flex justify-between items-center text-[10px]"
                    >
                      <span className="text-slate-500 font-medium">
                        {sys.name}
                      </span>
                      <span
                        className={`font-bold ${sys.impact.includes("Positive") ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {sys.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4) POLICY INSIGHTS PANEL — just below main content; 44px collapsed, 70vh when expanded */}
      <motion.div
        initial={false}
        animate={{
          height: isBottomPanelExpanded ? "70vh" : "44px",
        }}
        transition={{ type: "tween", duration: 0.25 }}
        className="shrink-0 bg-slate-900 border-t border-slate-800 text-white overflow-hidden shadow-2xl"
      >
        <div
          className="px-6 h-11 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
          onClick={() => setIsBottomPanelExpanded(!isBottomPanelExpanded)}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-wide uppercase">
              CivicSense AI – Policy Insights
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGeneratePolicySuggestions();
              }}
              disabled={isGeneratingSuggestions || blockedEdges.length === 0}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-bold uppercase rounded"
            >
              {isGeneratingSuggestions ? "Generating..." : "Generate"}
            </button>
            {isBottomPanelExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </div>
        </div>

        {isBottomPanelExpanded && (
          <div className="p-6 pt-2 h-[calc(100%-2.75rem)] border-t border-slate-800 flex flex-col min-h-0">
            <div className="flex gap-8 flex-1 min-h-0 overflow-hidden">
              {/* Tab Selector */}
              <div className="w-48 flex flex-col gap-1 border-r border-slate-800 pr-4">
                {[
                  {
                    id: "explanation",
                    label: "AI Explanation",
                    icon: Info,
                  },
                  {
                    id: "suggested",
                    label: "Suggested Scenarios",
                    icon: Sparkles,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-all ${
                      activeTab === tab.id
                        ? "bg-cyan-500/10 text-cyan-400 shadow-inner"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto pr-4">
                <AnimatePresence mode="wait">
                  {activeTab === "explanation" && (
                    <motion.div
                      key="exp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      {policySuggestions && policySuggestions.success ? (
                        <>
                          <h4 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">
                            Reasoning Summary
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed font-light">
                            {policySuggestions.suggestions.length > 0
                              ? `The simulated scenario analysis generated ${policySuggestions.suggestions.length} infrastructure policy suggestions. ${policySuggestions.analysis ? `Current state: ${policySuggestions.analysis.blocked_roads_count} blocked roads.` : ""}`
                              : "Generate policy suggestions to see AI reasoning."}
                          </p>
                          {policySuggestions.analysis && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                                  Key Insight
                                </p>
                                <p className="text-xs text-slate-300 font-light">
                                  {
                                    policySuggestions.analysis.hotspot_areas
                                      .length
                                  }{" "}
                                  hotspot areas identified with blocked
                                  connections.
                                </p>
                              </div>
                              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                                  Impact Confidence
                                </p>
                                <p className="text-xs text-slate-300 font-light">
                                  {
                                    policySuggestions.analysis.bottleneck_roads
                                      .length
                                  }{" "}
                                  critical bottlenecks require infrastructure
                                  intervention.
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-400">
                          Block roads or run a scenario, then generate policy
                          suggestions to see AI insights.
                        </p>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "suggested" && (
                    <motion.div
                      key="sug"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-3"
                    >
                      {policySuggestions &&
                      policySuggestions.success &&
                      policySuggestions.suggestions.length > 0 ? (
                        policySuggestions.suggestions.map((suggestion, i) => (
                          <div
                            key={i}
                            className="p-4 bg-slate-800 border border-slate-700 rounded-xl"
                          >
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {suggestion}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400">
                          Generate policy suggestions to see recommended
                          scenarios.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* FOOTER / STATUS BAR */}
      <div className="px-6 py-1.5 bg-white border-t border-slate-200 flex justify-between items-center text-[10px] font-medium text-slate-400 flex-shrink-0">
        <div className="flex items-center gap-4">
          {scenarioMessage?.kind === "success" && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Simulation complete{" "}
              {policySuggestions && policySuggestions.success
                ? "· AI insights generated"
                : ""}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            GenAI reasons over simulation outputs. It does not replace physical
            or engineering models.
          </span>
        </div>
        <div>
          Last Simulated:{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          | CivicSense Core v2.4
        </div>
      </div>
    </div>
  );
}
