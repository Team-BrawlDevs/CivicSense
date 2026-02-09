import { ArrowRight, Shield, AlertTriangle } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

export function ImpactEvaluationPage() {
  const impactData = [
    { system: 'Mobility', before: 65, after: 42 },
    { system: 'Drainage', before: 72, after: 38 },
    { system: 'Water', before: 80, after: 55 },
    { system: 'Power', before: 75, after: 48 },
    { system: 'Waste', before: 88, after: 82 },
    { system: 'Emergency', before: 85, after: 52 },
  ];

  const resilienceData = [
    { category: 'Mobility', score: 42 },
    { category: 'Drainage', score: 38 },
    { category: 'Water', score: 55 },
    { category: 'Power', score: 48 },
    { category: 'Waste', score: 82 },
    { category: 'Services', score: 52 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Impact Evaluation & Risk Assessment</h1>
        <p className="text-gray-600">Before vs after comparison, system-level impacts, and resilience scoring</p>
      </div>

      {/* Overall Risk Classification */}
      <div className="bg-gradient-to-r from-red-50 to-amber-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Overall Ward Risk Classification</div>
              <div className="text-4xl text-red-600 mb-1">High Risk</div>
              <div className="text-sm text-red-700">Multiple critical systems affected - immediate intervention required</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Resilience Score</div>
            <div className="text-5xl text-amber-600">52/100</div>
          </div>
        </div>
      </div>

      {/* Before vs After Comparison Table */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-4">System-wise Impact Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 text-sm text-gray-600">System</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Before (Baseline)</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">After (Scenario)</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Change</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Impact Score</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Severity</th>
              </tr>
            </thead>
            <tbody>
              {impactData.map((item, index) => {
                const change = item.after - item.before;
                const impactScore = Math.abs(change);
                return (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm text-slate-800">{item.system}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 text-green-700">
                        {item.before}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${
                        item.after >= 70 ? 'bg-green-100 text-green-700' :
                        item.after >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.after}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ArrowRight className={`w-4 h-4 ${change < 0 ? 'text-red-600' : 'text-green-600'}`} />
                        <span className={change < 0 ? 'text-red-600' : 'text-green-600'}>
                          {change > 0 ? '+' : ''}{change}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded ${
                        impactScore >= 30 ? 'bg-red-100 text-red-800' :
                        impactScore >= 15 ? 'bg-amber-100 text-amber-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {impactScore}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded text-xs ${
                        impactScore >= 30 ? 'bg-red-200 text-red-800' :
                        impactScore >= 15 ? 'bg-amber-200 text-amber-800' :
                        'bg-green-200 text-green-800'
                      }`}>
                        {impactScore >= 30 ? 'High' : impactScore >= 15 ? 'Medium' : 'Low'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resilience Score Visualization */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Resilience Score by Category</h2>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={resilienceData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="category" stroke="#64748b" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#64748b" />
              <Radar name="Resilience" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Key Findings & Recommendations</h2>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-red-900 mb-1">Critical: Drainage System</div>
                  <div className="text-xs text-red-700">
                    Performance drops 47%. Recommend immediate capacity upgrade and flood mitigation infrastructure.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-red-900 mb-1">Critical: Emergency Services</div>
                  <div className="text-xs text-red-700">
                    Response capability reduced by 39%. Establish alternative routes and expand emergency vehicle access corridors.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-amber-900 mb-1">Warning: Power Grid</div>
                  <div className="text-xs text-amber-700">
                    Load stress increases significantly. Consider distributed generation and demand management strategies.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-green-900 mb-1">Resilient: Waste Management</div>
                  <div className="text-xs text-green-700">
                    System shows good resilience. Maintain current operational standards.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
