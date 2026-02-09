import { ArrowRight, Database, Cpu, TrendingUp, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onEnterDashboard: () => void;
}

export function LandingPage({ onEnterDashboard }: LandingPageProps) {
  const coverageCards = [
    { title: 'Population', value: '250K+', color: 'bg-blue-500' },
    { title: 'Mobility', value: '1200 km', subtitle: 'Road Network', color: 'bg-cyan-500' },
    { title: 'Drainage', value: '850 km', subtitle: 'Pipeline', color: 'bg-teal-500' },
    { title: 'Water Supply', value: '95%', subtitle: 'Coverage', color: 'bg-blue-600' },
    { title: 'Power Grid', value: '420 MW', subtitle: 'Capacity', color: 'bg-indigo-500' },
    { title: 'Waste Mgmt', value: '180 TPD', subtitle: 'Capacity', color: 'bg-emerald-500' },
    { title: 'Public Services', value: '340+', subtitle: 'Facilities', color: 'bg-violet-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
            </div>
            <span className="text-white text-2xl font-semibold">CivicSense</span>
          </div>
          <button
            onClick={onEnterDashboard}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-colors"
          >
            Enter Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl text-white mb-6">
            Ward-Level Digital Twin for Policy Decision Support
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Simulate and evaluate policy decisions before real-world implementation. 
            A comprehensive platform for urban planners, municipal officials, and policymakers 
            to make data-driven decisions with confidence.
          </p>
        </div>

        {/* Workflow Diagram */}
        <div className="mb-16">
          <h2 className="text-2xl text-white mb-8 text-center">Decision Support Workflow</h2>
          <div className="flex items-center justify-center gap-4">
            {[
              { icon: Database, label: 'Data Collection', desc: 'Real-time & Historical' },
              { icon: Cpu, label: 'Digital Twin', desc: 'Ward Modeling' },
              { icon: TrendingUp, label: 'Simulation', desc: 'Policy Scenarios' },
              { icon: CheckCircle2, label: 'Impact Analysis', desc: 'Risk Assessment' },
              { icon: ArrowRight, label: 'Decision', desc: 'Evidence-Based' },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center mb-3">
                      <Icon className="w-10 h-10 text-cyan-400" />
                    </div>
                    <div className="text-white text-sm mb-1">{step.label}</div>
                    <div className="text-gray-400 text-xs">{step.desc}</div>
                  </div>
                  {index < 4 && (
                    <ArrowRight className="w-6 h-6 text-gray-600 mt-[-50px]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* System Coverage Cards */}
        <div className="mb-12">
          <h2 className="text-2xl text-white mb-8 text-center">System Coverage</h2>
          <div className="grid grid-cols-7 gap-4">
            {coverageCards.map((card, index) => (
              <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-cyan-500 transition-colors">
                <div className={`w-12 h-12 ${card.color} rounded-lg mb-4 flex items-center justify-center text-white text-xl`}>
                  {card.value.charAt(0)}
                </div>
                <div className="text-gray-400 text-sm mb-2">{card.title}</div>
                <div className="text-white text-2xl mb-1">{card.value}</div>
                {card.subtitle && (
                  <div className="text-gray-500 text-xs">{card.subtitle}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={onEnterDashboard}
            className="px-12 py-4 bg-cyan-600 hover:bg-cyan-700 text-white text-lg rounded-lg transition-colors shadow-lg shadow-cyan-900/50"
          >
            Enter Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
