import { GitBranch, AlertTriangle, ArrowRight } from 'lucide-react';

export function CrossSystemImpactPage() {
  const cascadingEffects = [
    { 
      trigger: 'Extreme Rainfall', 
      chain: [
        { system: 'Drainage', impact: 'Overflow', severity: 'high' },
        { system: 'Traffic', impact: 'Road Flooding', severity: 'high' },
        { system: 'Emergency Response', impact: 'Delayed Access', severity: 'critical' },
        { system: 'Public Services', impact: 'Hospital Isolation', severity: 'critical' },
      ]
    },
  ];

  const vulnerabilityHotspots = [
    { location: 'River Basin North', systems: ['Drainage', 'Traffic', 'Power'], risk: 'Critical' },
    { location: 'Central Business District', systems: ['Water', 'Power', 'Emergency'], risk: 'High' },
    { location: 'Residential Zone East', systems: ['Drainage', 'Waste', 'Water'], risk: 'Medium' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Cross-System Impact Analysis</h1>
        <p className="text-gray-600">Cascading effects, interdependencies, and vulnerability hotspots</p>
      </div>

      {/* Cascading Effects Diagram */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-6">Cascading Impact Flow</h2>
        {cascadingEffects.map((effect, idx) => (
          <div key={idx}>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg inline-block">
              <div className="text-sm text-blue-900">Trigger Event</div>
              <div className="text-lg text-blue-800 font-medium">{effect.trigger}</div>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              {effect.chain.map((step, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`flex-1 p-4 rounded-lg border-2 min-w-[200px] ${
                    step.severity === 'critical' ? 'bg-red-50 border-red-300' :
                    step.severity === 'high' ? 'bg-amber-50 border-amber-300' :
                    'bg-yellow-50 border-yellow-300'
                  }`}>
                    <div className="text-xs text-gray-600 mb-1">Step {index + 1}</div>
                    <div className="text-sm text-slate-800 mb-1">{step.system}</div>
                    <div className="text-xs text-slate-600 mb-2">{step.impact}</div>
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      step.severity === 'critical' ? 'bg-red-200 text-red-800' :
                      step.severity === 'high' ? 'bg-amber-200 text-amber-800' :
                      'bg-yellow-200 text-yellow-800'
                    }`}>
                      {step.severity}
                    </span>
                  </div>
                  {index < effect.chain.length - 1 && (
                    <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* System Dependency Matrix */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-4">System Interdependency Matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm text-gray-600">System</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Power</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Water</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Traffic</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Drainage</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Emergency</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-slate-800">Power</td>
                <td className="py-3 px-4 text-center">-</td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">High</span></td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">Med</span></td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">Med</span></td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">High</span></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-slate-800">Water</td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">High</span></td>
                <td className="py-3 px-4 text-center">-</td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Low</span></td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">Med</span></td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">Med</span></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-slate-800">Traffic</td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Low</span></td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Low</span></td>
                <td className="py-3 px-4 text-center">-</td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">High</span></td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">High</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Vulnerability Hotspots */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Vulnerability Hotspots</h2>
          <div className="space-y-3">
            {vulnerabilityHotspots.map((hotspot, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${
                hotspot.risk === 'Critical' ? 'bg-red-50 border-red-200' :
                hotspot.risk === 'High' ? 'bg-amber-50 border-amber-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-800">{hotspot.location}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    hotspot.risk === 'Critical' ? 'bg-red-200 text-red-800' :
                    hotspot.risk === 'High' ? 'bg-amber-200 text-amber-800' :
                    'bg-yellow-200 text-yellow-800'
                  }`}>
                    {hotspot.risk} Risk
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {hotspot.systems.map((system, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700">
                      {system}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Interdependency Insights</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <GitBranch className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-sm text-blue-900 mb-1">Power-Water Dependency</div>
                  <div className="text-xs text-blue-700">
                    Water supply depends critically on power for pumping stations. Power failure leads to water service disruption within 4 hours.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-sm text-amber-900 mb-1">Drainage-Traffic Cascade</div>
                  <div className="text-xs text-amber-700">
                    Drainage overflow causes road flooding, which blocks emergency vehicle access. This creates a critical failure cascade affecting public safety.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-sm text-red-900 mb-1">Multi-System Vulnerability</div>
                  <div className="text-xs text-red-700">
                    River Basin North is a critical vulnerability hotspot where drainage, traffic, and power systems converge. Single point of failure risk.
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
