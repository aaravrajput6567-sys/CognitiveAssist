/**
 * Neighbourhood Walk - Main Application Container
 *
 * Spatial-navigation memory game for older adults with mild cognitive impairment.
 * Research prototype. Fully client-side, on-device data persistence.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { CaregiverSettings, CalibrationData, SessionSummary } from './types/session';
import type { Route, ShortcutProblem, TaskType, TrialScoreResult } from './types/trial';
import type { TownGraph } from './types/graph';
import type { EmotionMetrics } from './types/emotion';
import { DIFFICULTY_CONFIG } from './config/difficultyConfig';
import { ACCESSIBILITY_CONFIG } from './config/accessibilityConfig';
import { createPRNG } from './engine/prng';
import { generateTownGraph } from './engine/townGenerator';
import { generateLearnedRoute, generateRouteWithGuaranteedShortcut } from './engine/routeGenerator';
import { calculateSessionCT, calculateSmoothedCT } from './engine/scoring';
import { updateDifficultyBetweenSessions } from './services/difficultyService';
import { storageService } from './services/storageService';
import { speechService } from './services/speechService';

// UI Components
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { CalibrationBlock } from './components/onboarding/CalibrationBlock';
import { TrialContainer } from './components/trial/TrialContainer';
import { SessionWrapUp } from './components/wrapup/SessionWrapUp';
import { PersistentFooter } from './components/common/PersistentFooter';
import { LiveAnnouncer } from './components/common/LiveAnnouncer';
import { CaregiverPINModal } from './components/caregiver/CaregiverPINModal';
import { CaregiverPortal } from './components/caregiver/CaregiverPortal';
import { GuideCharacterSvg } from './components/svg/GuideCharacterSvg';
import { Volume2, VolumeX, Home } from 'lucide-react';

type ScreenState = 'welcome' | 'calibration' | 'trial' | 'wrapup';

export const App: React.FC = () => {
  // Settings & Accessibility
  const [settings, setSettings] = useState<CaregiverSettings>({
    pin: '1234',
    nickname: 'Walker',
    accessibility: ACCESSIBILITY_CONFIG.DEFAULT_SETTINGS,
    sessionTrials: 5,
    baselineLambda: null,
  });

  // Session State
  const [screen, setScreen] = useState<ScreenState>('welcome');
  const [sessionId, setSessionId] = useState<string>('');
  const [delta, setDelta] = useState<number>(DIFFICULTY_CONFIG.INITIAL_DELTA);
  const [prevSmoothedCT, setPrevSmoothedCT] = useState<number | null>(null);

  // Calibration Baseline
  const [calibrationData, setCalibrationData] = useState<CalibrationData>({
    samples: [600, 650, 700],
    lambda_ref: 650,
    sigma_ref: 150,
  });

  // Trials Loop State
  const [currentTrialIdx, setCurrentTrialIdx] = useState<number>(0);
  const [trialScores, setTrialScores] = useState<TrialScoreResult[]>([]);
  const [supportRulesFiredCount, setSupportRulesFiredCount] = useState<number>(0);

  // Current Generated Trial Data
  const [currentGraph, setCurrentGraph] = useState<TownGraph | null>(null);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [currentShortcut, setCurrentShortcut] = useState<ShortcutProblem | null>(null);
  const [currentTaskType, setCurrentTaskType] = useState<TaskType>('retrace');

  // Caregiver Modals
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isPortalOpen, setIsPortalOpen] = useState<boolean>(false);

  // Live Announcer Text
  const [announcement, setAnnouncement] = useState<string>('');
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Load Initial Settings & Difficulty from IndexedDB
  useEffect(() => {
    const initialize = async () => {
      const storedSettings = await storageService.getSettings();
      setSettings(storedSettings);
      speechService.setEnabled(storedSettings.accessibility.speechEnabled);

      const latestSession = await storageService.getLatestSession();
      if (latestSession) {
        setDelta(latestSession.delta_next);
        setPrevSmoothedCT(latestSession.smoothed_CT_k);
      }
    };
    initialize();
  }, []);

  // Update speech synthesis state when setting changes
  useEffect(() => {
    speechService.setEnabled(settings.accessibility.speechEnabled);
  }, [settings.accessibility.speechEnabled]);

  // Start a new session
  const handleStartSession = () => {
    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);
    setTrialScores([]);
    setSupportRulesFiredCount(0);
    setCurrentTrialIdx(0);
    sessionStartTimeRef.current = Date.now();

    // If we don't have a calibration baseline yet, run calibration
    if (!settings.baselineLambda) {
      setScreen('calibration');
    } else {
      setCalibrationData({
        samples: [settings.baselineLambda],
        lambda_ref: settings.baselineLambda,
        sigma_ref: Math.round(settings.baselineLambda * 0.35),
      });
      prepareAndStartTrial(0, delta, newSessionId);
    }
  };

  const handleCalibrationComplete = (data: CalibrationData) => {
    setCalibrationData(data);
    const updatedSettings = { ...settings, baselineLambda: data.lambda_ref };
    setSettings(updatedSettings);
    storageService.saveSettings(updatedSettings);

    prepareAndStartTrial(0, delta, sessionId);
  };

  /**
   * Generates town graph, route, and task for trial index i
   */
  const prepareAndStartTrial = (trialIndex: number, currentDelta: number, activeSessionId: string) => {
    const totalSessionTrials = settings.sessionTrials || 5;
    const isFinalTrial = trialIndex === totalSessionTrials - 1;

    // The final trial is always guaranteed to be an easy, successful trial
    const effectiveDelta = isFinalTrial ? 0.15 : currentDelta;

    const seed = Math.abs(
      (activeSessionId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) * 10007 + trialIndex * 7919) %
        2147483647
    );
    const rng = createPRNG(seed);

    const dim = DIFFICULTY_CONFIG.getGridDimension(effectiveDelta);
    const townGraph = generateTownGraph(dim, seed);

    const decisionPointsL = DIFFICULTY_CONFIG.getDecisionPoints(effectiveDelta);

    // Determine task type (delta >= 0.5 allows shortcut trials, ~40% probability; final trial is always retrace)
    const isShortcutTrial =
      !isFinalTrial &&
      effectiveDelta >= 0.50 &&
      rng() < DIFFICULTY_CONFIG.getShortcutProbability(effectiveDelta);

    if (isShortcutTrial) {
      const { route, shortcut } = generateRouteWithGuaranteedShortcut(townGraph, decisionPointsL, rng);
      setCurrentGraph(townGraph);
      setCurrentRoute(route);
      setCurrentShortcut(shortcut);
      setCurrentTaskType('shortcut');
    } else {
      const route = generateLearnedRoute(townGraph, decisionPointsL, rng);
      setCurrentGraph(townGraph);
      setCurrentRoute(route);
      setCurrentShortcut(null);
      setCurrentTaskType('retrace');
    }

    setCurrentTrialIdx(trialIndex);
    setAnnouncement(`Starting Walk ${trialIndex + 1} of ${totalSessionTrials}`);
    setScreen('trial');
  };

  const handleTrialComplete = (scoreResult: TrialScoreResult, emotion: EmotionMetrics) => {
    const updatedScores = [...trialScores, scoreResult];
    setTrialScores(updatedScores);

    if (scoreResult.max_hint_level > 0 || emotion.state === 'anxious' || emotion.state === 'frustrated') {
      setSupportRulesFiredCount((prev) => prev + 1);
    }

    const totalSessionTrials = settings.sessionTrials || 5;
    const nextTrialIndex = currentTrialIdx + 1;

    if (nextTrialIndex < totalSessionTrials) {
      prepareAndStartTrial(nextTrialIndex, delta, sessionId);
    } else {
      // Completed full session! Compute CT_k and update difficulty
      finishSession(updatedScores);
    }
  };

  const finishSession = async (allTrialScores: TrialScoreResult[]) => {
    const numericScores = allTrialScores.map((s) => s.score_s_i);
    const CT_k = calculateSessionCT(numericScores);
    const smoothed_CT_k = calculateSmoothedCT(CT_k, prevSmoothedCT);

    const diffResult = updateDifficultyBetweenSessions({
      delta_k: delta,
      smoothed_CT_k,
      supportRuleFiredTrialCount: supportRulesFiredCount,
      totalTrials: allTrialScores.length,
    });

    const summary: SessionSummary = {
      session_id: sessionId,
      timestamp: Date.now(),
      CT_k,
      smoothed_CT_k,
      delta_k: delta,
      delta_next: diffResult.delta_next,
      distress_k: diffResult.distress_k,
      trial_count: allTrialScores.length,
      completed: true,
    };

    await storageService.saveSessionSummary(summary);
    setDelta(diffResult.delta_next);
    setPrevSmoothedCT(smoothed_CT_k);
    setScreen('wrapup');
  };

  const handleSpeechToggle = () => {
    const updated = {
      ...settings,
      accessibility: {
        ...settings.accessibility,
        speechEnabled: !settings.accessibility.speechEnabled,
      },
    };
    setSettings(updated);
    storageService.saveSettings(updated);
  };

  // Determine container classes based on accessibility configuration
  const themeClass = `theme-${settings.accessibility.contrastTheme}`;
  const fontClass = `font-scale-${settings.accessibility.fontSize}`;

  return (
    <div className={`min-h-screen flex flex-col justify-between ${themeClass} ${fontClass} transition-colors duration-300`}>
      {/* Top Application Header */}
      <header
        className="w-full bg-white dark:bg-stone-900 border-b-2 border-stone-200 dark:border-stone-800 px-4 py-3 select-none"
        role="banner"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GuideCharacterSvg size={44} expression="happy" />
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-amber-900 dark:text-amber-300">
                Neighbourhood Walk
              </span>
              {screen === 'trial' && (
                <span className="ml-3 text-sm sm:text-base font-bold px-3 py-1 rounded-full bg-amber-100 dark:bg-stone-800 text-amber-800 dark:text-amber-300">
                  Walk {currentTrialIdx + 1} of {settings.sessionTrials || 5}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio narration quick toggle */}
            <button
              onClick={handleSpeechToggle}
              className="p-2.5 rounded-xl border-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors focus:ring-4 focus:ring-amber-400"
              aria-label={settings.accessibility.speechEnabled ? 'Mute spoken voice' : 'Enable spoken voice'}
            >
              {settings.accessibility.speechEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>

            {screen !== 'welcome' && (
              <button
                onClick={() => setScreen('welcome')}
                className="p-2.5 rounded-xl border-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors focus:ring-4 focus:ring-amber-400"
                aria-label="Return to Welcome Screen"
              >
                <Home size={24} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Dynamic Stage */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col justify-center" role="main">
        <LiveAnnouncer announcement={announcement} />

        {screen === 'welcome' && (
          <WelcomeScreen
            settings={settings.accessibility}
            onUpdateSettings={(newPartial) => {
              const updated = {
                ...settings,
                accessibility: { ...settings.accessibility, ...newPartial },
              };
              setSettings(updated);
              storageService.saveSettings(updated);
            }}
            onStartSession={handleStartSession}
          />
        )}

        {screen === 'calibration' && (
          <CalibrationBlock onComplete={handleCalibrationComplete} />
        )}

        {screen === 'trial' && currentGraph && currentRoute && (
          <TrialContainer
            sessionId={sessionId}
            trialId={currentTrialIdx + 1}
            taskType={currentTaskType}
            delta={delta}
            graph={currentGraph}
            route={currentRoute}
            shortcutProblem={currentShortcut}
            lambdaRef={calibrationData.lambda_ref}
            sigmaRef={calibrationData.sigma_ref}
            encodingView={settings.accessibility.encodingView}
            speechEnabled={settings.accessibility.speechEnabled}
            sessionElapsedSeconds={Math.round((Date.now() - sessionStartTimeRef.current) / 1000)}
            onTrialComplete={handleTrialComplete}
          />
        )}

        {screen === 'wrapup' && (
          <SessionWrapUp
            totalTrials={settings.sessionTrials || 5}
            speechEnabled={settings.accessibility.speechEnabled}
            onRestart={() => setScreen('welcome')}
          />
        )}
      </main>

      {/* Mandatory Persistent Footer */}
      <PersistentFooter onOpenCaregiver={() => setIsPinModalOpen(true)} />

      {/* PIN Lock Authentication Dialog */}
      <CaregiverPINModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        correctPin={settings.pin}
        onAuthenticated={() => setIsPortalOpen(true)}
      />

      {/* Caregiver Portal (Analytics, Settings, Exports) */}
      <CaregiverPortal
        isOpen={isPortalOpen}
        onClose={() => setIsPortalOpen(false)}
        settings={settings}
        onSaveSettings={(updated) => setSettings(updated)}
      />
    </div>
  );
};

export default App;
