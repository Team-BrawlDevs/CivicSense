import { 
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
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
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

export function Sidebar({ currentPage, onNavigate, isCollapsed = true, onCollapsedChange }: SidebarProps) {
  const handleToggle = () => {
    onCollapsedChange?.(!isCollapsed);
  };

  return (
    <aside
      className={`fixed left-0 top-16 bottom-0 bg-slate-800 border-r border-slate-700 overflow-y-auto transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        <button
          onClick={handleToggle}
          className="flex items-center justify-center p-2 m-2 rounded-md text-gray-400 hover:bg-slate-700 hover:text-white transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
        <nav className="p-2 flex-1">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-md text-sm transition-colors ${
                      isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isActive
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="text-left truncate">{item.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}