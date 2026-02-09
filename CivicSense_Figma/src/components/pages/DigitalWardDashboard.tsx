import { useState } from 'react';
import { Layers, AlertCircle } from 'lucide-react';

export function DigitalWardDashboard() {
  const [activeLayers, setActiveLayers] = useState({
    traffic: true,
    drainage: false,
    flood: true,
    water: false,
    power: false,
    waste: false,
    population: true,
    services: false,
  });

  const kpiCards = [
    { label: 'Mobility Stress', value: '67%', status: 'warning', trend: '+5%' },
    { label: 'Drainage Capacity Usage', value: '73%', status: 'warning', trend: '+12%' },
    { label: 'Water Demand Stress', value: '45%', status: 'good', trend: '-3%' },
    { label: 'Power Load', value: '82%', status: 'danger', trend: '+8%' },
    { label: 'Ward Risk Index', value: 'Medium', status: 'warning', trend: 'Stable' },
  ];

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-slate-800 mb-2">Digital Ward Dashboard</h1>
          <p className="text-gray-600">Interactive ward visualization with multi-layer analysis</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-md">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <span className="text-amber-800 text-sm">2 active warnings</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {kpiCards.map((kpi, index) => (
          <div key={index} className={`rounded-lg p-5 border-2 ${
            kpi.status === 'good' ? 'bg-green-50 border-green-200' :
            kpi.status === 'warning' ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="text-sm text-gray-600 mb-2">{kpi.label}</div>
            <div className="text-3xl mb-2" style={{ color: 
              kpi.status === 'good' ? '#16a34a' :
              kpi.status === 'warning' ? '#d97706' :
              '#dc2626'
            }}>
              {kpi.value}
            </div>
            <div className="text-xs text-gray-500">{kpi.trend}</div>
            <div className="mt-3">
              <span className={`inline-flex px-2 py-1 rounded text-xs ${
                kpi.status === 'good' ? 'bg-green-200 text-green-800' :
                kpi.status === 'warning' ? 'bg-amber-200 text-amber-800' :
                'bg-red-200 text-red-800'
              }`}>
                {kpi.status === 'good' ? 'Low Risk' : kpi.status === 'warning' ? 'Medium Risk' : 'High Risk'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Map and Layer Controls */}
      <div className="grid grid-cols-4 gap-6">
        {/* Layer Controls */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg border border-gray-300 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg text-slate-800">Map Layers</h2>
            </div>
            <div className="space-y-2">
              {Object.entries(activeLayers).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => toggleLayer(key)}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <div className={`ml-auto w-3 h-3 rounded-full ${value ? 'bg-cyan-500' : 'bg-gray-300'}`} />
                </label>
              ))}
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-white rounded-lg border border-gray-300 p-5 mt-4">
            <h2 className="text-lg text-slate-800 mb-4">Active Alerts</h2>
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-sm text-slate-800">High Power Load</span>
                </div>
                <p className="text-xs text-gray-600">Peak demand exceeds 80%</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-sm text-slate-800">Drainage Stress</span>
                </div>
                <p className="text-xs text-gray-600">Monsoon season approaching</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
            <div className="bg-slate-100 border-b border-gray-300 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-700">Interactive Ward Map</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-slate-700 hover:bg-gray-50">
                  Reset View
                </button>
                <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-slate-700 hover:bg-gray-50">
                  Export
                </button>
              </div>
            </div>
            <div className="h-[600px] bg-slate-50 relative">
              <svg viewBox="0 0 800 600" className="w-full h-full">
                {/* Base ward boundary */}
                <rect x="50" y="50" width="700" height="500" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
                
                {/* Traffic layer - roads */}
                {activeLayers.traffic && (
                  <g opacity="0.8">
                    <line x1="100" y1="150" x2="700" y2="150" stroke="#f59e0b" strokeWidth="8" />
                    <line x1="100" y1="300" x2="700" y2="300" stroke="#22c55e" strokeWidth="8" />
                    <line x1="100" y1="450" x2="700" y2="450" stroke="#ef4444" strokeWidth="8" />
                    <line x1="250" y1="50" x2="250" y2="550" stroke="#3b82f6" strokeWidth="6" />
                    <line x1="550" y1="50" x2="550" y2="550" stroke="#22c55e" strokeWidth="6" />
                  </g>
                )}

                {/* Flood zones */}
                {activeLayers.flood && (
                  <g opacity="0.4">
                    <ellipse cx="200" cy="200" rx="120" ry="90" fill="#ef4444" />
                    <ellipse cx="600" cy="400" rx="100" ry="80" fill="#f59e0b" />
                  </g>
                )}

                {/* Population density */}
                {activeLayers.population && (
                  <g opacity="0.3">
                    <rect x="300" y="200" width="200" height="200" fill="#8b5cf6" />
                    <rect x="100" y="350" width="150" height="150" fill="#6366f1" />
                  </g>
                )}

                {/* Legend indicators */}
                <g transform="translate(600, 480)">
                  <rect x="0" y="0" width="180" height="100" fill="white" stroke="#cbd5e1" strokeWidth="1" opacity="0.95" />
                  <text x="10" y="20" className="text-xs fill-slate-700">Legend</text>
                  {activeLayers.flood && (
                    <>
                      <circle cx="20" cy="40" r="6" fill="#ef4444" opacity="0.6" />
                      <text x="35" y="45" className="text-xs fill-slate-700">High Flood Risk</text>
                    </>
                  )}
                  {activeLayers.traffic && (
                    <>
                      <line x1="15" y1="60" x2="25" y2="60" stroke="#ef4444" strokeWidth="3" />
                      <text x="35" y="65" className="text-xs fill-slate-700">Heavy Traffic</text>
                    </>
                  )}
                  {activeLayers.population && (
                    <>
                      <rect x="15" y="75" width="10" height="10" fill="#8b5cf6" opacity="0.5" />
                      <text x="35" y="85" className="text-xs fill-slate-700">High Density</text>
                    </>
                  )}
                </g>

                {/* Markers for key facilities */}
                <circle cx="400" cy="200" r="8" fill="#06b6d4" stroke="white" strokeWidth="2" />
                <text x="400" y="195" textAnchor="middle" className="text-xs fill-white">H</text>
                
                <circle cx="300" cy="400" r="8" fill="#06b6d4" stroke="white" strokeWidth="2" />
                <text x="300" y="395" textAnchor="middle" className="text-xs fill-white">S</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
