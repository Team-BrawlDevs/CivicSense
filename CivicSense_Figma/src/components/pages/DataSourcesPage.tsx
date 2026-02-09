import { Database, CheckCircle2, AlertCircle, Clock, Shield } from 'lucide-react';

export function DataSourcesPage() {
  const dataSources = [
    { 
      name: 'OpenStreetMap', 
      category: 'Geospatial',
      coverage: 95,
      reliability: 'High',
      lastUpdate: '2026-01-28',
      frequency: 'Weekly',
      status: 'active'
    },
    { 
      name: 'Census Data 2021', 
      category: 'Demographics',
      coverage: 100,
      reliability: 'Very High',
      lastUpdate: '2021-03-15',
      frequency: 'Every 10 years',
      status: 'active'
    },
    { 
      name: 'Municipal Infrastructure DB', 
      category: 'Infrastructure',
      coverage: 88,
      reliability: 'High',
      lastUpdate: '2026-01-25',
      frequency: 'Monthly',
      status: 'active'
    },
    { 
      name: 'Weather & Climate API', 
      category: 'Environmental',
      coverage: 92,
      reliability: 'High',
      lastUpdate: '2026-01-30',
      frequency: 'Real-time',
      status: 'active'
    },
    { 
      name: 'Traffic Sensor Network', 
      category: 'Mobility',
      coverage: 78,
      reliability: 'Medium',
      lastUpdate: '2026-01-29',
      frequency: 'Real-time',
      status: 'partial'
    },
    { 
      name: 'Water Supply Monitoring', 
      category: 'Utilities',
      coverage: 85,
      reliability: 'High',
      lastUpdate: '2026-01-30',
      frequency: 'Hourly',
      status: 'active'
    },
    { 
      name: 'Power Grid Data', 
      category: 'Utilities',
      coverage: 98,
      reliability: 'Very High',
      lastUpdate: '2026-01-30',
      frequency: 'Real-time',
      status: 'active'
    },
    { 
      name: 'Waste Collection Records', 
      category: 'Sanitation',
      coverage: 88,
      reliability: 'Medium',
      lastUpdate: '2026-01-27',
      frequency: 'Daily',
      status: 'active'
    },
  ];

  const assumptions = [
    'Population growth follows linear trend based on 5-year historical data',
    'Infrastructure degradation assumes 2% annual capacity reduction without maintenance',
    'Extreme rainfall scenario based on 1-in-50-year event probability',
    'Emergency response times calculated from optimal traffic conditions',
    'Power load projections include 15% safety margin for peak demand',
  ];

  const limitations = [
    'Traffic sensor coverage incomplete in outer wards (78% coverage)',
    'Real-time drainage monitoring not available for all pipelines',
    'Census data from 2021 - population estimates for 2026 are projections',
    'Heatwave impact models based on historical correlation, not real-time simulation',
    'Cross-system cascade effects use simplified dependency models',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Data Sources & Transparency</h1>
        <p className="text-gray-600">Data provenance, reliability indicators, assumptions, and model limitations</p>
      </div>

      {/* Data Sources Table */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-4">Data Sources</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 text-sm text-gray-600">Source</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Category</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Coverage</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Reliability</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Last Update</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Update Frequency</th>
                <th className="text-center py-3 px-4 text-sm text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {dataSources.map((source, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-600" />
                      <span className="text-sm text-slate-800">{source.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{source.category}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            source.coverage >= 90 ? 'bg-green-500' :
                            source.coverage >= 75 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${source.coverage}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-700">{source.coverage}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      source.reliability === 'Very High' ? 'bg-green-100 text-green-800' :
                      source.reliability === 'High' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {source.reliability}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{source.lastUpdate}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{source.frequency}</td>
                  <td className="py-3 px-4 text-center">
                    {source.status === 'active' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assumptions and Limitations */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg text-slate-800">Model Assumptions</h2>
          </div>
          <ul className="space-y-3">
            {assumptions.map((assumption, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-blue-600 text-sm mt-0.5">•</span>
                <span className="text-sm text-slate-700">{assumption}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg text-slate-800">Known Limitations</h2>
          </div>
          <ul className="space-y-3">
            {limitations.map((limitation, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-amber-600 text-sm mt-0.5">•</span>
                <span className="text-sm text-slate-700">{limitation}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Data Confidence and Quality Indicators */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-4">Confidence & Quality Badges</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-900">High Confidence</span>
            </div>
            <div className="text-xs text-green-700">
              Real-time data with &gt;90% coverage and validation checks
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Systems: Power, Water, Demographics
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-900">Medium Confidence</span>
            </div>
            <div className="text-xs text-blue-700">
              Historical data with periodic updates and extrapolation
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Systems: Drainage, Waste Management
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-900">Partial Data</span>
            </div>
            <div className="text-xs text-amber-700">
              Incomplete coverage or outdated baseline requiring estimates
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Systems: Traffic Sensors (78% coverage)
            </div>
          </div>
        </div>
      </div>

      {/* Transparency Statement */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg text-slate-800 mb-3">Transparency Statement</h3>
        <div className="text-sm text-slate-700 space-y-2">
          <p>
            This digital twin platform uses a combination of real-time monitoring data, historical records, 
            and simulation models to provide decision support for urban planning and policy evaluation.
          </p>
          <p>
            All simulations are based on best-available data and established modeling techniques, but should 
            be considered as indicative assessments rather than precise predictions. Real-world outcomes may 
            vary based on factors not captured in the model.
          </p>
          <p>
            Data quality, coverage, and confidence levels are clearly indicated for each source. Users should 
            consider these indicators when interpreting results and making decisions.
          </p>
          <p className="text-slate-600 text-xs mt-4">
            Last updated: 2026-01-30 | Model version: 2.4.1 | For questions or data access requests, contact: data@civicsense.gov
          </p>
        </div>
      </div>
    </div>
  );
}
