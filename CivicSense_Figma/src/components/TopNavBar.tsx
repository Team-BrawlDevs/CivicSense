import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronLeft, User, Clock } from "lucide-react";

interface TopNavBarProps {
  selectedWard: string;
  selectedScenario: string;
  wards: string[];
  scenarios: string[];
  onWardChange: (ward: string) => void;
  onScenarioChange: (scenario: string) => void;
}

export function TopNavBar({
  selectedWard,
  selectedScenario,
  wards,
  scenarios,
  onWardChange,
  onScenarioChange,
}: TopNavBarProps) {
  const [wardOpen, setWardOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const wardRef = useRef<HTMLDivElement>(null);
  const scenarioRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wardRef.current && !wardRef.current.contains(event.target as Node)) {
        setWardOpen(false);
      }

      if (
        scenarioRef.current &&
        !scenarioRef.current.contains(event.target as Node)
      ) {
        setScenarioOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 left-0 right-0 h-16 bg-slate-800 border-b border-slate-700 flex items-center px-6 shadow-lg">
      <div className="flex items-center gap-8 flex-1">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Back</span>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-white"
              fill="currentColor"
            >
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            </svg>
          </div>
          <span className="text-white text-xl font-semibold">CivicSense</span>
        </div>

        {/* Ward Selector */}
        <div ref={wardRef} className="relative">
          <button
            onClick={() => setWardOpen(!wardOpen)}
            className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-md hover:bg-slate-600 transition-colors"
          >
            <span className="text-gray-300 text-sm">Ward:</span>
            <span className="text-white text-sm font-medium">
              {selectedWard}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {wardOpen && (
            <div className="absolute mt-2 w-40 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50">
              {wards.map((ward) => (
                <button
                  key={ward}
                  onClick={() => {
                    onWardChange(ward);
                    setWardOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  {ward}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scenario Selector */}
        <div ref={scenarioRef} className="relative">
          <button
            onClick={() => setScenarioOpen(!scenarioOpen)}
            className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-md hover:bg-slate-600 transition-colors"
          >
            <span className="text-gray-300 text-sm">Scenario:</span>
            <span className="text-white text-sm font-medium">
              {selectedScenario}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {scenarioOpen && (
            <div className="absolute mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50">
              {scenarios.map((scenario) => (
                <button
                  key={scenario}
                  onClick={() => {
                    onScenarioChange(scenario);
                    setScenarioOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  {scenario}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Simulation Time */}
        <div className="hidden md:flex items-center gap-2 px-4 py-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-gray-300 text-sm">
            Simulation: {new Date().toLocaleString()}
          </span>
        </div>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-full hover:bg-slate-600 transition-colors cursor-pointer">
        <User className="w-4 h-4 text-gray-300" />
        <span className="text-white text-sm">Admin</span>
      </div>
    </nav>
  );
}
