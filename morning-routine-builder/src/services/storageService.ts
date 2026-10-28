import { openDB, type IDBPDatabase } from 'idb';
import { DIFFICULTY_CONFIG } from '../config/difficultyConfig.ts';
import type { SessionSummary, CalibrationData, CaregiverSettings } from '../types/session.ts';
import type { TrialEvent } from '../types/trial.ts';

const DB_NAME = 'MorningRoutineBuilderDB';
const DB_VERSION = 1;

const DEFAULT_SETTINGS: CaregiverSettings = {
  pin: DIFFICULTY_CONFIG.DEFAULT_CAREGIVER_PIN,
  nickname: 'Participant',
  fontSize: 'normal',
  contrastTheme: 'dark',
  speechEnabled: true,
  sessionLength: DIFFICULTY_CONFIG.DEFAULT_SESSION_TRIALS,
  activeRoutineIds: ['morning_routine', 'making_tea', 'washing_clothes', 'going_to_market', 'tending_garden', 'evening_bedtime', 'baking_cookies', 'morning_health_check'],
  locale: 'en',
};

class StorageService {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions', { keyPath: 'session_id' });
          }
          if (!db.objectStoreNames.contains('trial_events')) {
            const trialStore = db.createObjectStore('trial_events', {
              keyPath: 'event_id',
              autoIncrement: true,
            });
            trialStore.createIndex('session_id', 'session_id', { unique: false });
          }
          if (!db.objectStoreNames.contains('keyval')) {
            db.createObjectStore('keyval');
          }
        },
      });
    }
    return this.dbPromise;
  }

  // --- Calibration ---
  async saveCalibration(data: CalibrationData): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put('keyval', data, 'calibration');
    } catch {
      localStorage.setItem('mrb_calibration', JSON.stringify(data));
    }
  }

  async getCalibration(): Promise<CalibrationData | null> {
    try {
      const db = await this.getDB();
      const val = await db.get('keyval', 'calibration');
      if (val) return val;
    } catch {
      // fallback
    }
    const local = localStorage.getItem('mrb_calibration');
    return local ? JSON.parse(local) : null;
  }

  // --- Delta ---
  async getCurrentDelta(): Promise<number> {
    try {
      const db = await this.getDB();
      const val = await db.get('keyval', 'current_delta');
      if (typeof val === 'number') return val;
    } catch {
      // fallback
    }
    const local = localStorage.getItem('mrb_current_delta');
    return local ? Number(local) : DIFFICULTY_CONFIG.INITIAL_DELTA;
  }

  async saveCurrentDelta(delta: number): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put('keyval', delta, 'current_delta');
    } catch {
      // fallback
    }
    localStorage.setItem('mrb_current_delta', String(delta));
  }

  // --- Trial Events ---
  async saveTrialEvent(event: TrialEvent): Promise<void> {
    try {
      const db = await this.getDB();
      await db.add('trial_events', event);
    } catch {
      const key = `mrb_trial_${event.session_id}_${event.trial_id}`;
      localStorage.setItem(key, JSON.stringify(event));
    }
  }

  // --- Sessions ---
  async saveSessionSummary(session: SessionSummary): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put('sessions', session);
    } catch {
      const existing = this.getLocalSessions();
      existing.push(session);
      localStorage.setItem('mrb_sessions', JSON.stringify(existing));
    }
  }

  private getLocalSessions(): SessionSummary[] {
    const raw = localStorage.getItem('mrb_sessions');
    return raw ? JSON.parse(raw) : [];
  }

  async getAllSessions(): Promise<SessionSummary[]> {
    try {
      const db = await this.getDB();
      const sessions = await db.getAll('sessions');
      if (sessions && sessions.length > 0) {
        return sessions.sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch {
      // fallback
    }
    return this.getLocalSessions().sort((a, b) => b.timestamp - a.timestamp);
  }

  // --- Settings ---
  async getCaregiverSettings(): Promise<CaregiverSettings> {
    try {
      const db = await this.getDB();
      const settings = await db.get('keyval', 'settings');
      if (settings) {
        return { ...DEFAULT_SETTINGS, ...settings };
      }
    } catch {
      // fallback
    }
    const local = localStorage.getItem('mrb_settings');
    return local ? { ...DEFAULT_SETTINGS, ...JSON.parse(local) } : DEFAULT_SETTINGS;
  }

  async saveCaregiverSettings(partial: Partial<CaregiverSettings>): Promise<void> {
    const current = await this.getCaregiverSettings();
    const updated = { ...current, ...partial };
    try {
      const db = await this.getDB();
      await db.put('keyval', updated, 'settings');
    } catch {
      // fallback
    }
    localStorage.setItem('mrb_settings', JSON.stringify(updated));
  }

  // --- Export and Purge ---
  async exportJSON(): Promise<string> {
    const sessions = await this.getAllSessions();
    const calibration = await this.getCalibration();
    const settings = await this.getCaregiverSettings();
    const delta = await this.getCurrentDelta();

    const data = {
      exported_at: new Date().toISOString(),
      disclaimer: 'Research prototype. Not a medical device. Not for diagnosis or treatment.',
      current_delta: delta,
      calibration,
      settings: { ...settings, pin: '****' },
      sessions,
    };

    return JSON.stringify(data, null, 2);
  }

  async exportCSV(): Promise<string> {
    const sessions = await this.getAllSessions();
    const headers = [
      'session_id',
      'date_iso',
      'nickname',
      'total_trials',
      'duration_sec',
      'CT_k',
      'smoothed_CT_k',
      'delta_k',
      'delta_next',
      'distress_k',
    ];

    const rows = sessions.map((s) => [
      s.session_id,
      new Date(s.timestamp).toISOString(),
      `"${s.nickname.replace(/"/g, '""')}"`,
      s.total_trials,
      s.duration_seconds,
      s.CT_k.toFixed(4),
      s.smoothed_CT_k.toFixed(4),
      s.delta_k.toFixed(4),
      s.delta_next.toFixed(4),
      s.distress_k,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  async deleteAllData(): Promise<void> {
    try {
      const db = await this.getDB();
      await db.clear('sessions');
      await db.clear('trial_events');
      await db.clear('keyval');
    } catch {
      // fallback
    }
    localStorage.clear();
  }
}

export const storageService = new StorageService();
