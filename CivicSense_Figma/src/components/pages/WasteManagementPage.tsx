import { Trash2, TrendingUp, MapPin, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function WasteManagementPage() {
  const generationData = [
    { zone: 'Zone A', generation: 45, capacity: 50 },
    { zone: 'Zone B', generation: 62, capacity: 55 },
    { zone: 'Zone C', generation: 38, capacity: 45 },
    { zone: 'Zone D', generation: 35, capacity: 50 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Waste Management Analysis</h1>
        <p className="text-gray-600">Generation patterns, collection efficiency, and sanitation risk zones</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-300 rounded-lg p-5">
          <Trash2 className="w-8 h-8 text-emerald-600 mb-3" />
          <div className="text-sm text-gray-600 mb-1">Total Generation</div>
          <div className="text-3xl text-slate-800">180 TPD</div>
        </div>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-5">
          <AlertCircle className="w-8 h-8 text-amber-600 mb-3" />
          <div className="text-sm text-gray-600 mb-1">Overflow Risk Zones</div>
          <div className="text-3xl text-amber-600">3</div>
        </div>
        <div className="bg-white border border-gray-300 rounded-lg p-5">
          <TrendingUp className="w-8 h-8 text-blue-600 mb-3" />
          <div className="text-sm text-gray-600 mb-1">Collection Efficiency</div>
          <div className="text-3xl text-slate-800">87%</div>
        </div>
        <div className="bg-white border border-gray-300 rounded-lg p-5">
          <MapPin className="w-8 h-8 text-slate-600 mb-3" />
          <div className="text-sm text-gray-600 mb-1">Collection Points</div>
          <div className="text-3xl text-slate-800">142</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Waste Generation by Zone</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={generationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="zone" stroke="#64748b" />
              <YAxis stroke="#64748b" label={{ value: 'TPD', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="generation" fill="#10b981" name="Generation" />
              <Bar dataKey="capacity" fill="#e5e7eb" name="Capacity" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Collection Route Efficiency</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-800">Route A (North)</span>
                <span className="text-sm text-green-600">92% efficient</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }} />
              </div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-800">Route B (Central)</span>
                <span className="text-sm text-amber-600">68% efficient</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '68%' }} />
              </div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-800">Route C (South)</span>
                <span className="text-sm text-green-600">85% efficient</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
