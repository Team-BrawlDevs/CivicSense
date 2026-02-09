import { Droplet, AlertTriangle, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function DrainageAnalysisPage() {
  const rainfallData = [
    { time: '00:00', rainfall: 12, capacity: 80, usage: 15 },
    { time: '02:00', rainfall: 18, capacity: 80, usage: 23 },
    { time: '04:00', rainfall: 45, capacity: 80, usage: 56 },
    { time: '06:00', rainfall: 68, capacity: 80, usage: 85 },
    { time: '08:00', rainfall: 82, capacity: 80, usage: 103 },
    { time: '10:00', rainfall: 75, capacity: 80, usage: 94 },
    { time: '12:00', rainfall: 52, capacity: 80, usage: 65 },
  ];

  const floodZones = [
    { area: 'River Basin North', severity: 'High', population: 8200, roads: 12 },
    { area: 'Low-lying Residential Zone', severity: 'High', population: 5600, roads: 8 },
    { area: 'Central Business District', severity: 'Medium', population: 3200, roads: 15 },
    { area: 'Industrial Park', severity: 'Low', population: 450, roads: 6 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Drainage & Flood Risk Analysis</h1>
        <p className="text-gray-600">Drainage network capacity, flood-prone zones, and rainfall impact assessment</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <Droplet className="w-8 h-8 text-red-600" />
            <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded">Critical</span>
          </div>
          <div className="text-sm text-gray-600 mb-1">Peak Capacity Usage</div>
          <div className="text-3xl text-red-600 mb-1">103%</div>
          <div className="text-xs text-gray-500">Exceeds design limit</div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
            <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs rounded">High Risk</span>
          </div>
          <div className="text-sm text-gray-600 mb-1">Flood-Prone Areas</div>
          <div className="text-3xl text-amber-600 mb-1">4</div>
          <div className="text-xs text-gray-500">zones identified</div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="w-8 h-8 text-blue-600" />
            <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">Info</span>
          </div>
          <div className="text-sm text-gray-600 mb-1">Population Affected</div>
          <div className="text-3xl text-blue-600 mb-1">17.4K</div>
          <div className="text-xs text-gray-500">across all zones</div>
        </div>

        <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <Droplet className="w-8 h-8 text-slate-600" />
            <span className="px-2 py-1 bg-slate-200 text-slate-800 text-xs rounded">Monitored</span>
          </div>
          <div className="text-sm text-gray-600 mb-1">Drainage Network</div>
          <div className="text-3xl text-slate-600 mb-1">850 km</div>
          <div className="text-xs text-gray-500">total pipeline</div>
        </div>
      </div>

      {/* Rainfall vs Drainage Load Chart */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-4">Rainfall vs Drainage Capacity (24hr Simulation)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={rainfallData}>
            <defs>
              <linearGradient id="colorRainfall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" stroke="#64748b" />
            <YAxis stroke="#64748b" label={{ value: 'mm/hr', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            />
            <Area type="monotone" dataKey="rainfall" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRainfall)" name="Rainfall" />
            <Area type="monotone" dataKey="usage" stroke="#ef4444" fillOpacity={1} fill="url(#colorUsage)" name="Capacity Usage" />
            <Line type="monotone" dataKey="capacity" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Design Capacity" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span className="text-gray-600">Rainfall Intensity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-gray-600">Drainage Usage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-green-500 rounded" />
            <span className="text-gray-600">Design Capacity</span>
          </div>
        </div>
      </div>

      {/* Flood-Prone Zones and Affected Areas */}
      <div className="grid grid-cols-2 gap-6">
        {/* Flood Zone Map */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Flood-Prone Zone Overlay</h2>
          <div className="bg-slate-50 rounded-lg h-80 relative">
            <svg viewBox="0 0 400 320" className="w-full h-full">
              {/* Ward boundary */}
              <rect x="20" y="20" width="360" height="280" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
              
              {/* Flood zones */}
              <ellipse cx="120" cy="100" rx="80" ry="60" fill="#ef4444" opacity="0.5" />
              <text x="120" y="105" textAnchor="middle" className="text-xs fill-slate-700">High Risk</text>
              
              <ellipse cx="300" cy="140" rx="70" ry="55" fill="#ef4444" opacity="0.5" />
              <text x="300" y="145" textAnchor="middle" className="text-xs fill-slate-700">High Risk</text>
              
              <ellipse cx="200" cy="230" rx="90" ry="50" fill="#f59e0b" opacity="0.5" />
              <text x="200" y="235" textAnchor="middle" className="text-xs fill-slate-700">Medium Risk</text>
              
              <ellipse cx="80" cy="250" rx="50" ry="40" fill="#22c55e" opacity="0.4" />
              <text x="80" y="255" textAnchor="middle" className="text-xs fill-slate-700">Low</text>
              
              {/* Drainage network lines */}
              <line x1="50" y1="120" x2="350" y2="120" stroke="#06b6d4" strokeWidth="3" opacity="0.6" />
              <line x1="50" y1="200" x2="350" y2="200" stroke="#06b6d4" strokeWidth="3" opacity="0.6" />
              <line x1="150" y1="40" x2="150" y2="280" stroke="#06b6d4" strokeWidth="3" opacity="0.6" />
              
              {/* Legend */}
              <g transform="translate(250, 20)">
                <rect x="0" y="0" width="120" height="75" fill="white" stroke="#cbd5e1" strokeWidth="1" />
                <text x="5" y="15" className="text-xs fill-slate-700">Flood Severity</text>
                <circle cx="10" cy="30" r="6" fill="#ef4444" opacity="0.6" />
                <text x="20" y="35" className="text-xs fill-slate-700">High</text>
                <circle cx="10" cy="48" r="6" fill="#f59e0b" opacity="0.6" />
                <text x="20" y="53" className="text-xs fill-slate-700">Medium</text>
                <circle cx="10" cy="66" r="6" fill="#22c55e" opacity="0.6" />
                <text x="20" y="71" className="text-xs fill-slate-700">Low</text>
              </g>
            </svg>
          </div>
        </div>

        {/* Affected Roads and Neighborhoods */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Affected Areas Detail</h2>
          <div className="space-y-3">
            {floodZones.map((zone, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border-2 ${
                  zone.severity === 'High' ? 'bg-red-50 border-red-200' :
                  zone.severity === 'Medium' ? 'bg-amber-50 border-amber-200' :
                  'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-800">{zone.area}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    zone.severity === 'High' ? 'bg-red-200 text-red-800' :
                    zone.severity === 'Medium' ? 'bg-amber-200 text-amber-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {zone.severity} Risk
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mt-3">
                  <div>
                    <div className="text-gray-500">Population</div>
                    <div className="text-slate-800">{zone.population.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Roads Affected</div>
                    <div className="text-slate-800">{zone.roads} roads</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
