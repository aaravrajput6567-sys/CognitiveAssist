import React, { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen.tsx';
import { CalibrationBlock } from './components/calibration/CalibrationBlock.tsx';
import { TrialContainer } from './components/trial/TrialContainer.tsx';
import { SessionWrapUp } from './components/wrapup/SessionWrapUp.tsx';
import { CaregiverPortal } from './components/caregiver/CaregiverPortal.tsx';
import { PersistentFooter } from './components/common/PersistentFooter.tsx';
import { LiveAnnouncer } from './components/common/LiveAnnouncer.tsx';
import { storageService } from './services/storageService.ts';
import { speechService } from './services/speechService.ts';
import {
  calculateSessionCT,
  calculateSmoothedCT,
} from './services/scoring.ts';
import { computeSessionDifficultyUpdate } from './services/difficulty.ts';
import { DEFAULT_ROUTINES } from './config/defaultRoutines.ts';
import { DIFFICULTY_CONFIG } from './config/difficultyConfig.ts';
import type { CaregiverSettings, SessionSummary } from './types/session.ts';
import type { TrialResult, TrialEvent } from './types/trial.ts';

type AppScreen = 'welcome' | 'calibration' | 'trials' | 'wrapup';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('welcome');
  const [settings, setSettings] = useState<CaregiverSettings>({
    pin: DIFFICULTY_CONFIG.DEFAULT_CAREGIVER_PIN,
    nickname: 'Participant',
    fontSize: 'normal',
    contrastTheme: 'dark',
    speechEnabled: true,
    sessionLength: DIFFICULTY_CONFIG.DEFAULT_SESSION_TRIALS,
    activeRoutineIds: DEFAULT_ROUTINES.map((r) => r.id),
    locale: 'en',
  });

  const [currentDelta, setCurrentDelta] = useState<number>(DIFFICULTY_CONFIG.INITIAL_DELTA);
  const [lambdaRef, setLambdaRef] = useState<number>(1400);
  const [isCaregiverOpen, setIsCaregiverOpen] = useState<boolean>(false);

  // Active Session state
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [completedTrialsCount, setCompletedTrialsCount] = useState<number>(0);

  // Initialize from local storage
  useEffect(() => {
    const initApp = async () => {
      const storedSettings = await storageService.getCaregiverSettings();
      const storedDelta = await storageService.getCurrentDelta();
      const storedCalibration = await storageService.getCalibration();

      setSettings(storedSettings);
      setCurrentDelta(storedDelta);
      if (storedCalibration) {
        setLambdaRef(storedCalibration.lambda_ref);
      }

      // Apply accessibility settings to DOM
      document.body.setAttribute('data-font-size', storedSettings.fontSize);
      document.body.setAttribute('data-theme', storedSettings.contrastTheme);
      speechService.setEnabled(storedSettings.speechEnabled);
    };

    initApp();
  }, []);

  const handleUpdateSettings = async (partial: Partial<CaregiverSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await storageService.saveCaregiverSettings(partial);

    if (partial.fontSize) {
      document.body.setAttribute('data-font-size', partial.fontSize);
    }
    if (partial.contrastTheme) {
      document.body.setAttribute('data-theme', partial.contrastTheme);
    }
    if (partial.speechEnabled !== undefined) {
      speechService.setEnabled(partial.speechEnabled);
    }
  };

  const handleStartCalibration = () => {
    setScreen('calibration');
  };

  const handleCalibrationComplete = (measuredLambdaRef: number) => {
    setLambdaRef(measuredLambdaRef);
    const newSessionId = `sess_${Date.now()}`;
    setActiveSessionId(newSessionId);
    setSessionStartTime(Date.now());
    setScreen('trials');
  };

  const handleSessionComplete = async (
    trialResults: TrialResult[],
    trialEvents: TrialEvent[]
  ) => {
    setCompletedTrialsCount(trialResults.length);

    // 1. Calculate raw session score CT_k
    const trialScores = trialResults.map((r) => r.s_i);
    const CT_k = calculateSessionCT(trialScores);

    // 2. Fetch last session to retrieve previous smoothed CT~
    const previousSessions = await storageService.getAllSessions();
    const prevSmoothedCT =
      previousSessions.length > 0 ? previousSessions[0].smoothed_CT_k : null;

    // 3. Calculate smoothed CT~_k = rho * CT_k + (1 - rho) * CT~_{k-1}
    const smoothed_CT_k = calculateSmoothedCT(CT_k, prevSmoothedCT);

    // 4. Calculate distress rate (fraction of trials with distress/support fired)
    const distressCount = trialResults.filter((r) => r.distressTriggered).length;
    const distressRate = trialResults.length > 0 ? distressCount / trialResults.length : 0;

    // 5. Compute asymmetric difficulty update
    const updateResult = computeSessionDifficultyUpdate(
      currentDelta,
      smoothed_CT_k,
      distressRate
    );

    // 6. Persist next delta
    await storageService.saveCurrentDelta(updateResult.delta_next);
    setCurrentDelta(updateResult.delta_next);

    // 7. Persist session summary
    const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));
    const sessionSummary: SessionSummary = {
      session_id: activeSessionId,
      timestamp: Date.now(),
      nickname: settings.nickname,
      CT_k: Number(CT_k.toFixed(4)),
      smoothed_CT_k: Number(smoothed_CT_k.toFixed(4)),
      delta_k: Number(currentDelta.toFixed(4)),
      delta_next: updateResult.delta_next,
      distress_k: updateResult.distress_k,
      total_trials: trialResults.length,
      duration_seconds: durationSeconds,
      trial_events: trialEvents,
    };

    await storageService.saveSessionSummary(sessionSummary);

    // 8. Transition to warm Wrap-Up
    setScreen('wrapup');
  };

  // Filter active routines based on settings
  const activeRoutines = DEFAULT_ROUTINES.filter((r) =>
    settings.activeRoutineIds.includes(r.id)
  );
  const selectedRoutines = activeRoutines.length > 0 ? activeRoutines : DEFAULT_ROUTINES;

  return (
    <div className="app-container">
      {/* Top Speech Caption Banner */}
      <div style={{ maxWidth: '960px', width: '100%', margin: '0 auto', padding: 'var(--space-sm) var(--space-md) 0' }}>
        <LiveAnnouncer />
      </div>

      {screen === 'welcome' && (
        <WelcomeScreen
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onStartCalibration={handleStartCalibration}
          onOpenCaregiver={() => setIsCaregiverOpen(true)}
        />
      )}

      {screen === 'calibration' && (
        <CalibrationBlock onComplete={handleCalibrationComplete} />
      )}

      {screen === 'trials' && (
        <TrialContainer
          sessionId={activeSessionId}
          totalTrials={settings.sessionLength}
          activeRoutines={selectedRoutines}
          initialDelta={currentDelta}
          lambdaRef={lambdaRef}
          onSessionComplete={handleSessionComplete}
        />
      )}

      {screen === 'wrapup' && (
        <SessionWrapUp
          completedTrialsCount={completedTrialsCount}
          totalTrialsCount={settings.sessionLength}
          onRestart={handleStartCalibration}
          onReturnHome={() => setScreen('welcome')}
        />
      )}

      {/* Caregiver & Clinician Portal Dialog */}
      <CaregiverPortal
        isOpen={isCaregiverOpen}
        onClose={() => setIsCaregiverOpen(false)}
        onSettingsChanged={(updated) => {
          setSettings(updated);
          document.body.setAttribute('data-font-size', updated.fontSize);
          document.body.setAttribute('data-theme', updated.contrastTheme);
          speechService.setEnabled(updated.speechEnabled);
        }}
      />

      {/* Persistent Research Prototype Disclaimer Footer */}
      <PersistentFooter />
    </div>
  );
};

export default App;
