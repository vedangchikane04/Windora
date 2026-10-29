import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { ForecastView } from './components/ForecastView';
import { AccuracyView } from './components/AccuracyView';
import { ProcurementDecisionView } from './components/ProcurementDecisionView';
import { ForecastRevisionHistoryView } from './components/ForecastRevisionHistoryView';
import { ForecastHistoryDrawer } from './components/ForecastHistoryDrawer';
import { 
  OverviewResponse, 
  ForecastResponse, 
  IntervalRecord, 
  MatchingMode 
} from './types';
import { api } from './services/api';
import { 
  Wind, 
  RefreshCw, 
  AlertCircle, 
  Layers, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [cutoffTime, setCutoffTime] = useState<string>('11:00');
  const [matchingMode, setMatchingMode] = useState<MatchingMode>('hour_block');
  const [availableDates, setAvailableDates] = useState<string[]>(
    Array.from({ length: 31 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`)
  );

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer state for quick interval inspection
  const [drawerInterval, setDrawerInterval] = useState<IntervalRecord | null>(null);

  // Load available dates on mount
  useEffect(() => {
    api.getAvailableDates()
      .then((dates) => {
        if (dates && dates.length > 0) {
          setAvailableDates(dates);
        }
      })
      .catch(() => {
        // Fallback already initialized
      });
  }, []);

  // Fetch overview & forecast data whenever date, cutoff, or matching mode changes
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, fcRes] = await Promise.all([
        api.getOverview(selectedDate, cutoffTime, matchingMode),
        api.getForecasts(selectedDate, cutoffTime, matchingMode)
      ]);
      setOverview(ovRes);
      setForecastData(fcRes);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Windora backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, cutoffTime, matchingMode]);

  const handleSelectInterval = (interval: IntervalRecord) => {
    setDrawerInterval(interval);
  };

  return (
    <div className="min-h-screen bg-[#080E1E] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Header Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        cutoffTime={cutoffTime}
        setCutoffTime={setCutoffTime}
        matchingMode={matchingMode}
        setMatchingMode={setMatchingMode}
        availableDates={availableDates}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && !overview ? (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-400 animate-spin flex items-center justify-center p-0.5 shadow-xl shadow-sky-500/20">
                <div className="w-full h-full bg-[#080E1E] rounded-2xl flex items-center justify-center">
                  <Wind className="w-7 h-7 text-sky-400" />
                </div>
              </div>
            </div>
            <h3 className="text-base font-bold text-white mt-4 font-mono tracking-wide">
              Loading Windora Intelligence...
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Processing UK National Grid Elexon outturn and day-ahead forecast streams for {selectedDate}.
            </p>
          </div>
        ) : error ? (
          <div className="p-8 max-w-xl mx-auto my-12 bg-rose-950/40 border border-rose-800 rounded-2xl text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-rose-300">Connection or Processing Error</h3>
            <p className="text-xs text-rose-200/90 mt-2 leading-relaxed">
              {error}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={loadData}
                className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </button>
            </div>
          </div>
        ) : overview ? (
          <>
            {currentTab === 'overview' && (
              <OverviewView
                overview={overview}
                forecastData={forecastData}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                availableDates={availableDates}
                cutoffTime={cutoffTime}
                matchingMode={matchingMode}
                onSelectInterval={handleSelectInterval}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'forecast' && (
              <ForecastView
                forecastData={forecastData}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                availableDates={availableDates}
                cutoffTime={cutoffTime}
                onSelectInterval={handleSelectInterval}
              />
            )}

            {currentTab === 'accuracy' && (
              <AccuracyView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                cutoffTime={cutoffTime}
                matchingMode={matchingMode}
                dayMetrics={forecastData?.metrics || overview.overview_metrics}
              />
            )}

            {currentTab === 'procurement' && forecastData && (
              <ProcurementDecisionView
                selectedDate={selectedDate}
                intervals={forecastData.intervals}
                metrics={forecastData.metrics}
                onSelectInterval={handleSelectInterval}
              />
            )}

            {currentTab === 'history' && forecastData && (
              <ForecastRevisionHistoryView
                selectedDate={selectedDate}
                intervals={forecastData.intervals}
                cutoffTime={cutoffTime}
                matchingMode={matchingMode}
                initialSelectedInterval={drawerInterval}
              />
            )}
          </>
        ) : null}
      </main>

      {/* Quick Interval Inspector Drawer */}
      {drawerInterval && (
        <ForecastHistoryDrawer
          deliveryTime={drawerInterval.start_time}
          cutoffTime={cutoffTime}
          matchingMode={matchingMode}
          onClose={() => setDrawerInterval(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">WINDORA MVP</span>
            <span>•</span>
            <span>UK Electricity Day-Ahead Wind Intelligence</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="text-slate-400">
              Data: Elexon BMRS (<a href="https://bmrs.elexon.co.uk" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">FUELHH</a> &amp; <a href="https://bmrs.elexon.co.uk" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">WINDFOR</a>)
            </span>
            <span className="text-slate-600">|</span>
            <a href="/docs" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white flex items-center gap-1">
              <span>FastAPI Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
