import React, { useState, useEffect } from 'react';
import { 
  Wind, 
  Clock, 
  Calendar, 
  Layers, 
  Activity, 
  TrendingUp, 
  History, 
  ShieldAlert, 
  Maximize2,
  Minimize2
} from 'lucide-react';
import { MatchingMode } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  cutoffTime: string;
  setCutoffTime: (time: string) => void;
  matchingMode: MatchingMode;
  setMatchingMode: (mode: MatchingMode) => void;
  availableDates: string[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  selectedDate,
  setSelectedDate,
  cutoffTime,
  setCutoffTime,
  matchingMode,
  setMatchingMode,
  availableDates
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const tabs = [
    { id: 'overview', label: 'Executive Overview', icon: Activity },
    { id: 'forecast', label: 'Forecast vs Actual', icon: TrendingUp },
    { id: 'accuracy', label: 'Accuracy Intelligence', icon: Layers },
    { id: 'procurement', label: 'Procurement Support', icon: ShieldAlert },
    { id: 'history', label: 'Forecast Revisions', icon: History },
  ];

  return (
    <header className="bg-white border-b border-[#d8e8f2] text-[#253949] sticky top-0 z-40 shadow-xs">
      {/* Top Branding & Global Controls Bar (Fluid Full Width) */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 gap-4">
          
          {/* Brand & Market Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#253949] via-[#259ed9] to-[#91cfec] flex items-center justify-center shadow-md shadow-[#259ed9]/25">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-[#253949] font-mono">WINDORA</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#c3e4f3]/40 text-[#253949] border border-[#91cfec] font-semibold uppercase tracking-wider">
                  UK Day-Ahead
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#c3e4f3]/40 text-[#259ed9] border border-[#91cfec] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#259ed9] animate-ping"></span>
                  Elexon Verified
                </span>
              </div>
              <p className="text-xs text-[#4a6375] hidden sm:block">
                UK National Wind Forecast & Accuracy Intelligence • January 2026 Analysis
              </p>
            </div>
          </div>

          {/* Global Decision Filters & Fullscreen Action */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Delivery Date Picker */}
            <div className="flex items-center bg-white border border-[#d8e8f2] hover:border-[#259ed9] rounded-lg px-2.5 py-1.5 shadow-xs transition-colors">
              <Calendar className="w-3.5 h-3.5 text-[#259ed9] mr-2" />
              <label htmlFor="delivery-date-select" className="text-[#4a6375] mr-1.5 font-medium">Delivery Day:</label>
              <select
                id="delivery-date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-[#253949] font-semibold focus:outline-none cursor-pointer"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d} className="bg-white text-[#253949]">
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Cutoff Time Selector */}
            <div className="flex items-center bg-white border border-[#d8e8f2] hover:border-[#259ed9] rounded-lg px-2.5 py-1.5 shadow-xs transition-colors" title="Day-Ahead Decision Cutoff on D-1. Default: 11:00 GMT (EPEX SPOT auction deadline assumption)">
              <Clock className="w-3.5 h-3.5 text-[#4a6375] mr-2" />
              <label htmlFor="cutoff-time-select" className="text-[#4a6375] mr-1.5 font-medium">D-1 Cutoff:</label>
              <select
                id="cutoff-time-select"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="bg-transparent text-[#259ed9] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="11:00" className="bg-white text-[#253949]">11:00 GMT (EPEX SPOT Default)</option>
                <option value="12:00" className="bg-white text-[#253949]">12:00 GMT (Nord Pool Cutoff)</option>
                <option value="17:00" className="bg-white text-[#253949]">17:00 GMT (End of Day-Ahead)</option>
                <option value="09:00" className="bg-white text-[#253949]">09:00 GMT (Early Morning)</option>
              </select>
            </div>

            {/* Matching Mode */}
            <div className="flex items-center bg-[#ebf5fa] border border-[#d8e8f2] rounded-lg p-1">
              <button
                type="button"
                onClick={() => setMatchingMode('hour_block')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  matchingMode === 'hour_block'
                    ? 'bg-[#259ed9] text-white shadow-xs font-semibold'
                    : 'text-[#4a6375] hover:text-[#259ed9]'
                }`}
                title="Hourly WINDFOR broadcast mapped across 30-min settlement intervals (48 periods/day)"
              >
                Hour Block (48 SP)
              </button>
              <button
                type="button"
                onClick={() => setMatchingMode('exact')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  matchingMode === 'exact'
                    ? 'bg-[#259ed9] text-white shadow-xs font-semibold'
                    : 'text-[#4a6375] hover:text-[#259ed9]'
                }`}
                title="Strict timestamp matching (24 hourly intervals/day)"
              >
                Exact (:00 Only)
              </button>
            </div>

            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 bg-white hover:bg-[#ebf5fa] border border-[#d8e8f2] hover:border-[#259ed9] text-[#4a6375] hover:text-[#259ed9] px-2.5 py-1.5 rounded-lg shadow-xs font-medium transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Full Screen Cockpit Mode"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[#259ed9]" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#259ed9]" />
                  <span className="hidden sm:inline">Full Screen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-[#e5f0f6] pt-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center space-x-2 py-2.5 px-3.5 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'border-[#259ed9] text-[#259ed9] bg-[#c3e4f3]/25 font-bold rounded-t shadow-xs'
                    : 'border-transparent text-[#6b8597] hover:text-[#259ed9] hover:border-[#91cfec]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#259ed9]' : 'text-[#91cfec]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
export default Navbar;
