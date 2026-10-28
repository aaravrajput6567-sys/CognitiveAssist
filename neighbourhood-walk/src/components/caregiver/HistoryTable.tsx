/**
 * History Table
 *
 * Displays session history, cognitive trace trajectories, and strategy breakdowns.
 */

import React, { useEffect, useState } from 'react';
import type { SessionSummary } from '../../types/session';
import type { TrialEvent } from '../../types/trial';
import { storageService } from '../../services/storageService';
import { TrendingUp, Award, Clock } from 'lucide-react';

export const HistoryTable: React.FC = () => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [trials, setTrials] = useState<TrialEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      const [sList, tList] = await Promise.all([
        storageService.getAllSessions(),
        storageService.getTrials(),
      ]);
      setSessions(sList);
      setTrials(tList);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <p className="text-xl text-stone-500 py-6">Loading session history...</p>;
  }

  if (sessions.length === 0) {
    return (
      <div className="py-8 text-center text-stone-600 dark:text-stone-400">
        <p className="text-xl font-medium">No recorded sessions yet.</p>
        <p className="text-base mt-2">Completed walks will appear here with detailed cognitive trace metrics.</p>
      </div>
    );
  }

  // Calculate strategy-specific accuracy across all trials
  const retraceTrials = trials.filter((t) => t.task === 'retrace');
  const shortcutTrials = trials.filter((t) => t.task === 'shortcut');

  const retraceAccuracy =
    retraceTrials.length > 0
      ? (retraceTrials.reduce((acc, t) => acc + t.correct_fraction, 0) / retraceTrials.length) * 100
      : null;

  const shortcutAccuracy =
    shortcutTrials.length > 0
      ? (shortcutTrials.reduce((acc, t) => acc + t.correct_fraction, 0) / shortcutTrials.length) * 100
      : null;

  const avgLatency =
    trials.length > 0
      ? Math.round(trials.reduce((acc, t) => acc + t.latency_ms, 0) / trials.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* High-Level Research Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-stone-800 border-2 border-amber-300 dark:border-stone-700">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold mb-1">
            <Award size={20} />
            <span>Retrace (Egocentric)</span>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 dark:text-stone-100">
            {retraceAccuracy !== null ? `${retraceAccuracy.toFixed(1)}%` : 'N/A'}
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {retraceTrials.length} total trials
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-stone-800 border-2 border-teal-300 dark:border-stone-700">
          <div className="flex items-center gap-2 text-teal-800 dark:text-teal-400 font-bold mb-1">
            <TrendingUp size={20} />
            <span>Shortcut (Allocentric)</span>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 dark:text-stone-100">
            {shortcutAccuracy !== null ? `${shortcutAccuracy.toFixed(1)}%` : 'N/A'}
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {shortcutTrials.length} total trials
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-700">
          <div className="flex items-center gap-2 text-stone-800 dark:text-stone-400 font-bold mb-1">
            <Clock size={20} />
            <span>Mean Decision Latency</span>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 dark:text-stone-100">
            {avgLatency} ms
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Across {trials.length} total decision points
          </p>
        </div>
      </div>

      {/* Session Summaries Table */}
      <div className="overflow-x-auto rounded-2xl border-2 border-stone-300 dark:border-stone-700">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-b-2 border-stone-300 dark:border-stone-700 font-bold text-sm sm:text-base">
              <th className="p-3">Date & Time</th>
              <th className="p-3">Walks</th>
              <th className="p-3">CT Score</th>
              <th className="p-3">Smoothed CT~</th>
              <th className="p-3">Difficulty &delta;</th>
              <th className="p-3">Next &delta;</th>
              <th className="p-3">Support Fired</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-sm sm:text-base">
            {sessions.map((s) => (
              <tr key={s.session_id} className="hover:bg-amber-50/50 dark:hover:bg-stone-800/50">
                <td className="p-3 font-medium">
                  {new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="p-3">{s.trial_count}</td>
                <td className="p-3 font-semibold text-amber-700 dark:text-amber-400">
                  {s.CT_k.toFixed(3)}
                </td>
                <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">
                  {s.smoothed_CT_k.toFixed(3)}
                </td>
                <td className="p-3">{s.delta_k.toFixed(2)}</td>
                <td className="p-3 font-bold">{s.delta_next.toFixed(2)}</td>
                <td className="p-3">
                  {s.distress_k === 1 ? (
                    <span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold text-xs">
                      Yes (&gt;30%)
                    </span>
                  ) : (
                    <span className="text-stone-500 text-xs">Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
