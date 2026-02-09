import { Award, TrendingDown, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ScenarioComparisonPage() {
  const scenarios = [
    { 
      id: 1,
      name: 'Scenario A: Enhanced Drainage',
      risk: 'Medium',
      riskScore: 55,
      cost: '$2.8M',
      timeline: '18 months',
      benefits: ['Flood reduction: 65%', 'Traffic impact: -12%', 'Emergency access: +15%'],
      recommended: true,
    },
    { 
      id: 2,
      name: 'Scenario B: Traffic Rerouting',
      risk: 'Medium-High',
      riskScore: 68,
      cost: '$1.2M',
      timeline: '6 months',
      benefits: ['Traffic improvement: 28%', 'Flood reduction: 15%', 'Emergency access: +8%'],
      recommended: false,
    },
    { 
      id: 3,
      name: 'Scenario C: No Intervention',
      risk: 'High',
      riskScore: 85,
      cost: '$0',
      timeline: '-',
      benefits: ['No improvement', 'Risk increases over time', 'System degradation'],
      recommended: false,
    },
  ];

  const comparisonData = [
    { metric: 'Flood Risk', scenarioA: 35, scenarioB: 60, scenarioC: 85 },
    { metric: 'Traffic', scenarioA: 55, scenarioB: 40, scenarioC: 72 },
    { metric: 'Emergency', scenarioA: 68, scenarioB: 60, scenarioC: 52 },
    { metric: 'Power', scenarioA: 62, scenarioB: 58, scenarioC: 48 },
    { metric: 'Water', scenarioA: 70, scenarioB: 65, scenarioC: 55 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-800 mb-2">Scenario Comparison</h1>
        <p className="text-gray-600">Side-by-side policy analysis, risk-benefit evaluation, and decision support</p>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-3 gap-6">
        {scenarios.map((scenario) => (
          <div 
            key={scenario.id}
            className={`rounded-lg border-2 p-6 relative ${
              scenario.recommended 
                ? 'bg-green-50 border-green-300 shadow-lg' 
                : 'bg-white border-gray-300'
            }`}
          >
            {scenario.recommended && (
              <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                <Award className="w-3 h-3" />
                Recommended
              </div>
            )}
            
            <h3 className="text-lg text-slate-800 mb-4 mt-2">{scenario.name}</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Risk Level:</span>
                <span className={`px-3 py-1 rounded text-xs ${
                  scenario.risk === 'High' ? 'bg-red-200 text-red-800' :
                  scenario.risk.includes('Medium') ? 'bg-amber-200 text-amber-800' :
                  'bg-green-200 text-green-800'
                }`}>
                  {scenario.risk}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Risk Score:</span>
                <span className={`text-xl ${
                  scenario.riskScore >= 70 ? 'text-red-600' :
                  scenario.riskScore >= 50 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  {scenario.riskScore}/100
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cost:</span>
                <span className="text-slate-800">{scenario.cost}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Timeline:</span>
                <span className="text-slate-800">{scenario.timeline}</span>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-3">
              <div className="text-sm text-gray-600 mb-2">Key Benefits:</div>
              <ul className="space-y-1">
                {scenario.benefits.map((benefit, idx) => (
                  <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                    <span className="text-cyan-600 mt-0.5">•</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Chart */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-lg text-slate-800 mb-4">Performance Comparison Across Systems</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="metric" stroke="#64748b" />
            <YAxis stroke="#64748b" label={{ value: 'Performance Score', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            />
            <Legend />
            <Bar dataKey="scenarioA" fill="#22c55e" name="Scenario A" />
            <Bar dataKey="scenarioB" fill="#f59e0b" name="Scenario B" />
            <Bar dataKey="scenarioC" fill="#ef4444" name="Scenario C" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Risk vs Benefit Analysis */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Risk vs Benefit Matrix</h2>
          <div className="bg-slate-50 rounded-lg h-80 relative p-4">
            <svg viewBox="0 0 400 320" className="w-full h-full">
              {/* Axes */}
              <line x1="50" y1="270" x2="350" y2="270" stroke="#64748b" strokeWidth="2" />
              <line x1="50" y1="270" x2="50" y2="20" stroke="#64748b" strokeWidth="2" />
              
              {/* Labels */}
              <text x="200" y="300" textAnchor="middle" className="text-xs fill-slate-700">Benefit →</text>
              <text x="20" y="150" textAnchor="middle" className="text-xs fill-slate-700" transform="rotate(-90, 20, 150)">Risk →</text>
              
              {/* Quadrants */}
              <rect x="50" y="20" width="150" height="125" fill="#22c55e" opacity="0.1" />
              <text x="125" y="80" textAnchor="middle" className="text-xs fill-green-700">Low Risk</text>
              <text x="125" y="95" textAnchor="middle" className="text-xs fill-green-700">High Benefit</text>
              
              <rect x="200" y="145" width="150" height="125" fill="#ef4444" opacity="0.1" />
              <text x="275" y="205" textAnchor="middle" className="text-xs fill-red-700">High Risk</text>
              <text x="275" y="220" textAnchor="middle" className="text-xs fill-red-700">Low Benefit</text>
              
              {/* Scenario points */}
              <circle cx="140" cy="100" r="20" fill="#22c55e" opacity="0.7" stroke="#16a34a" strokeWidth="2" />
              <text x="140" y="105" textAnchor="middle" className="text-xs fill-white font-medium">A</text>
              
              <circle cx="220" cy="150" r="20" fill="#f59e0b" opacity="0.7" stroke="#d97706" strokeWidth="2" />
              <text x="220" y="155" textAnchor="middle" className="text-xs fill-white font-medium">B</text>
              
              <circle cx="280" cy="210" r="20" fill="#ef4444" opacity="0.7" stroke="#dc2626" strokeWidth="2" />
              <text x="280" y="215" textAnchor="middle" className="text-xs fill-white font-medium">C</text>
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg text-slate-800 mb-4">Decision Recommendation</h2>
          
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5 mb-4">
            <div className="flex items-start gap-3 mb-3">
              <Award className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <div className="text-lg text-green-900 mb-2">Recommended: Scenario A</div>
                <div className="text-sm text-green-700">
                  Enhanced Drainage Infrastructure provides the best risk-benefit balance with significant flood reduction and improved emergency access.
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Lowest risk profile</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Highest overall benefit</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-slate-700">
              <strong>Why Scenario A?</strong>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-cyan-600 mt-1">•</span>
                <span>Addresses root cause (drainage capacity) rather than symptoms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-600 mt-1">•</span>
                <span>Provides cascading benefits across multiple systems</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-600 mt-1">•</span>
                <span>Long-term ROI justifies higher initial investment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-600 mt-1">•</span>
                <span>Reduces emergency response failures by 65%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
