import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Map as MapIcon, 
  Layers, 
  Info, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Activity, 
  ShieldCheck, 
  Droplets, 
  Navigation,
  AlertTriangle,
  Zap,
  ChevronUp,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { MapView } from '../MapView';
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
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// --- Components ---

const RiskBadge = ({ level, color }: { level: string, color: 'green' | 'amber' | 'red' }) => {
  const styles = {
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    red: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${styles[color]}`}>
      {level}
    </span>
  );
};

export function ScenarioConfigPage() {
  const [activeTab, setActiveTab] = useState('explanation');
  const [isBottomPanelExpanded, setIsBottomPanelExpanded] = useState(false);
  
  // Backend integration state
  const [scenarioText, setScenarioText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scenarioIntent, setScenarioIntent] = useState<ScenarioIntent | null>(null);
  const [blockedEdges, setBlockedEdges] = useState<[number, number][]>([]);
  const [startNode, setStartNode] = useState<number | null>(null);
  const [endNode, setEndNode] = useState<number | null>(null);
  const [pathResult, setPathResult] = useState<{ path_coords?: [number, number][]; length?: number } | null>(null);
  
  // Map data state
  const [roadsGeoJSON, setRoadsGeoJSON] = useState<GeoJSONCollection | null>(null);
  const [poisGeoJSON, setPOIsGeoJSON] = useState<GeoJSONCollection | null>(null);
  const [criticalRoadsGeoJSON, setCriticalRoadsGeoJSON] = useState<GeoJSONCollection | null>(null);
  const [drainageGeoJSON, setDrainageGeoJSON] = useState<GeoJSONCollection | null>(null);
  
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
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMapData();
  }, []);
  
  // Handle scenario parsing
  const handleRunScenario = async () => {
    if (!scenarioText.trim()) return;
    
    try {
      setIsLoading(true);
      const useLLM = false; // Use keyword parser by default
      
      // Parse scenario
      const parseResult = await parseScenario(scenarioText, useLLM);
      setScenarioIntent(parseResult.intent);
      
      // Get blocked edges
      const blockedResult = await getBlockedEdges(scenarioText, useLLM);
      setBlockedEdges(blockedResult.blocked_edges);
      
    } catch (error) {
      console.error('Failed to run scenario:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle map click for path selection
  const handleMapClick = async (lat: number, lon: number) => {
    try {
      const nodeResult = await findNearestNode(lat, lon);
      
      if (!startNode) {
        setStartNode(nodeResult.node_id);
      } else if (!endNode) {
        setEndNode(nodeResult.node_id);
        // Calculate path
        const path = await calculatePath(startNode, nodeResult.node_id, blockedEdges);
        if (path.success && path.path_coords) {
          setPathResult(path);
        }
      } else {
        // Reset and start new path
        setStartNode(nodeResult.node_id);
        setEndNode(null);
        setPathResult(null);
      }
    } catch (error) {
      console.error('Failed to handle map click:', error);
    }
  };

  const systemImpactData = [
    { name: 'Drainage', value: 85, impact: 'High Positive', color: '#0d9488' },
    { name: 'Mobility', value: 40, impact: 'Temp Negative', color: '#f59e0b' },
    { name: 'Public Services', value: 65, impact: 'Moderate Positive', color: '#0ea5e9' },
  ];

  const timelineData = [
    { year: 'Year 0', risk: 80, resilience: 10 },
    { year: 'Year 1', risk: 70, resilience: 15 },
    { year: 'Year 2', risk: 40, resilience: 45 },
    { year: 'Year 3', risk: 25, resilience: 70 },
    { year: 'Year 4', risk: 20, resilience: 85 },
    { year: 'Year 5', risk: 18, resilience: 90 },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] -m-8 bg-[#f8fafc] font-sans">
      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 1) LEFT PANEL — POLICY & SCENARIO INPUT (FILLED STATE) */}
        <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-600" />
              Policy Definition
            </h2>
          </div>

          <div className="p-5 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Policy Description</label>
              <textarea
                value={scenarioText}
                onChange={(e) => setScenarioText(e.target.value)}
                placeholder='e.g. "Simulate a flash flood near the market that blocks all minor roads"'
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed resize-none"
                rows={4}
              />
              <button
                onClick={handleRunScenario}
                disabled={isLoading || !scenarioText.trim()}
                className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Run Scenario
                  </>
                )}
              </button>
            </div>

            {/* AI Interpreted Policy Summary Card */}
            {scenarioIntent && (
              <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest">AI Interpretation</span>
                  <span className="px-2 py-0.5 bg-cyan-500 text-white text-[9px] font-bold rounded uppercase">
                    {blockedEdges.length > 0 ? 'Policy Simulated' : 'Parsed'}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1 border-b border-cyan-100/50 pb-2">
                    <span className="text-[10px] text-slate-500">Location</span>
                    <span className="text-[10px] font-bold text-slate-900 text-right capitalize">{scenarioIntent.location_type.replace('_', ' ')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 border-b border-cyan-100/50 pb-2">
                    <span className="text-[10px] text-slate-500">Radius</span>
                    <span className="text-[10px] font-bold text-slate-900 text-right">{scenarioIntent.radius_m}m</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 border-b border-cyan-100/50 pb-2">
                    <span className="text-[10px] text-slate-500">Road Filter</span>
                    <span className="text-[10px] font-bold text-slate-900 text-right capitalize">{scenarioIntent.road_filter.replace('_', ' ')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-[10px] text-slate-500">Blocked Roads</span>
                    <span className="text-[10px] font-bold text-slate-900 text-right">{blockedEdges.length}</span>
                  </div>
                </div>
              </div>
            )}

            {blockedEdges.length > 0 && (
              <div className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold">Simulation complete</span>
                </div>
                <div className="text-xs text-slate-600">
                  Click on map to set start and end points for path calculation
                </div>
              </div>
            )}
            
            {pathResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="text-xs font-bold text-emerald-900 mb-1">Path Calculated</div>
                <div className="text-[10px] text-emerald-700">
                  Distance: {pathResult.length?.toFixed(0)}m
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2) CENTER — DIGITAL WARD MAP (POST-SIMULATION VIEW) */}
        <div className="flex-1 relative bg-slate-100 flex flex-col overflow-hidden">
          {/* Map Controls */}
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-200 flex gap-1">
              <button className="px-3 py-1.5 rounded text-[10px] font-bold uppercase bg-slate-900 text-white">Scenario View</button>
              <button className="px-3 py-1.5 rounded text-[10px] font-bold uppercase text-slate-400 cursor-not-allowed">Baseline</button>
            </div>
            <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-200">
              <button className="px-3 py-1.5 rounded text-[10px] font-bold uppercase text-slate-600 flex items-center gap-2 hover:bg-slate-50">
                <Layers className="w-3.5 h-3.5" />
                Impact Difference
              </button>
            </div>
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Map Legend</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-cyan-500 rounded-full" />
                <span className="text-[10px] font-medium text-slate-600">Gandhi Street Highlight</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-teal-600" />
                <span className="text-[10px] font-medium text-slate-600">New Drainage Pipeline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-red-400 opacity-20 border border-red-200 rounded-sm" />
                <span className="text-[10px] font-medium text-slate-600">Reduced Flood Intensity</span>
              </div>
            </div>
          </div>

          {/* Large Map Canvas */}
          <div className="flex-1 bg-[#e2e8f0] relative overflow-hidden">
            {isLoading && !roadsGeoJSON ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
              </div>
            ) : (
              <MapView
                roadsGeoJSON={roadsGeoJSON || undefined}
                poisGeoJSON={poisGeoJSON || undefined}
                criticalRoadsGeoJSON={criticalRoadsGeoJSON || undefined}
                drainageGeoJSON={drainageGeoJSON || undefined}
                blockedEdges={blockedEdges}
                pathCoords={pathResult?.path_coords}
                onMapClick={handleMapClick}
                center={[12.9229, 80.1275]}
                zoom={15}
              />
            )}
          </div>
        </div>

        {/* 3) RIGHT PANEL — IMPACT SUMMARY (PLACEHOLDER DATA) */}
        <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Impact Summary
            </h2>
          </div>

          <div className="p-5 space-y-6">
            {/* Metric Cards */}
            <div className="space-y-3">
              <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-700">Flood Risk</span>
                  </div>
                  <RiskBadge level="Low" color="green" />
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="text-slate-400 line-through font-normal">High</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  <span>Low</span>
                </div>
              </div>

              <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-700">Traffic Disruption</span>
                  </div>
                  <RiskBadge level="Medium" color="amber" />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Short-term increase during construction phase.</p>
              </div>

              <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-700">Emergency Accessibility</span>
                  </div>
                  <RiskBadge level="Improved" color="green" />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Significant gain during extreme rainfall events.</p>
              </div>
            </div>

            {/* Overall Risk Index */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall Risk Index</span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Medium → Low</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 w-[70%]" />
                <div className="h-full bg-slate-300 w-[30%]" />
              </div>
            </div>

            {/* System Impact Breakdown */}
            <div className="pt-4 space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Affected Systems</span>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={systemImpactData} layout="vertical" margin={{ left: -30 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                      {systemImpactData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {systemImpactData.map(sys => (
                  <div key={sys.name} className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">{sys.name}</span>
                    <span className={`font-bold ${sys.impact.includes('Positive') ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {sys.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4) BOTTOM / GENAI INSIGHTS PANEL (PLACEHOLDER CONTENT) */}
      <motion.div
        initial={false}
        animate={{ height: isBottomPanelExpanded ? 'auto' : '44px' }}
        className="bg-slate-900 border-t border-slate-800 text-white overflow-hidden shadow-2xl"
      >
        <div 
          className="px-6 h-11 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
          onClick={() => setIsBottomPanelExpanded(!isBottomPanelExpanded)}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-wide uppercase">CivicSense AI – Policy Insights</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Analysis Mode: Predictive</span>
            {isBottomPanelExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>

        {isBottomPanelExpanded && (
          <div className="p-6 pt-2 h-64 border-t border-slate-800">
            <div className="flex gap-8 h-full">
              {/* Tab Selector */}
              <div className="w-48 flex flex-col gap-1 border-r border-slate-800 pr-4">
                {[
                  { id: 'explanation', label: 'AI Explanation', icon: Info },
                  { id: 'long-term', label: 'Long-Term Impact', icon: Clock },
                  { id: 'suggested', label: 'Suggested Scenarios', icon: Sparkles },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-all ${
                      activeTab === tab.id ? 'bg-cyan-500/10 text-cyan-400 shadow-inner' : 'text-slate-500 hover:text-slate-300'
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
                  {activeTab === 'explanation' && (
                    <motion.div
                      key="exp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <h4 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">Reasoning Summary</h4>
                      <p className="text-sm text-slate-300 leading-relaxed font-light">
                        “The simulated drainage upgrade significantly reduces flood-related road failures by improving runoff handling capacity along Gandhi Street. While short-term traffic disruption is observed during construction, long-term emergency access and service reliability improve across the ward.”
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Key Insight</p>
                          <p className="text-xs text-slate-300 font-light">Intervention addresses 72% of surface runoff issues in the Central Zone.</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Impact Confidence</p>
                          <p className="text-xs text-slate-300 font-light">94% reliability based on historical monsoon rainfall patterns.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'long-term' && (
                    <motion.div
                      key="long"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={timelineData}>
                            <defs>
                              <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="year" stroke="#475569" style={{ fontSize: '10px' }} />
                            <YAxis hide />
                            <Area type="monotone" dataKey="resilience" stroke="#2dd4bf" fillOpacity={1} fill="url(#colorRes)" />
                            <Line type="monotone" dataKey="risk" stroke="#f43f5e" strokeWidth={2} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { y: 'Year 1', desc: 'Construction disruption peak.' },
                          { y: 'Year 2-3', desc: 'Flood risk stabilizes.' },
                          { y: 'Year 4-5', desc: 'Resilience maintained.' }
                        ].map(m => (
                          <div key={m.y} className="p-2 border-l-2 border-slate-700 bg-slate-800/50">
                            <h5 className="text-[10px] font-bold text-cyan-400">{m.y}</h5>
                            <p className="text-[10px] text-slate-400">{m.desc}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 italic">“Delayed risks are minimal, and benefits compound after the initial construction phase.”</p>
                    </motion.div>
                  )}

                  {activeTab === 'suggested' && (
                    <motion.div
                      key="sug"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="grid grid-cols-3 gap-4"
                    >
                      {[
                        { title: 'Simulate extreme rainfall', desc: 'Evaluate performance against 1-in-100 year events.' },
                        { title: 'Test phased approach', desc: 'Minimize mobility impact through segmented construction.' },
                        { title: 'Alternative routing', desc: 'Compare drainage via Nehru Lane to reduce utility risk.' }
                      ].map((card, i) => (
                        <div key={i} className="p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-cyan-500/50 transition-all cursor-pointer group">
                          <h5 className="text-xs font-bold text-white mb-2 group-hover:text-cyan-400">{card.title}</h5>
                          <p className="text-[10px] text-slate-400 leading-tight mb-4">{card.desc}</p>
                          <button className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                            Explore <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* FOOTER / STATUS BAR */}
      <div className="px-6 py-2 bg-white border-t border-slate-200 flex justify-between items-center text-[10px] font-medium text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Simulation complete · AI insights generated
          </span>
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            GenAI reasons over simulation outputs. It does not replace physical or engineering models.
          </span>
        </div>
        <div>
          Last Simulated: Feb 9, 2026 | CivicSense Core v2.4
        </div>
      </div>
    </div>
  );
}
