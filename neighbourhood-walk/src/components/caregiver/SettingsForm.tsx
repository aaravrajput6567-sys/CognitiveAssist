/**
 * Caregiver Settings Form
 */

import React, { useState } from 'react';
import type { CaregiverSettings } from '../../types/session';
import { storageService } from '../../services/storageService';
import { Button } from '../common/Button';
import { Save, Check } from 'lucide-react';

interface SettingsFormProps {
  initialSettings: CaregiverSettings;
  onSaved: (updated: CaregiverSettings) => void;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ initialSettings, onSaved }) => {
  const [settings, setSettings] = useState<CaregiverSettings>(initialSettings);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await storageService.saveSettings(settings);
    setSavedSuccess(true);
    onSaved(settings);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto py-2">
      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold flex items-center gap-2">
          <Check size={20} />
          <span>Settings successfully saved!</span>
        </div>
      )}

      {/* Nickname */}
      <div>
        <label className="block text-lg font-bold mb-2">Participant Nickname</label>
        <input
          type="text"
          value={settings.nickname}
          onChange={(e) => setSettings({ ...settings, nickname: e.target.value })}
          className="w-full px-4 py-3 text-lg rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          placeholder="e.g. Eleanor"
          maxLength={24}
        />
        <p className="text-sm text-stone-500 mt-1">Stored only on this device for a friendly greeting.</p>
      </div>

      {/* PIN */}
      <div>
        <label className="block text-lg font-bold mb-2">4-Digit Caregiver PIN</label>
        <input
          type="password"
          value={settings.pin}
          onChange={(e) => setSettings({ ...settings, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          className="w-full px-4 py-3 text-lg rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 tracking-widest font-mono"
          maxLength={4}
        />
      </div>

      {/* Session Trials */}
      <div>
        <label className="block text-lg font-bold mb-2">Walks Per Session</label>
        <select
          value={settings.sessionTrials}
          onChange={(e) => setSettings({ ...settings, sessionTrials: Number(e.target.value) })}
          className="w-full px-4 py-3 text-lg rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
        >
          <option value={3}>3 Walks (~7 minutes)</option>
          <option value={4}>4 Walks (~10 minutes)</option>
          <option value={5}>5 Walks (~12 minutes - Recommended)</option>
          <option value={6}>6 Walks (~15 minutes)</option>
        </select>
      </div>

      {/* Encoding View */}
      <div>
        <label className="block text-lg font-bold mb-2">Route Learning View Mode</label>
        <select
          value={settings.accessibility.encodingView}
          onChange={(e) =>
            setSettings({
              ...settings,
              accessibility: {
                ...settings.accessibility,
                encodingView: e.target.value as 'scenes' | 'map' | 'both',
              },
            })
          }
          className="w-full px-4 py-3 text-lg rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
        >
          <option value="scenes">Scenes (First-person landmark scene cards - Default)</option>
          <option value="map">Map (Overhead topological road map)</option>
          <option value="both">Both (Scene card walk, followed by mini map overview)</option>
        </select>
      </div>

      {/* Language */}
      <div>
        <label className="block text-lg font-bold mb-2">Language / Locale</label>
        <select
          value={settings.accessibility.locale}
          onChange={(e) =>
            setSettings({
              ...settings,
              accessibility: { ...settings.accessibility, locale: e.target.value },
            })
          }
          className="w-full px-4 py-3 text-lg rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
        >
          <option value="en">English (Default)</option>
          <option value="es">Español (Spanish Structure)</option>
        </select>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          variant="primary"
          size="normal"
          icon={<Save size={22} />}
          className="w-full text-xl"
        >
          Save Configuration
        </Button>
      </div>
    </form>
  );
};
