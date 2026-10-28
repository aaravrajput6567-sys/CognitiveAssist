import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Download,
  Trash2,
  Settings,
  History,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';
import { storageService } from '../../services/storageService.ts';
import { DEFAULT_ROUTINES } from '../../config/defaultRoutines.ts';
import type { SessionSummary, CaregiverSettings } from '../../types/session.ts';

interface CaregiverPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged: (updated: CaregiverSettings) => void;
}

export const CaregiverPortal: React.FC<CaregiverPortalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<'history' | 'settings' | 'export'>('history');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [settings, setSettings] = useState<CaregiverSettings | null>(null);
  const [currentDelta, setCurrentDelta] = useState<number>(0.3);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      setIsAuthenticated(false);
      setEnteredPin('');
      setPinError(false);
    }
  }, [isOpen]);

  const loadData = async () => {
    const s = await storageService.getCaregiverSettings();
    const sess = await storageService.getAllSessions();
    const d = await storageService.getCurrentDelta();
    setSettings(s);
    setSessions(sess);
    setCurrentDelta(d);
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;

    if (enteredPin === settings.pin) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    await storageService.saveCaregiverSettings(settings);
    onSettingsChanged(settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportJSON = async () => {
    const jsonStr = await storageService.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morning_routine_records_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    const csvStr = await storageService.exportCSV();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morning_routine_sessions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = async () => {
    await storageService.deleteAllData();
    setShowDeleteConfirm(false);
    await loadData();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Caregiver & Clinician Portal">
      {!isAuthenticated ? (
        // PIN Entry Screen
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <Lock size={36} />
          </div>

          <h3 style={{ fontSize: 'var(--font-heading)', textAlign: 'center' }}>
            Caregiver Access Protection
          </h3>

          <p style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>
            Enter your 4-digit PIN to access session logs, clinical parameters, and data export. (Default PIN: 1234)
          </p>

          <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)', width: '100%', maxWidth: '300px' }}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={enteredPin}
              onChange={(e) => {
                setEnteredPin(e.target.value);
                setPinError(false);
              }}
              placeholder="••••"
              autoFocus
              aria-label="4-digit Caregiver PIN"
              style={{
                width: '100%',
                fontSize: '36px',
                textAlign: 'center',
                letterSpacing: '12px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: pinError ? '3px solid #EF4444' : '3px solid var(--border-strong)',
              }}
            />

            {pinError && (
              <span style={{ color: '#EF4444', fontSize: 'var(--font-small)', fontWeight: 600 }}>
                Incorrect PIN. Please try again.
              </span>
            )}

            <Button variant="primary" size="large" type="submit" style={{ width: '100%', marginTop: '8px' }}>
              <Unlock size={24} />
              <span>Unlock Portal</span>
            </Button>
          </form>
        </div>
      ) : (
        // Authenticated Caregiver Dashboard
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Header Overview Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-sm)',
              padding: 'var(--space-sm)',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--border-subtle)',
            }}
          >
            <div>
              <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-dim)' }}>Participant</span>
              <div style={{ fontSize: 'var(--font-base)', fontWeight: 700 }}>{settings?.nickname}</div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-dim)' }}>Current Difficulty (δ)</span>
              <div style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--accent)' }}>
                {currentDelta.toFixed(3)}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-dim)' }}>Total Sessions</span>
              <div style={{ fontSize: 'var(--font-base)', fontWeight: 700 }}>{sessions.length}</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '4px' }}>
            <Button
              variant={activeTab === 'history' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('history')}
            >
              <History size={20} />
              <span>History</span>
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={20} />
              <span>Settings</span>
            </Button>
            <Button
              variant={activeTab === 'export' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('export')}
            >
              <Download size={20} />
              <span>Export & Privacy</span>
            </Button>
          </div>

          {/* TAB 1: HISTORY */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {sessions.length === 0 ? (
                <p style={{ padding: 'var(--space-lg) 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                  No sessions recorded yet. Completed sessions will appear here.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {sessions.map((session) => {
                    const isExpanded = expandedSessionId === session.session_id;
                    const dateStr = new Date(session.timestamp).toLocaleString();

                    return (
                      <div
                        key={session.session_id}
                        style={{
                          border: '2px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-card)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          onClick={() => setExpandedSessionId(isExpanded ? null : session.session_id)}
                          style={{
                            padding: 'var(--space-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            flexWrap: 'wrap',
                            gap: 'var(--space-xs)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>{dateStr}</div>
                            <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)' }}>
                              {session.total_trials} trials • {Math.round(session.duration_seconds / 60)} min
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-dim)' }}>CT~ Score: </span>
                              <strong>{session.smoothed_CT_k.toFixed(2)}</strong>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-dim)' }}>Next δ: </span>
                              <strong style={{ color: 'var(--accent)' }}>{session.delta_next.toFixed(2)}</strong>
                            </div>
                            {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                          </div>
                        </div>

                        {/* Expanded Trial Event Details */}
                        {isExpanded && (
                          <div style={{ padding: 'var(--space-sm)', backgroundColor: 'var(--bg-surface-elevated)', borderTop: '2px solid var(--border-subtle)' }}>
                            <h4 style={{ fontSize: 'var(--font-small)', marginBottom: '8px', fontWeight: 700 }}>
                              Trial Events (Retrieval Log):
                            </h4>
                            {session.trial_events && session.trial_events.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {session.trial_events.map((evt, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      fontSize: 'var(--font-small)',
                                      padding: '6px 10px',
                                      backgroundColor: 'var(--bg-surface)',
                                      borderRadius: 'var(--radius-sm)',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      flexWrap: 'wrap',
                                      gap: '4px',
                                    }}
                                  >
                                    <span><strong>{evt.trial_id}</strong> (δ: {evt.delta})</span>
                                    <span>Acc: {(evt.correct_fraction * 100).toFixed(0)}%</span>
                                    <span>Intrusions: {evt.n_intrusions}</span>
                                    <span>Latency: {evt.latency_ms}ms</span>
                                    <span>Hint: L{evt.hint_level}</span>
                                    <span>Emotion: {evt.emotion_state}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-dim)' }}>
                                Summary log: CT_k={session.CT_k.toFixed(3)}, Distress={session.distress_k ? 'YES' : 'NO'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SETTINGS */}
          {activeTab === 'settings' && settings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-small)', fontWeight: 700, marginBottom: '4px' }}>
                  Participant Nickname (No PII)
                </label>
                <input
                  type="text"
                  value={settings.nickname}
                  onChange={(e) => setSettings({ ...settings, nickname: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '2px solid var(--border-strong)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-small)', fontWeight: 700, marginBottom: '4px' }}>
                  Trials Per Session
                </label>
                <select
                  value={settings.sessionLength}
                  onChange={(e) => setSettings({ ...settings, sessionLength: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '2px solid var(--border-strong)',
                  }}
                >
                  <option value={5}>5 Trials (Standard ~10-12 mins)</option>
                  <option value={6}>6 Trials (Extended ~12-15 mins)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-small)', fontWeight: 700, marginBottom: '8px' }}>
                  Active Routine Sets (Pick at least 3)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                  {DEFAULT_ROUTINES.map((r) => {
                    const isChecked = settings.activeRoutineIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: 'var(--font-small)',
                          padding: '8px',
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSettings({
                                ...settings,
                                activeRoutineIds: [...settings.activeRoutineIds, r.id],
                              });
                            } else {
                              if (settings.activeRoutineIds.length > 2) {
                                setSettings({
                                  ...settings,
                                  activeRoutineIds: settings.activeRoutineIds.filter((id) => id !== r.id),
                                });
                              }
                            }
                          }}
                          style={{ width: '22px', height: '22px' }}
                        />
                        <span>{r.defaultTitle}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-small)', fontWeight: 700, marginBottom: '4px' }}>
                  Caregiver 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={settings.pin}
                  onChange={(e) => setSettings({ ...settings, pin: e.target.value })}
                  style={{
                    width: '160px',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '2px solid var(--border-strong)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Button variant="primary" onClick={handleSaveSettings}>
                  <Check size={24} />
                  <span>Save Settings</span>
                </Button>
                {saveSuccess && (
                  <span style={{ color: 'var(--success-glow)', fontWeight: 600, fontSize: 'var(--font-small)' }}>
                    Settings saved successfully!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EXPORT & PRIVACY */}
          {activeTab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div
                style={{
                  padding: 'var(--space-md)',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--border-subtle)',
                }}
              >
                <h4 style={{ fontSize: 'var(--font-subheading)', fontWeight: 700, marginBottom: '8px' }}>
                  Data Export
                </h4>
                <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Download clinical session history and calibration metrics directly to your device. No data is ever sent to external cloud servers.
                </p>

                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={handleExportJSON}>
                    <Download size={22} />
                    <span>Download JSON</span>
                  </Button>
                  <Button variant="secondary" onClick={handleExportCSV}>
                    <FileSpreadsheet size={22} />
                    <span>Download CSV</span>
                  </Button>
                </div>
              </div>

              <div
                style={{
                  padding: 'var(--space-md)',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid #EF4444',
                }}
              >
                <h4 style={{ fontSize: 'var(--font-subheading)', fontWeight: 700, color: '#EF4444', marginBottom: '8px' }}>
                  Permanent Data Erasure
                </h4>
                <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Permanently delete all session records, trial logs, and calibration data from this device.
                </p>

                {!showDeleteConfirm ? (
                  <Button
                    variant="secondary"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{ borderColor: '#EF4444', color: '#EF4444' }}
                  >
                    <Trash2 size={22} />
                    <span>Delete All Data</span>
                  </Button>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-sm)',
                      padding: 'var(--space-sm)',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '2px solid #EF4444',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontWeight: 700 }}>
                      <AlertTriangle size={24} />
                      <span>Are you absolutely sure? This cannot be undone.</span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <Button
                        variant="primary"
                        onClick={handleDeleteAll}
                        style={{ backgroundColor: '#DC2626', borderColor: '#DC2626', color: '#FFFFFF' }}
                      >
                        Yes, Permanently Delete
                      </Button>
                      <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
