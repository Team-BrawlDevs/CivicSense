import { Zap, ThermometerSun, AlertTriangle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function PowerUtilitiesPage() {
  const loadData = [
    { time: '00:00', load: 280, capacity: 420, heatwave: 285 },
    { time: '04:00', load: 220, capacity: 420, heatwave: 230 },
    { time: '08:00', load: 340, capacity: 420, heatwave: 380 },
    { time: '12:00', load: 360, capacity: 420, heatwave: 410 },
    { time: '16:00', load: 380, capacity: 420, heatwave: 450 },
    { time: '20:00', load: 400, capacity: 420, heatwave: 480 },
    { time: '24:00', load: 310, capacity: 420, heatwave: 340 },
  ];

  const substations = [
    { name: 'North Substation', load: 85, capacity: 120, status: 'normal' },
    { name: 'Central Substation', load: 142, capacity: 150, status: 'high' },
    { name: 'South Substation', load: 95, capacity: 100, status: 'critical' },
    { name: 'East Substation', load: 78, capacity: 50, status: 'critical' },
  ];

  const criticalServices = [
    { service: 'Hospitals', dependency: 'Critical', backup: 'Yes', impact: 'High' },
    { service: 'Water Pumping Stations', dependency: 'Critical', backup: 'Partial', impact: 'High' },
    { service: 'Emergency Services', dependency: 'Critical', backup: 'Yes', impact: 'High' },
    { service: 'Traffic Signals', dependency: 'High', backup: 'No', impact: 'Medium' },
    { service: 'Street Lighting', dependency: 'Medium', backup: 'No', impact: 'Low' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Power & Utilities Analysis</h1>
        <p className="text-gray-600">Power grid load, transformer capacity, and critical service dependencies</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-sm text-gray-600">Peak Load Stress</div>
          </div>
          <div className="text-3xl text-red-600 mb-1">95%</div>
          <div className="text-sm text-red-700">Near capacity limit</div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <ThermometerSun className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-sm text-gray-600">Heatwave Impact</div>
          </div>
          <div className="text-3xl text-amber-600 mb-1">+14%</div>
          <div className="text-sm text-amber-700">Load increase</div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm text-gray-600">Total Capacity</div>
          </div>
          <div className="text-3xl text-slate-800 mb-1">420 MW</div>
          <div className="text-sm text-gray-500">Fixed capacity</div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-slate-600" />
            </div>
            <div className="text-sm text-gray-600">Substations at Risk</div>
          </div>
          <div className="text-3xl text-slate-800 mb-1">2</div>
          <div className="text-sm text-gray-500">of 4 total</div>
        </div>
      </div>

      {/* Load Pattern Chart */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-4">Power Load Pattern: Normal vs Heatwave Scenario</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={loadData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" stroke="#64748b" />
            <YAxis stroke="#64748b" label={{ value: 'MW', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            />
            <Line type="monotone" dataKey="load" stroke="#06b6d4" strokeWidth={2} name="Normal Load" />
            <Line type="monotone" dataKey="heatwave" stroke="#ef4444" strokeWidth={2} name="Heatwave Load" />
            <Line type="monotone" dataKey="capacity" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Capacity" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm text-red-900 mb-1">Critical Overload Warning</div>
            <div className="text-xs text-red-700">
              During heatwave conditions, peak load at 20:00 exceeds capacity by 60 MW (14%). Risk of grid failure or brownouts.
            </div>
          </div>
        </div>
      </div>

      {/* Substations and Infrastructure Map */}
      <div className="grid grid-cols-2 gap-6">
        {/* Substation Load Status */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Substation Load Status</h2>
          <div className="space-y-3">
            {substations.map((station, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${
                station.status === 'critical' ? 'bg-red-50 border-red-200' :
                station.status === 'high' ? 'bg-amber-50 border-amber-200' :
                'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-800">{station.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    station.status === 'critical' ? 'bg-red-200 text-red-800' :
                    station.status === 'high' ? 'bg-amber-200 text-amber-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {station.status === 'critical' ? 'Critical' : station.status === 'high' ? 'High Load' : 'Normal'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Load</div>
                    <div className="text-lg text-slate-800">{station.load} MW</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Capacity</div>
                    <div className="text-lg text-slate-800">{station.capacity} MW</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Utilization</div>
                    <div className={`text-lg ${
                      station.status === 'critical' ? 'text-red-600' :
                      station.status === 'high' ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {Math.round((station.load / station.capacity) * 100)}%
                    </div>
                  </div>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      station.status === 'critical' ? 'bg-red-500' :
                      station.status === 'high' ? 'bg-amber-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((station.load / station.capacity) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure Map */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Power Infrastructure Map</h2>
          <div className="bg-slate-50 rounded-lg h-[500px] relative">
            <svg viewBox="0 0 400 500" className="w-full h-full">
              {/* Ward boundary */}
              <rect x="20" y="20" width="360" height="460" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
              
              {/* Power lines */}
              <line x1="100" y1="20" x2="100" y2="480" stroke="#475569" strokeWidth="3" />
              <line x1="300" y1="20" x2="300" y2="480" stroke="#475569" strokeWidth="3" />
              <line x1="20" y1="150" x2="380" y2="150" stroke="#475569" strokeWidth="3" />
              <line x1="20" y1="350" x2="380" y2="350" stroke="#475569" strokeWidth="3" />
              
              {/* Substations */}
              {/* North - Normal */}
              <rect x="80" y="80" width="40" height="40" fill="#22c55e" stroke="#16a34a" strokeWidth="2" />
              <text x="100" y="105" textAnchor="middle" className="text-xs fill-white font-medium">N</text>
              <text x="100" y="135" textAnchor="middle" className="text-xs fill-slate-700">Normal</text>
              
              {/* Central - High */}
              <rect x="280" y="130" width="40" height="40" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
              <text x="300" y="155" textAnchor="middle" className="text-xs fill-white font-medium">C</text>
              <text x="300" y="185" textAnchor="middle" className="text-xs fill-slate-700">High Load</text>
              
              {/* South - Critical */}
              <rect x="80" y="330" width="40" height="40" fill="#ef4444" stroke="#dc2626" strokeWidth="2" />
              <text x="100" y="355" textAnchor="middle" className="text-xs fill-white font-medium">S</text>
              <circle cx="110" cy="345" r="25" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
              <text x="100" y="390" textAnchor="middle" className="text-xs fill-red-600 font-medium">Critical</text>
              
              {/* East - Critical */}
              <rect x="280" y="380" width="40" height="40" fill="#ef4444" stroke="#dc2626" strokeWidth="2" />
              <text x="300" y="405" textAnchor="middle" className="text-xs fill-white font-medium">E</text>
              <circle cx="310" cy="395" r="25" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
              <text x="300" y="440" textAnchor="middle" className="text-xs fill-red-600 font-medium">Critical</text>
              
              {/* Critical service markers */}
              <circle cx="200" cy="250" r="8" fill="#06b6d4" stroke="white" strokeWidth="2" />
              <text x="200" y="245" textAnchor="middle" className="text-xs fill-white">H</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Critical Service Dependencies */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-4">Critical Service Dependencies</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm text-gray-600">Service</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Power Dependency</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Backup Power</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Failure Impact</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {criticalServices.map((service, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-slate-800">{service.service}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs ${
                      service.dependency === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {service.dependency}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs ${
                      service.backup === 'Yes' ? 'bg-green-100 text-green-800' :
                      service.backup === 'Partial' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {service.backup}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs ${
                      service.impact === 'High' ? 'bg-red-100 text-red-800' :
                      service.impact === 'Medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {service.impact}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {service.dependency === 'Critical' && service.backup !== 'Yes' ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
