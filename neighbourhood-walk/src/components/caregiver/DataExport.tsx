/**
 * Data Export & Purge Component
 *
 * Downloads research records as JSON or CSV and allows local data reset.
 */

import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { Button } from '../common/Button';
import { Trash2, AlertTriangle, FileSpreadsheet, FileCode } from 'lucide-react';

export const DataExport: React.FC = () => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [deleteSuccess, setDeleteSuccess] = useState<boolean>(false);

  const handleDownloadJSON = async () => {
    const jsonStr = await storageService.exportAllJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neighbourhood_walk_data_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = async () => {
    const { sessionsCsv, trialsCsv, decisionsCsv } = await storageService.exportAllCSV();

    // Helper to download individual CSV files
    const downloadFile = (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    downloadFile(sessionsCsv, `nw_sessions_${Date.now()}.csv`);
    downloadFile(trialsCsv, `nw_trials_${Date.now()}.csv`);
    downloadFile(decisionsCsv, `nw_decisions_${Date.now()}.csv`);
  };

  const handleDeleteAll = async () => {
    await storageService.deleteAllData();
    setIsConfirmingDelete(false);
    setDeleteSuccess(true);
    setTimeout(() => setDeleteSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-xl mx-auto py-2">
      {/* Research Export Section */}
      <div className="p-6 rounded-2xl bg-stone-100 dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-700">
        <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Research Dataset Export
        </h3>
        <p className="text-stone-600 dark:text-stone-400 mb-6 text-base">
          Export full decision logs, trial metrics, cognitive trace summaries, and strategy breakdowns.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            size="normal"
            icon={<FileCode size={22} />}
            onClick={handleDownloadJSON}
            className="flex-1"
          >
            Export JSON
          </Button>

          <Button
            variant="outline"
            size="normal"
            icon={<FileSpreadsheet size={22} />}
            onClick={handleDownloadCSV}
            className="flex-1"
          >
            Export CSVs
          </Button>
        </div>
      </div>

      {/* Danger Zone: Data Reset */}
      <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-900">
        <h3 className="text-xl font-bold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
          <AlertTriangle size={22} />
          <span>Device Data Reset</span>
        </h3>
        <p className="text-red-800 dark:text-red-400 mb-6 text-base">
          Permanently erases all local trial and decision records from this device.
        </p>

        {deleteSuccess && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold">
            All stored research records have been erased.
          </div>
        )}

        {!isConfirmingDelete ? (
          <Button
            variant="subtle"
            size="normal"
            icon={<Trash2 size={22} />}
            onClick={() => setIsConfirmingDelete(true)}
            className="text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
          >
            Delete All Data
          </Button>
        ) : (
          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border-2 border-red-500 space-y-4">
            <p className="font-bold text-red-600 dark:text-red-400 text-lg">
              Are you completely sure? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <Button
                variant="primary"
                size="normal"
                onClick={handleDeleteAll}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Permanently Erase
              </Button>
              <Button
                variant="subtle"
                size="normal"
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
