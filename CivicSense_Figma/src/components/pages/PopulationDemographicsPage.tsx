import { Users, TrendingUp, Home, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function PopulationDemographicsPage() {
  const projectionData = [
    { year: 2024, population: 38900, housing: 8200, infrastructure: 89 },
    { year: 2026, population: 42100, housing: 8600, infrastructure: 87 },
    { year: 2028, population: 45800, housing: 9100, infrastructure: 84 },
    { year: 2030, population: 49200, housing: 9500, infrastructure: 81 },
    { year: 2032, population: 52800, housing: 9900, infrastructure: 78 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Population & Demographics Analysis</h1>
        <p className="text-gray-600">Growth projections, density patterns, and infrastructure adequacy forecasts</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-300 rounded-lg p-5">
          <Users className="w-8 h-8 text-blue-600 mb-3" />
          <div className="text-sm text-gray-600 mb-1">Current Population</div>
          <div className="text-3xl text-slate-800">38,900</div>
        </div>
        <div className="bg-white border border-gray-300 rounded-lg p-5">
          <TrendingUp className="w-8 h-8 text-green-600 mb-3" />
          <div className="text-sm text-gray-600 mb-1">Growth Rate (Annual)</div>
          <div className="text-3xl text-slate-800">+3.8%</div>
        </div>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-5">
          <Home className="w-8 h-8 text-amber-600 mb-3" />
          <div className="text-sm text-gray-600 mb-1">2030 Projection</div>
          <div className="text-3xl text-amber-600">49,200</div>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-5">
          <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
          <div className="text-sm text-gray-600 mb-1">Infrastructure Gap</div>
          <div className="text-3xl text-red-600">-19%</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-4">Population Growth Projection (2024-2032)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={projectionData}>
            <defs>
              <linearGradient id="colorPop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Area type="monotone" dataKey="population" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPop)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Infrastructure Adequacy Forecast</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" stroke="#64748b" />
              <YAxis stroke="#64748b" label={{ value: '%', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="infrastructure" stroke="#ef4444" strokeWidth={2} name="Adequacy %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Long-term Stress Indicators</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Housing Demand Stress</span>
                <span className="text-red-600">High</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '78%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Water Infrastructure Stress</span>
                <span className="text-amber-600">Medium</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '62%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Transportation Stress</span>
                <span className="text-red-600">High</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
