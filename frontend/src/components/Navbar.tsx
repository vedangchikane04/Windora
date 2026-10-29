import React from 'react';
import { 
  Wind, 
  Clock, 
  Calendar, 
  Layers, 
  Activity, 
  TrendingUp, 
  History, 
  ShieldAlert, 
  Info,
  CheckCircle2
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
  const tabs = [
    { id: 'overview', label: 'Executive Overview', icon: Activity },
    { id: 'forecast', label: 'Forecast vs Actual', icon: TrendingUp },
    { id: 'accuracy', label: 'Accuracy Intelligence', icon: Layers },
    { id: 'procurement', label: 'Procurement Support', icon: ShieldAlert },
    { id: 'history', label: 'Forecast Revisions', icon: History },
  ];

  return (
    <header className="bg-[#080E1E] border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-xl">
      {/* Top Branding & Global Controls Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 gap-4">
          
          {/* Brand & Market Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Wind className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono">WINDORA</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800 font-semibold uppercase tracking-wider">
                  UK Day-Ahead
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Elexon Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                UK National Wind Forecast & Accuracy Intelligence • January 2026 Analysis
              </p>
            </div>
          </div>

          {/* Global Decision Filters */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Delivery Date Picker */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-sky-400 mr-2" />
              <label htmlFor="delivery-date-select" className="text-slate-400 mr-1.5 font-medium">Delivery Day:</label>
              <select
                id="delivery-date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d} className="bg-slate-900 text-white">
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Cutoff Time Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-inner" title="Day-Ahead Decision Cutoff on D-1. Default: 11:00 GMT (EPEX SPOT auction deadline assumption)">
              <Clock className="w-3.5 h-3.5 text-amber-400 mr-2" />
              <label htmlFor="cutoff-time-select" className="text-slate-400 mr-1.5 font-medium">D-1 Cutoff:</label>
              <select
                id="cutoff-time-select"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="11:00" className="bg-slate-900 text-white">11:00 GMT (EPEX SPOT Default)</option>
                <option value="12:00" className="bg-slate-900 text-white">12:00 GMT (Nord Pool Cutoff)</option>
                <option value="17:00" className="bg-slate-900 text-white">17:00 GMT (End of Day-Ahead)</option>
                <option value="09:00" className="bg-slate-900 text-white">09:00 GMT (Early Morning)</option>
              </select>
            </div>

            {/* Matching Mode */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setMatchingMode('hour_block')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  matchingMode === 'hour_block'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Hourly WINDFOR broadcast mapped across 30-min settlement intervals (48 periods/day)"
              >
                Hour Block (48 SP)
              </button>
              <button
                type="button"
                onClick={() => setMatchingMode('exact')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  matchingMode === 'exact'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Strict timestamp matching (24 hourly intervals/day)"
              >
                Exact (:00 Only)
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-800/80 pt-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center space-x-2 py-2.5 px-3.5 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'border-sky-400 text-sky-400 bg-sky-950/30 rounded-t'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
