import { Droplets, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export function WaterSupplyPage() {
  const demandSupplyData = [
    { hour: '00:00', demand: 1200, supply: 1800 },
    { hour: '04:00', demand: 800, supply: 1800 },
    { hour: '08:00', demand: 2400, supply: 1800 },
    { hour: '12:00', demand: 1900, supply: 1800 },
    { hour: '16:00', demand: 2100, supply: 1800 },
    { hour: '20:00', demand: 2600, supply: 1800 },
    { hour: '24:00', demand: 1500, supply: 1800 },
  ];

  const zoneStress = [
    { zone: 'Zone A', stress: 38, population: 8200 },
    { zone: 'Zone B', stress: 72, population: 12400 },
    { zone: 'Zone C', stress: 55, population: 9800 },
    { zone: 'Zone D', stress: 45, population: 7500 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Water Supply Analysis</h1>
        <p className="text-gray-600">Demand vs supply patterns, water stress indicators, and service continuity</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-300 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Droplets className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm text-gray-600">Total Demand</div>
          </div>
          <div className="text-3xl text-slate-800 mb-1">18.2 ML/d</div>
          <div className="text-sm text-green-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +8% from baseline
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Droplets className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="text-sm text-gray-600">Supply Capacity</div>
          </div>
          <div className="text-3xl text-slate-800 mb-1">21.6 ML/d</div>
          <div className="text-sm text-gray-500">Fixed capacity</div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-sm text-gray-600">Peak Stress</div>
          </div>
          <div className="text-3xl text-amber-600 mb-1">72%</div>
          <div className="text-sm text-amber-700">Zone B critical</div>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-sm text-gray-600">Service Continuity</div>
          </div>
          <div className="text-3xl text-green-600 mb-1">94%</div>
          <div className="text-sm text-green-700">Within target</div>
        </div>
      </div>

      {/* Demand vs Supply Chart */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-4">24-Hour Demand vs Supply Pattern</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={demandSupplyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="hour" stroke="#64748b" />
            <YAxis stroke="#64748b" label={{ value: 'ML/day', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            />
            <Line type="monotone" dataKey="demand" stroke="#ef4444" strokeWidth={2} name="Demand" />
            <Line type="monotone" dataKey="supply" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" name="Supply Capacity" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm text-amber-900 mb-1">Peak Demand Alert</div>
            <div className="text-xs text-amber-700">
              Peak demand at 20:00 exceeds supply capacity by 44%. Service disruption likely during peak hours.
            </div>
          </div>
        </div>
      </div>

      {/* Water Stress Heatmap and Zone Analysis */}
      <div className="grid grid-cols-2 gap-6">
        {/* Zone Stress Levels */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Water Stress by Zone</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={zoneStress} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#64748b" domain={[0, 100]} />
              <YAxis dataKey="zone" type="category" stroke="#64748b" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
              />
              <Bar dataKey="stress" fill="#06b6d4" name="Stress %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stress Heatmap Visualization */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Water Stress Heatmap</h2>
          <div className="bg-slate-50 rounded-lg h-[250px] relative">
            <svg viewBox="0 0 400 250" className="w-full h-full">
              {/* Ward boundary */}
              <rect x="20" y="20" width="360" height="210" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
              
              {/* Stress zones */}
              <rect x="30" y="30" width="160" height="90" fill="#22c55e" opacity="0.4" />
              <text x="110" y="80" textAnchor="middle" className="text-sm fill-slate-700">Zone A</text>
              <text x="110" y="95" textAnchor="middle" className="text-xs fill-slate-600">38%</text>
              
              <rect x="210" y="30" width="160" height="90" fill="#ef4444" opacity="0.6" />
              <text x="290" y="80" textAnchor="middle" className="text-sm fill-white font-medium">Zone B</text>
              <text x="290" y="95" textAnchor="middle" className="text-xs fill-white">72%</text>
              
              <rect x="30" y="135" width="160" height="85" fill="#f59e0b" opacity="0.5" />
              <text x="110" y="180" textAnchor="middle" className="text-sm fill-slate-700">Zone C</text>
              <text x="110" y="195" textAnchor="middle" className="text-xs fill-slate-600">55%</text>
              
              <rect x="210" y="135" width="160" height="85" fill="#22c55e" opacity="0.5" />
              <text x="290" y="180" textAnchor="middle" className="text-sm fill-slate-700">Zone D</text>
              <text x="290" y="195" textAnchor="middle" className="text-xs fill-slate-600">45%</text>
              
              {/* Water pipelines */}
              <line x1="110" y1="20" x2="110" y2="230" stroke="#06b6d4" strokeWidth="4" />
              <line x1="290" y1="20" x2="290" y2="230" stroke="#06b6d4" strokeWidth="4" />
              <line x1="20" y1="125" x2="380" y2="125" stroke="#06b6d4" strokeWidth="4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Peak Demand Alerts and Service Continuity */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Peak Demand Alerts</h2>
          <div className="space-y-3">
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-800">Zone B - Evening Peak (20:00)</span>
                <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded">Critical</span>
              </div>
              <div className="text-xs text-gray-600 mb-2">
                Demand exceeds capacity by 44%. Population affected: 12,400
              </div>
              <div className="text-xs text-red-700">
                Recommendation: Implement water scheduling or increase supply
              </div>
            </div>

            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-800">Zone C - Morning Peak (08:00)</span>
                <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs rounded">Warning</span>
              </div>
              <div className="text-xs text-gray-600 mb-2">
                Demand at 55% of capacity. Population affected: 9,800
              </div>
              <div className="text-xs text-amber-700">
                Recommendation: Monitor closely during peak hours
              </div>
            </div>

            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-800">Zones A & D</span>
                <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded">Normal</span>
              </div>
              <div className="text-xs text-gray-600">
                Supply adequate. No immediate action required.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Service Continuity Indicators</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Overall Service Coverage</span>
                <span className="text-green-600">94%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '94%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Peak Hour Reliability</span>
                <span className="text-amber-600">68%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '68%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Pipeline Network Health</span>
                <span className="text-green-600">88%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '88%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Emergency Reserve Capacity</span>
                <span className="text-blue-600">16%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '16%' }} />
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-sm text-blue-900 mb-1">Service Target: 95%</div>
              <div className="text-xs text-blue-700">
                Current performance: 94%. Within acceptable range but requires monitoring.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
