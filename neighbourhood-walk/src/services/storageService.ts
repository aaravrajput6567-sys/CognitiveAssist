/**
 * Storage Service (IndexedDB with LocalStorage Fallback)
 *
 * 100% on-device storage for:
 * - Decision events
 * - Trial events
 * - Session summaries
 * - Caregiver settings
 */

import { openDB, type IDBPDatabase } from 'idb';
import { ACCESSIBILITY_CONFIG } from '../config/accessibilityConfig';
import type { CaregiverSettings, SessionSummary } from '../types/session';
import type { DecisionEvent, TrialEvent } from '../types/trial';

const DB_NAME = 'NeighbourhoodWalkDB';
const DB_VERSION = 1;

const DEFAULT_SETTINGS: CaregiverSettings = {
  pin: '1234',
  nickname: 'Walker',
  accessibility: ACCESSIBILITY_CONFIG.DEFAULT_SETTINGS,
  sessionTrials: 5,
  baselineLambda: null,
};

class StorageService {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('decisions')) {
            const decisionsStore = db.createObjectStore('decisions', { autoIncrement: true });
            decisionsStore.createIndex('session_id', 'session_id');
            decisionsStore.createIndex('timestamp', 'timestamp');
          }
          if (!db.objectStoreNames.contains('trials')) {
            const trialsStore = db.createObjectStore('trials', { autoIncrement: true });
            trialsStore.createIndex('session_id', 'session_id');
            trialsStore.createIndex('timestamp', 'timestamp');
          }
          if (!db.objectStoreNames.contains('sessions')) {
            const sessionsStore = db.createObjectStore('sessions', { keyPath: 'session_id' });
            sessionsStore.createIndex('timestamp', 'timestamp');
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }
        },
      });
    }
  }

  // --- SETTINGS ---
  public async getSettings(): Promise<CaregiverSettings> {
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        const stored = await db.get('settings', 'current');
        if (stored) return { ...DEFAULT_SETTINGS, ...stored };
      } catch {
        // Fallback
      }
    }
    const local = localStorage.getItem('nw_settings');
    if (local) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
      } catch {
        // Fallback
      }
    }
    return DEFAULT_SETTINGS;
  }

  public async saveSettings(settings: CaregiverSettings): Promise<void> {
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        await db.put('settings', settings, 'current');
      } catch {
        // Fallback
      }
    }
    localStorage.setItem('nw_settings', JSON.stringify(settings));
  }

  // --- DECISIONS ---
  public async logDecision(event: DecisionEvent): Promise<void> {
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        await db.add('decisions', event);
        return;
      } catch {
        // Fallback
      }
    }
    const existing = JSON.parse(localStorage.getItem('nw_decisions') || '[]');
    existing.push(event);
    localStorage.setItem('nw_decisions', JSON.stringify(existing.slice(-200)));
  }

  public async getDecisions(sessionId?: string): Promise<DecisionEvent[]> {
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        if (sessionId) {
          return await db.getAllFromIndex('decisions', 'session_id', sessionId);
        }
        return await db.getAll('decisions');
      } catch {
        // Fallback
      }
    }
    const stored: DecisionEvent[] = JSON.parse(localStorage.getItem('nw_decisions') || '[]');
    if (sessionId) {
      return stored.filter((d) => d.session_id === sessionId);
    }
    return stored;
  }

  // --- TRIALS ---
  public async logTrial(event: TrialEvent): Promise<void> {
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        await db.add('trials', event);
        return;
      } catch {
        // Fallback
      }
    }
    const existing = JSON.parse(localStorage.getItem('nw_trials') || '[]');
    existing.push(event);
    localStorage.setItem('nw_trials', JSON.stringify(existing.slice(-100)));
  }

  public async getTrials(sessionId?: string): Promise<TrialEvent[]> {
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        if (sessionId) {
          return await db.getAllFromIndex('trials', 'session_id', sessionId);
        }
        return await db.getAll('trials');
      } catch {
        // Fallback
      }
    }
    const stored: TrialEvent[] = JSON.parse(localStorage.getItem('nw_trials') || '[]');
    if (sessionId) {
      return stored.filter((t) => t.session_id === sessionId);
    }
    return stored;
  }

  // --- SESSIONS ---
  public async saveSessionSummary(summary: SessionSummary): Promise<void> {
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        await db.put('sessions', summary);
        return;
      } catch {
        // Fallback
      }
    }
    const existing = JSON.parse(localStorage.getItem('nw_sessions') || '[]');
    const filtered = existing.filter((s: SessionSummary) => s.session_id !== summary.session_id);
    filtered.push(summary);
    localStorage.setItem('nw_sessions', JSON.stringify(filtered));
  }

  public async getAllSessions(): Promise<SessionSummary[]> {
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        const list = await db.getAll('sessions');
        return list.sort((a, b) => b.timestamp - a.timestamp);
      } catch {
        // Fallback
      }
    }
    const stored: SessionSummary[] = JSON.parse(localStorage.getItem('nw_sessions') || '[]');
    return stored.sort((a, b) => b.timestamp - a.timestamp);
  }

  public async getLatestSession(): Promise<SessionSummary | null> {
    const sessions = await this.getAllSessions();
    return sessions.length > 0 ? sessions[0]! : null;
  }

  // --- EXPORT & PURGE ---
  public async exportAllJSON(): Promise<string> {
    const [settings, sessions, trials, decisions] = await Promise.all([
      this.getSettings(),
      this.getAllSessions(),
      this.getTrials(),
      this.getDecisions(),
    ]);

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        settings: { ...settings, pin: '****' },
        sessions,
        trials,
        decisions,
      },
      null,
      2
    );
  }

  public async exportAllCSV(): Promise<{ sessionsCsv: string; trialsCsv: string; decisionsCsv: string }> {
    const [sessions, trials, decisions] = await Promise.all([
      this.getAllSessions(),
      this.getTrials(),
      this.getDecisions(),
    ]);

    // Sessions CSV
    const sessionHeaders = ['session_id', 'timestamp', 'date', 'CT_k', 'smoothed_CT_k', 'delta_k', 'delta_next', 'distress_k', 'trial_count', 'completed'];
    const sessionRows = sessions.map((s) => [
      s.session_id,
      s.timestamp,
      new Date(s.timestamp).toISOString(),
      s.CT_k.toFixed(4),
      s.smoothed_CT_k.toFixed(4),
      s.delta_k.toFixed(4),
      s.delta_next.toFixed(4),
      s.distress_k,
      s.trial_count,
      s.completed,
    ]);
    const sessionsCsv = [sessionHeaders.join(','), ...sessionRows.map((r) => r.join(','))].join('\n');

    // Trials CSV
    const trialHeaders = ['session_id', 'trial_id', 'task', 'correct_fraction', 'n_errors', 'path_efficiency', 'latency_ms', 'hint_level', 'delta', 'emotion_state', 'timestamp'];
    const trialRows = trials.map((t) => [
      t.session_id,
      t.trial_id,
      t.task,
      t.correct_fraction.toFixed(4),
      t.n_errors,
      t.path_efficiency.toFixed(4),
      Math.round(t.latency_ms),
      t.hint_level,
      t.delta.toFixed(4),
      t.emotion_state,
      t.timestamp,
    ]);
    const trialsCsv = [trialHeaders.join(','), ...trialRows.map((r) => r.join(','))].join('\n');

    // Decisions CSV
    const decisionHeaders = ['session_id', 'trial_id', 'task', 'junction_id', 'chosen_edge', 'correct', 'latency_ms', 'hint_level', 'timestamp'];
    const decisionRows = decisions.map((d) => [
      d.session_id,
      d.trial_id,
      d.task,
      d.junction_id,
      d.chosen_edge,
      d.correct,
      Math.round(d.latency_ms),
      d.hint_level,
      d.timestamp,
    ]);
    const decisionsCsv = [decisionHeaders.join(','), ...decisionRows.map((r) => r.join(','))].join('\n');

    return { sessionsCsv, trialsCsv, decisionsCsv };
  }

  public async deleteAllData(): Promise<void> {
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        await db.clear('decisions');
        await db.clear('trials');
        await db.clear('sessions');
      } catch {
        // Fallback
      }
    }
    localStorage.removeItem('nw_decisions');
    localStorage.removeItem('nw_trials');
    localStorage.removeItem('nw_sessions');
  }
}

export const storageService = new StorageService();
