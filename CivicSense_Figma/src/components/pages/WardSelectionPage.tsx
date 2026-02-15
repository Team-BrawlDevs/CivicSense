import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface WardSelectionPageProps {
  onSelectWard: (ward: string) => void;
}

export function WardSelectionPage({ onSelectWard }: WardSelectionPageProps) {
  const wards = [
    { id: 42, name: 'Ward 42', zone: 'North', population: 45200, selected: false },
    { id: 43, name: 'Ward 43', zone: 'North', population: 38900, selected: true },
    { id: 44, name: 'Ward 44', zone: 'East', population: 52100, selected: false },
    { id: 45, name: 'Ward 45', zone: 'East', population: 41800, selected: false },
    { id: 46, name: 'Ward 46', zone: 'South', population: 48300, selected: false },
  ];

  const selectedWard = wards.find(w => w.selected) || wards[1];

  const populationTrend = [
    { year: '2020', population: 32000 },
    { year: '2021', population: 35000 },
    { year: '2022', population: 36500 },
    { year: '2023', population: 37800 },
    { year: '2024', population: 38200 },
    { year: '2025', population: 38900 },
    { year: '2026', population: 39800 },
    { year: '2027', population: 41200 },
    { year: '2028', population: 42800 },
    { year: '2029', population: 44500 },
    { year: '2030', population: 46200 },
  ];

  const baselineMetrics = [
    { 
      label: 'Population', 
      value: '38,900', 
      trend: '+2.1%', 
      trendUp: true, 
      icon: '👥',
      status: 'good'
    },
    { 
      label: 'Area', 
      value: '12.8 km²', 
      trend: 'Fixed', 
      trendUp: null, 
      icon: '📐',
      status: 'neutral'
    },
    { 
      label: 'Density', 
      value: '3,039/km²', 
      trend: '+1.8%', 
      trendUp: true, 
      icon: '🏙️',
      status: 'warning'
    },
    { 
      label: 'Flood Risk', 
      value: 'Medium', 
      trend: 'Stable', 
      trendUp: null, 
      icon: '💧',
      status: 'warning'
    },
    { 
      label: 'Infrastructure Coverage', 
      value: '89%', 
      trend: '+3.2%', 
      trendUp: true, 
      icon: '🏗️',
      status: 'good'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl text-white mb-3">Ward Selection & Baseline Profile</h1>
          <p className="text-gray-400 text-lg">Select a ward to analyze and view baseline metrics</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Map & Ward List */}
          <div className="col-span-1">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-white mb-4">City Map</h2>
              <div className="bg-slate-700 rounded-lg h-80 flex items-center justify-center relative overflow-hidden">
                {/* Simplified ward map visualization */}
                <svg viewBox="0 0 300 300" className="w-full h-full">
                  {/* Ward boundaries */}
                  <path d="M 50 50 L 150 50 L 150 150 L 50 150 Z" 
                        className="fill-slate-600 stroke-slate-500 stroke-2 hover:fill-slate-500 cursor-pointer" />
                  <path d="M 150 50 L 250 50 L 250 150 L 150 150 Z" 
                        className="fill-cyan-600 stroke-cyan-400 stroke-2 hover:fill-cyan-500 cursor-pointer" />
                  <path d="M 50 150 L 150 150 L 150 250 L 50 250 Z" 
                        className="fill-slate-600 stroke-slate-500 stroke-2 hover:fill-slate-500 cursor-pointer" />
                  <path d="M 150 150 L 250 150 L 250 250 L 150 250 Z" 
                        className="fill-slate-600 stroke-slate-500 stroke-2 hover:fill-slate-500 cursor-pointer" />
                  
                  {/* Ward labels */}
                  <text x="100" y="105" className="fill-white text-sm" textAnchor="middle">W42</text>
                  <text x="200" y="105" className="fill-white text-sm" textAnchor="middle">W43</text>
                  <text x="100" y="205" className="fill-white text-sm" textAnchor="middle">W44</text>
                  <text x="200" y="205" className="fill-white text-sm" textAnchor="middle">W45</text>
                </svg>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-white mb-4">Available Wards</h2>
              <div className="space-y-2">
                {wards.map(ward => (
                  <button
                    key={ward.id}
                    onClick={() => onSelectWard(ward.name)}
                    className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                      ward.selected 
                        ? 'bg-cyan-600 text-white' 
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{ward.name}</div>
                        <div className="text-sm opacity-75">{ward.zone} Zone</div>
                      </div>
                      <div className="text-sm">{(ward.population / 1000).toFixed(1)}K</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Baseline Metrics & Trends */}
          <div className="col-span-2 space-y-6">
            {/* Baseline Metrics */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-white mb-6">Baseline Metrics - {selectedWard.name}</h2>
              <div className="grid grid-cols-3 gap-4">
                {baselineMetrics.map((metric, index) => (
                  <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{metric.icon}</span>
                      {metric.status === 'good' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                      {metric.status === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div className="text-gray-400 text-sm mb-2">{metric.label}</div>
                    <div className="text-white text-2xl mb-2">{metric.value}</div>
                    <div className={`text-sm flex items-center gap-1 ${
                      metric.trendUp === true ? 'text-green-400' : 
                      metric.trendUp === false ? 'text-red-400' : 
                      'text-gray-400'
                    }`}>
                      {metric.trendUp === true && <TrendingUp className="w-4 h-4" />}
                      {metric.trendUp === false && <TrendingDown className="w-4 h-4" />}
                      {metric.trend}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Population Trend */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-white mb-4">Population Trend (2020–2030)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={populationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="year" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="population" stroke="#06b6d4" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Action Button */}
            <button
              onClick={() => onSelectWard(selectedWard.name)}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-lg"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
