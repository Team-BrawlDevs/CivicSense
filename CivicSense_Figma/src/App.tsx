import { useState, useEffect, useCallback } from 'react';
import { TopNavBar } from './components/TopNavBar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/pages/LandingPage';
import { WardSelectionPage } from './components/pages/WardSelectionPage';
import { DigitalWardDashboard } from './components/pages/DigitalWardDashboard';
import { ScenarioConfigPage } from './components/pages/ScenarioConfigPage';
import { MobilityAnalysisPage } from './components/pages/MobilityAnalysisPage';
import { DrainageAnalysisPage } from './components/pages/DrainageAnalysisPage';
import { WaterSupplyPage } from './components/pages/WaterSupplyPage';
import { PowerUtilitiesPage } from './components/pages/PowerUtilitiesPage';
import { WasteManagementPage } from './components/pages/WasteManagementPage';
import { PopulationDemographicsPage } from './components/pages/PopulationDemographicsPage';
import { PublicServicesPage } from './components/pages/PublicServicesPage';
import { CrossSystemImpactPage } from './components/pages/CrossSystemImpactPage';
import { ImpactEvaluationPage } from './components/pages/ImpactEvaluationPage';
import { ScenarioComparisonPage } from './components/pages/ScenarioComparisonPage';
import { DataSourcesPage } from './components/pages/DataSourcesPage';

const VALID_PAGES = new Set([
  'landing', 'ward-selection', 'overview', 'scenario-simulation', 'mobility',
  'drainage', 'water', 'power', 'waste', 'population', 'public-services',
  'cross-system', 'impact-evaluation', 'scenario-comparison', 'data-sources',
]);

const DEFAULT_WARDS = ['Ward 42', 'Ward 43', 'Ward 44'];
const DEFAULT_SCENARIOS = ['Baseline', 'Flood', 'Traffic Disruption'];

function getPageFromHash(): string {
  const hash = window.location.hash.slice(1).replace(/^\/?/, '') || 'landing';
  const page = hash === '' ? 'landing' : hash;
  return VALID_PAGES.has(page) ? page : 'landing';
}

export default function App() {
  const [currentPage, setCurrentPageState] = useState(getPageFromHash);
  const [selectedWard, setSelectedWard] = useState('Ward 42');
  const [selectedScenario, setSelectedScenario] = useState('Baseline');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Set initial history state so back from first navigation works
  useEffect(() => {
    const page = getPageFromHash();
    const value = page === 'landing' ? '' : `/${page}`;
    window.history.replaceState({ page }, '', `#${value}` || '#');
  }, []);

  // Sync state from browser back/forward
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const page = e.state?.page ?? getPageFromHash();
      if (VALID_PAGES.has(page)) setCurrentPageState(page);
    };
    const handleHashChange = () => setCurrentPageState(getPageFromHash());
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Navigate to a page and push history so Back works
  const setCurrentPage = useCallback((page: string) => {
    if (!VALID_PAGES.has(page)) return;
    setCurrentPageState(page);
    const value = page === 'landing' ? '' : `/${page}`;
    window.history.pushState({ page }, '', `#${value}` || '#');
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onEnterDashboard={() => setCurrentPage('ward-selection')} />;
      case 'ward-selection':
        return <WardSelectionPage onSelectWard={(ward) => {
          setSelectedWard(ward);
          setCurrentPage('overview');
        }} />;
      case 'overview':
        return <DigitalWardDashboard />;
      case 'scenario-simulation':
        return <ScenarioConfigPage />;
      case 'mobility':
        return <MobilityAnalysisPage />;
      case 'drainage':
        return <DrainageAnalysisPage />;
      case 'water':
        return <WaterSupplyPage />;
      case 'power':
        return <PowerUtilitiesPage />;
      case 'waste':
        return <WasteManagementPage />;
      case 'population':
        return <PopulationDemographicsPage />;
      case 'public-services':
        return <PublicServicesPage />;
      case 'cross-system':
        return <CrossSystemImpactPage />;
      case 'impact-evaluation':
        return <ImpactEvaluationPage />;
      case 'scenario-comparison':
        return <ScenarioComparisonPage />;
      case 'data-sources':
        return <DataSourcesPage />;
      default:
        return <LandingPage onEnterDashboard={() => setCurrentPage('ward-selection')} />;
    }
  };

  const showLayout = currentPage !== 'landing' && currentPage !== 'ward-selection';

  return (
    <div className="min-h-screen bg-gray-50">
      {showLayout ? (
        <>
          {/* Navbar: fixed to viewport, always on top */}
          <div
            className="fixed left-0 right-0 top-0 z-[9999]"
            style={{ isolation: 'isolate' }}
          >
            <TopNavBar
              selectedWard={selectedWard}
              selectedScenario={selectedScenario}
              wards={DEFAULT_WARDS}
              scenarios={DEFAULT_SCENARIOS}
              onWardChange={setSelectedWard}
              onScenarioChange={setSelectedScenario}
            />
          </div>
          {/* Content: fills viewport below navbar; only this area scrolls */}
          <div
            className="fixed left-0 right-0 top-16 bottom-0 flex"
            style={{ isolation: 'isolate', zIndex: 0 }}
          >
            <Sidebar
              currentPage={currentPage}
              onNavigate={setCurrentPage}
              isCollapsed={isSidebarCollapsed}
              onCollapsedChange={setIsSidebarCollapsed}
            />
            <main
              className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-8 transition-all duration-300"
              style={{
                marginLeft: isSidebarCollapsed ? '4rem' : '16rem',
                width: isSidebarCollapsed ? 'calc(100vw - 4rem)' : 'calc(100vw - 16rem)',
                maxWidth: isSidebarCollapsed ? 'calc(100vw - 4rem)' : 'calc(100vw - 16rem)',
              }}
            >
              {renderPage()}
            </main>
          </div>
        </>
      ) : (
        renderPage()
      )}
    </div>
  );
}
