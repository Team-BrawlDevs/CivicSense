import { ChevronDown, User, Clock } from 'lucide-react';

interface TopNavBarProps {
  selectedWard: string;
  selectedScenario: string;
  onWardChange: (ward: string) => void;
  onScenarioChange: (scenario: string) => void;
}

export function TopNavBar({ selectedWard, selectedScenario, onWardChange, onScenarioChange }: TopNavBarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-slate-800 border-b border-slate-700 z-50 flex items-center px-6">
      <div className="flex items-center gap-8 flex-1">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <span className="text-white text-xl font-semibold">CivicSense</span>
        </div>

        {/* Ward Selector */}
        <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-md cursor-pointer hover:bg-slate-600 transition-colors">
          <span className="text-gray-300 text-sm">Ward:</span>
          <span className="text-white">{selectedWard}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Scenario Selector */}
        <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-md cursor-pointer hover:bg-slate-600 transition-colors">
          <span className="text-gray-300 text-sm">Scenario:</span>
          <span className="text-white">{selectedScenario}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Simulation Time */}
        <div className="flex items-center gap-2 px-4 py-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-gray-300 text-sm">Simulation: 2026-01-30 14:30</span>
        </div>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-full cursor-pointer hover:bg-slate-600 transition-colors">
        <User className="w-4 h-4 text-gray-300" />
        <span className="text-white text-sm">Admin</span>
      </div>
    </nav>
  );
}
