/**
 * Caregiver Portal Dashboard
 */

import React, { useState } from 'react';
import type { CaregiverSettings } from '../../types/session';
import { Modal } from '../common/Modal';
import { HistoryTable } from './HistoryTable';
import { SettingsForm } from './SettingsForm';
import { DataExport } from './DataExport';
import { LineChart, Sliders, Database } from 'lucide-react';

interface CaregiverPortalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CaregiverSettings;
  onSaveSettings: (updated: CaregiverSettings) => void;
}

type TabKey = 'history' | 'settings' | 'export';

export const CaregiverPortal: React.FC<CaregiverPortalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('history');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Caregiver & Research Portal">
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-stone-200 dark:border-stone-800 gap-2 pb-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-lg transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-100 text-amber-900 dark:bg-stone-800 dark:text-amber-400'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <LineChart size={20} />
            <span>Session History</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-lg transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-100 text-amber-900 dark:bg-stone-800 dark:text-amber-400'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Sliders size={20} />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-lg transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'bg-amber-100 text-amber-900 dark:bg-stone-800 dark:text-amber-400'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Database size={20} />
            <span>Data & Export</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div>
          {activeTab === 'history' && <HistoryTable />}
          {activeTab === 'settings' && (
            <SettingsForm initialSettings={settings} onSaved={onSaveSettings} />
          )}
          {activeTab === 'export' && <DataExport />}
        </div>
      </div>
    </Modal>
  );
};
