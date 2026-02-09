import { ArrowRight, AlertCircle, Car, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function MobilityAnalysisPage() {
  const congestionData = [
    { road: 'Main St', before: 45, after: 72 },
    { road: 'Park Ave', before: 30, after: 38 },
    { road: 'River Rd', before: 65, after: 88 },
    { road: 'Hill St', before: 28, after: 35 },
    { road: 'Lake Dr', before: 52, after: 68 },
  ];

  const metrics = [
    { label: 'Avg Travel Time', before: '18 min', after: '27 min', change: '+50%', status: 'danger' },
    { label: 'Peak Hour Congestion', before: '45%', after: '72%', change: '+60%', status: 'danger' },
    { label: 'Emergency Vehicle Access', before: '92%', after: '68%', change: '-26%', status: 'danger' },
    { label: 'Public Transit Delay', before: '8 min', after: '19 min', change: '+138%', status: 'warning' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Mobility & Transportation Analysis</h1>
        <p className="text-gray-600">Traffic flow, congestion patterns, and emergency vehicle accessibility</p>
      </div>

      {/* Before vs After Comparison Cards */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-300 p-5">
            <div className="text-sm text-gray-600 mb-3">{metric.label}</div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Before</div>
                <div className="text-xl text-slate-800">{metric.before}</div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">After</div>
                <div className="text-xl text-slate-800">{metric.after}</div>
              </div>
            </div>
            <div className={`text-sm flex items-center gap-1 ${
              metric.status === 'danger' ? 'text-red-600' : 'text-amber-600'
            }`}>
              <TrendingUp className="w-4 h-4" />
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* Traffic Heatmap and Congestion Chart */}
      <div className="grid grid-cols-2 gap-6">
        {/* Traffic Heatmap */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Traffic Heatmap - Peak Hour</h2>
          <div className="bg-slate-50 rounded-lg h-80 relative overflow-hidden">
            <svg viewBox="0 0 400 320" className="w-full h-full">
              {/* Road network */}
              <line x1="50" y1="80" x2="350" y2="80" stroke="#ef4444" strokeWidth="12" opacity="0.8" />
              <line x1="50" y1="160" x2="350" y2="160" stroke="#f59e0b" strokeWidth="10" opacity="0.8" />
              <line x1="50" y1="240" x2="350" y2="240" stroke="#22c55e" strokeWidth="8" opacity="0.8" />
              
              <line x1="120" y1="40" x2="120" y2="280" stroke="#f59e0b" strokeWidth="9" opacity="0.8" />
              <line x1="280" y1="40" x2="280" y2="280" stroke="#ef4444" strokeWidth="11" opacity="0.8" />
              
              {/* Vehicle markers */}
              <g>
                <rect x="100" y="75" width="8" height="10" fill="#dc2626" />
                <rect x="140" y="75" width="8" height="10" fill="#dc2626" />
                <rect x="180" y="155" width="8" height="10" fill="#f97316" />
                <rect x="220" y="155" width="8" height="10" fill="#f97316" />
              </g>
              
              {/* Legend */}
              <g transform="translate(20, 290)">
                <line x1="0" y1="0" x2="20" y2="0" stroke="#22c55e" strokeWidth="4" />
                <text x="25" y="5" className="text-xs fill-slate-700">Low</text>
                
                <line x1="80" y1="0" x2="100" y2="0" stroke="#f59e0b" strokeWidth="4" />
                <text x="105" y="5" className="text-xs fill-slate-700">Medium</text>
                
                <line x1="180" y1="0" x2="200" y2="0" stroke="#ef4444" strokeWidth="4" />
                <text x="205" y="5" className="text-xs fill-slate-700">High</text>
              </g>
            </svg>
          </div>
        </div>

        {/* Congestion Comparison */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Road Congestion: Before vs After</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={congestionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="road" stroke="#64748b" />
              <YAxis stroke="#64748b" label={{ value: 'Congestion %', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
              />
              <Bar dataKey="before" fill="#06b6d4" name="Before" />
              <Bar dataKey="after" fill="#ef4444" name="After" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rerouted Paths and Emergency Access */}
      <div className="grid grid-cols-2 gap-6">
        {/* Rerouted Paths */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Recommended Rerouted Paths</h2>
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-800">Main St → Park Ave</span>
                <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">Priority 1</span>
              </div>
              <div className="text-xs text-gray-600">Reduces congestion by 18%</div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-800">River Rd → Hill St</span>
                <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">Priority 2</span>
              </div>
              <div className="text-xs text-gray-600">Reduces congestion by 12%</div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-800">Lake Dr (alternative)</span>
                <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">Priority 3</span>
              </div>
              <div className="text-xs text-gray-600">Reduces congestion by 8%</div>
            </div>
          </div>
        </div>

        {/* Emergency Vehicle Accessibility */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-slate-800">Emergency Vehicle Accessibility</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800">Critical Impact</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Response Time (Hospital Access)</span>
                <span className="text-red-600">+45%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '72%' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>8 min → 11.6 min</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Fire Station Coverage</span>
                <span className="text-amber-600">-18%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '68%' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>92% → 75% accessible</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Ambulance Route Blockage</span>
                <span className="text-red-600">+65%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '85%' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>4 blocked routes → 11 blocked routes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
