import { useState } from 'react';
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

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedWard, setSelectedWard] = useState('Ward 42');
  const [selectedScenario, setSelectedScenario] = useState('Baseline');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {showLayout ? (
        <>
          <TopNavBar 
            selectedWard={selectedWard}
            selectedScenario={selectedScenario}
            onWardChange={setSelectedWard}
            onScenarioChange={setSelectedScenario}
          />
          <div className="flex pt-16 min-h-screen">
            <Sidebar
              currentPage={currentPage}
              onNavigate={setCurrentPage}
              isCollapsed={isSidebarCollapsed}
              onCollapsedChange={setIsSidebarCollapsed}
            />
            <main
              className="flex-1 min-w-0 p-8 overflow-x-hidden transition-all duration-300"
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
