import { 
  LayoutDashboard, 
  Map, 
  Sliders, 
  Car, 
  Droplet, 
  Droplets, 
  Zap, 
  Trash2, 
  Users, 
  Building2,
  GitBranch,
  Scale,
  AlertTriangle,
  Database
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: 'overview', label: 'Digital Ward Dashboard', icon: Map },
  { id: 'scenario-simulation', label: 'Scenario Simulation', icon: Sliders },
  { id: 'mobility', label: 'Mobility & Transportation', icon: Car },
  { id: 'drainage', label: 'Drainage & Flooding', icon: Droplet },
  { id: 'water', label: 'Water Supply', icon: Droplets },
  { id: 'power', label: 'Power & Utilities', icon: Zap },
  { id: 'waste', label: 'Waste Management', icon: Trash2 },
  { id: 'population', label: 'Population & Demographics', icon: Users },
  { id: 'public-services', label: 'Public Services & Emergency', icon: Building2 },
  { id: 'cross-system', label: 'Cross-System Impact', icon: GitBranch },
  { id: 'scenario-comparison', label: 'Scenario Comparison', icon: Scale },
  { id: 'impact-evaluation', label: 'Risk & Resilience', icon: AlertTriangle },
  { id: 'data-sources', label: 'Data Sources & Transparency', icon: Database },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
      <nav className="p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    isActive 
                      ? 'bg-cyan-600 text-white' 
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-left">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}