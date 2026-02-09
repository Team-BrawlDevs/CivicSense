import { Building2, Clock, AlertTriangle, Activity } from 'lucide-react';

export function PublicServicesPage() {
  const services = [
    { type: 'Hospitals', count: 3, avgTime: 8.2, overload: 45, status: 'warning' },
    { type: 'Schools', count: 12, avgTime: 12.5, overload: 32, status: 'normal' },
    { type: 'Fire Stations', count: 2, avgTime: 6.8, overload: 58, status: 'critical' },
    { type: 'Police Stations', count: 2, avgTime: 9.1, overload: 42, status: 'warning' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Public Services & Emergency Analysis</h1>
        <p className="text-gray-600">Accessibility mapping, response times, and service capacity analysis</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Service Accessibility Map</h2>
          <div className="bg-slate-50 rounded-lg h-80 relative">
            <svg viewBox="0 0 400 320" className="w-full h-full">
              <rect x="20" y="20" width="360" height="280" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
              
              {/* Coverage circles */}
              <circle cx="120" cy="100" r="70" fill="#22c55e" opacity="0.2" />
              <circle cx="280" cy="100" r="70" fill="#ef4444" opacity="0.2" />
              <circle cx="120" cy="220" r="70" fill="#3b82f6" opacity="0.2" />
              <circle cx="280" cy="220" r="70" fill="#22c55e" opacity="0.2" />
              
              {/* Service markers */}
              <circle cx="120" cy="100" r="10" fill="#22c55e" stroke="white" strokeWidth="2" />
              <text x="120" y="105" textAnchor="middle" className="text-xs fill-white">H</text>
              
              <circle cx="280" cy="100" r="10" fill="#ef4444" stroke="white" strokeWidth="2" />
              <text x="280" y="105" textAnchor="middle" className="text-xs fill-white">F</text>
              
              <circle cx="120" cy="220" r="10" fill="#3b82f6" stroke="white" strokeWidth="2" />
              <text x="120" y="225" textAnchor="middle" className="text-xs fill-white">S</text>
              
              <circle cx="280" cy="220" r="10" fill="#22c55e" stroke="white" strokeWidth="2" />
              <text x="280" y="225" textAnchor="middle" className="text-xs fill-white">H</text>
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Service Performance Metrics</h2>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${
                service.status === 'critical' ? 'bg-red-50 border-red-200' :
                service.status === 'warning' ? 'bg-amber-50 border-amber-200' :
                'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-800">{service.type}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    service.status === 'critical' ? 'bg-red-200 text-red-800' :
                    service.status === 'warning' ? 'bg-amber-200 text-amber-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {service.status === 'critical' ? 'Critical' : service.status === 'warning' ? 'Warning' : 'Normal'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-gray-500 mb-1">Facilities</div>
                    <div className="text-slate-800">{service.count}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Avg Response</div>
                    <div className="text-slate-800">{service.avgTime} min</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Overload</div>
                    <div className="text-slate-800">{service.overload}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg text-red-900 mb-2">Critical Service Failure Analysis</h3>
            <p className="text-sm text-red-700 mb-3">
              Under extreme rainfall scenario, fire station response times increase by 85%, exceeding critical thresholds. 
              Emergency vehicle access blocked on 11 major routes.
            </p>
            <div className="text-sm text-red-800">
              <strong>Which service fails first:</strong> Fire & Emergency Response (estimated time to failure: 2.5 hours into scenario)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
