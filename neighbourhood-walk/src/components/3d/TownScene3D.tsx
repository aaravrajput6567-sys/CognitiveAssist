/**
 * TownScene3D
 *
 * Full 3D interactive viewport rendered with Three.js:
 * - 3rd-person perspective tracking Arthur walking through the neighbourhood streets.
 * - Procedural landmarks with prominent front storefront signs and overhead badges.
 * - Prominent 3D glowing GREEN GUIDE ARROW pointing in the exact target direction.
 * - Keyboard controls mapped to ARROW KEYS (Up = Forward, Down = Backward, Left = Left, Right = Right) + WASD.
 * - On-screen tactile D-Pad controller with active key states.
 * - Raycasting for clicking road arrows + full resource disposal on unmount.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { TownGraph, RelativeDirection, CardinalDirection } from '../../types/graph';
import {
  buildTownWorld,
  getJunction3DPosition,
  getDirectionVector3D,
  updateTurnArrowsIn3D,
  updateGreenGuideArrow,
  type TownWorldObjects,
} from './world3D';
import { createArthurCharacter, updateArthurAnimation, type CharacterRig } from './character3D';
import { CARDINAL_ANGLES, getTurnLabel, getTurnHeading } from '../../engine/navigationLogic';
import { Eye, MapPin, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Navigation } from 'lucide-react';

interface TownScene3DProps {
  graph: TownGraph;
  currentJunctionId: string;
  targetJunctionId?: string | null;
  currentHeading: CardinalDirection;
  availableTurns?: RelativeDirection[];
  highlightedTurn?: RelativeDirection | null;
  isMoving?: boolean;
  isRewinding?: boolean;
  movingDirection?: RelativeDirection | null;
  onSelectTurn?: (turn: RelativeDirection) => void;
  onWalkStepComplete?: () => void;
  className?: string;
  showCameraToggle?: boolean;
}

export const TownScene3D: React.FC<TownScene3DProps> = ({
  graph,
  currentJunctionId,
  targetJunctionId = null,
  currentHeading,
  availableTurns = ['left', 'straight', 'right'],
  highlightedTurn = null,
  isMoving = false,
  isRewinding = false,
  movingDirection = null,
  onSelectTurn,
  onWalkStepComplete,
  className = '',
  showCameraToggle = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraMode, setCameraMode] = useState<'thirdPerson' | 'birdsEye'>('thirdPerson');
  const [hoveredTurn, setHoveredTurn] = useState<RelativeDirection | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Keep latest props in ref so animation loop always has fresh state
  const propsRef = useRef({
    isMoving,
    targetJunctionId,
    currentJunctionId,
    currentHeading,
    isRewinding,
    movingDirection,
    availableTurns,
    highlightedTurn,
    onWalkStepComplete,
    onSelectTurn,
  });

  propsRef.current = {
    isMoving,
    targetJunctionId,
    currentJunctionId,
    currentHeading,
    isRewinding,
    movingDirection,
    availableTurns,
    highlightedTurn,
    onWalkStepComplete,
    onSelectTurn,
  };

  // References for Three.js state across renders
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer | null;
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    world: TownWorldObjects | null;
    arthur: CharacterRig | null;
    animationFrameId: number;
    clock: THREE.Clock;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    walkProgress: number; // 0 to 1
    startWorldPos: { x: number; z: number };
    targetWorldPos: { x: number; z: number };
    currentWorldPos: { x: number; z: number };
    headingAngle: number;
    targetHeadingAngle: number;
  }>({
    renderer: null,
    scene: null,
    camera: null,
    world: null,
    arthur: null,
    animationFrameId: 0,
    clock: new THREE.Clock(),
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    walkProgress: 0,
    startWorldPos: { x: 0, z: 0 },
    targetWorldPos: { x: 0, z: 0 },
    currentWorldPos: { x: 0, z: 0 },
    headingAngle: 0,
    targetHeadingAngle: 0,
  });

  // Convert junction ID to world pos
  const getPosForJunction = useCallback(
    (jId: string) => {
      const j = graph.junctions[jId];
      if (!j) return { x: 0, z: 0 };
      return getJunction3DPosition(j.x, j.y, graph.dimension);
    },
    [graph]
  );

  // Unified direction action trigger
  const handleAction = useCallback((turn: RelativeDirection) => {
    const {
      isMoving: busyMoving,
      isRewinding: busyRewinding,
      onSelectTurn: cb,
      currentHeading,
    } = propsRef.current;

    if (busyMoving || busyRewinding) return;

    setActiveKey(turn);
    setTimeout(() => setActiveKey(null), 250);

    // Calculate heading angle in Three.js space for the chosen relative turn
    const baseAngleDeg = CARDINAL_ANGLES[currentHeading] || 0;
    let turnOffset = 0;
    if (turn === 'left') turnOffset = -90;
    if (turn === 'right') turnOffset = 90;
    if (turn === 'straight') turnOffset = 0;
    if (turn === 'u-turn') turnOffset = 180;

    const targetDeg = (baseAngleDeg + turnOffset + 360) % 360;
    // In Three.js: angle = - (deg * Math.PI) / 180
    const targetRad = - (targetDeg * Math.PI) / 180;
    stateRef.current.targetHeadingAngle = targetRad;

    // Immediately trigger callback with the user's chosen turn direction
    if (cb) {
      cb(turn);
    }
  }, []);

  // Global Keyboard listener for Arrow keys & WASD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not capture if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleAction('straight');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleAction('u-turn');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleAction('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleAction('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction]);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 520;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 300);

    // Build World
    const world = buildTownWorld(graph);
    const scene = world.scene;

    // Build Arthur Character
    const arthur = createArthurCharacter();
    scene.add(arthur.root);

    // Initial position
    const initPos = getPosForJunction(currentJunctionId);
    arthur.root.position.set(initPos.x, 0, initPos.z);

    const baseDeg = CARDINAL_ANGLES[currentHeading] || 0;
    const initialHeadingRad = - (baseDeg * Math.PI) / 180;
    arthur.root.rotation.y = initialHeadingRad;

    stateRef.current.renderer = renderer;
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    stateRef.current.world = world;
    stateRef.current.arthur = arthur;
    stateRef.current.currentWorldPos = { ...initPos };
    stateRef.current.startWorldPos = { ...initPos };
    stateRef.current.targetWorldPos = { ...initPos };
    stateRef.current.headingAngle = initialHeadingRad;
    stateRef.current.targetHeadingAngle = initialHeadingRad;
    stateRef.current.clock.start();

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && stateRef.current.camera && stateRef.current.renderer) {
          stateRef.current.camera.aspect = newW / newH;
          stateRef.current.camera.updateProjectionMatrix();
          stateRef.current.renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // Animation Loop
    const animate = () => {
      stateRef.current.animationFrameId = requestAnimationFrame(animate);

      const deltaSec = Math.min(stateRef.current.clock.getDelta(), 0.1);
      const elapsedTime = stateRef.current.clock.getElapsedTime();
      const state = stateRef.current;
      if (!state.renderer || !state.scene || !state.camera || !state.arthur || !state.world) return;

      // Drift clouds slowly
      state.world.cloudsGroup.children.forEach((cloud, idx) => {
        cloud.position.x += deltaSec * (0.8 + (idx % 3) * 0.4);
        if (cloud.position.x > 100) cloud.position.x = -100;
      });

      // Animate Green Guide Arrow bobbing
      if (state.world.greenArrowGroup.visible) {
        state.world.greenArrowGroup.position.y = 1.8 + Math.sin(elapsedTime * 4.0) * 0.18;
      }

      // Character Movement logic
      const {
        isMoving: activeMoving,
        targetJunctionId: activeTargetId,
        isRewinding: activeRewinding,
        movingDirection: activeMovingDirection,
        currentHeading: activeHeading,
        onWalkStepComplete: activeOnComplete,
      } = propsRef.current;

      if (activeMoving && activeTargetId) {
        // Fast, responsive walk speed (~0.9s per street segment)
        state.walkProgress += deltaSec * 1.25;

        if (state.walkProgress >= 1.0) {
          state.walkProgress = 1.0;
          state.currentWorldPos = { ...state.targetWorldPos };
          state.arthur.root.position.set(state.targetWorldPos.x, 0, state.targetWorldPos.z);
          updateArthurAnimation(state.arthur, deltaSec, false, 5.0, false);

          if (activeOnComplete) {
            activeOnComplete();
          }
        } else {
          // Lerp position along road from start to target
          const t = state.walkProgress;
          const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

          const cx = THREE.MathUtils.lerp(state.startWorldPos.x, state.targetWorldPos.x, easeT);
          const cz = THREE.MathUtils.lerp(state.startWorldPos.z, state.targetWorldPos.z, easeT);

          state.currentWorldPos = { x: cx, z: cz };
          state.arthur.root.position.set(cx, 0, cz);

          // Rotate character smoothly to face walking direction
          state.arthur.root.rotation.y = THREE.MathUtils.lerp(
            state.arthur.root.rotation.y,
            state.targetHeadingAngle,
            0.2
          );

          // Animate walking limbs
          updateArthurAnimation(state.arthur, deltaSec, true, 6.5, false);
        }
      } else if (activeRewinding) {
        // Auto-rewind animation: Arthur pauses, looks around, and walks back
        updateArthurAnimation(state.arthur, deltaSec, true, 4.0, true);
        const rewindProgress = (Math.sin(elapsedTime * 2) + 1) / 2;
        const rewindCardinal = activeMovingDirection ? getTurnHeading(activeHeading, activeMovingDirection) : activeHeading;
        const dirVec = getDirectionVector3D(rewindCardinal);
        const bx = state.startWorldPos.x + dirVec.dx * 1.5 * (1 - rewindProgress);
        const bz = state.startWorldPos.z + dirVec.dz * 1.5 * (1 - rewindProgress);
        state.arthur.root.position.set(bx, 0, bz);
      } else {
        // Idle at crossroads
        state.arthur.root.rotation.y = THREE.MathUtils.lerp(
          state.arthur.root.rotation.y,
          state.targetHeadingAngle,
          0.12
        );
        updateArthurAnimation(state.arthur, deltaSec, false, 5.0, false);
      }

      // Camera Positioning
      const arthurPos = state.arthur.root.position;

      if (cameraMode === 'thirdPerson') {
        const headingRad = state.arthur.root.rotation.y;
        const camDistance = 8.5;
        const camHeight = 5.0;

        const targetCamX = arthurPos.x + Math.sin(headingRad) * camDistance;
        const targetCamZ = arthurPos.z + Math.cos(headingRad) * camDistance;
        const targetCamY = camHeight;

        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetCamX, 0.08);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetCamY, 0.08);
        state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetCamZ, 0.08);

        const lookX = arthurPos.x - Math.sin(headingRad) * 2.5;
        const lookZ = arthurPos.z - Math.cos(headingRad) * 2.5;
        state.camera.lookAt(lookX, 1.8, lookZ);
      } else {
        // Bird's-Eye Town Overview
        const targetCamX = arthurPos.x;
        const targetCamY = 46.0;
        const targetCamZ = arthurPos.z + 32.0;

        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetCamX, 0.08);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetCamY, 0.08);
        state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetCamZ, 0.08);
        state.camera.lookAt(arthurPos.x, 0, arthurPos.z);
      }

      // Render
      state.renderer.render(state.scene, state.camera);
    };

    stateRef.current.animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(stateRef.current.animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, [graph, getPosForJunction]);

  // Update target coordinates and heading angles when current/target junction changes
  useEffect(() => {
    const startPos = getPosForJunction(currentJunctionId);
    stateRef.current.startWorldPos = { ...startPos };

    if (isMoving && targetJunctionId) {
      const targetPos = getPosForJunction(targetJunctionId);
      stateRef.current.targetWorldPos = { ...targetPos };
      stateRef.current.walkProgress = 0;

      // Compute exact heading angle towards targetPos in 3D
      const dx = targetPos.x - startPos.x;
      const dz = targetPos.z - startPos.z;
      const angle = Math.atan2(-dx, -dz);
      stateRef.current.targetHeadingAngle = angle;
    } else {
      stateRef.current.targetWorldPos = { ...startPos };
      stateRef.current.currentWorldPos = { ...startPos };
      const baseDeg = CARDINAL_ANGLES[currentHeading] || 0;
      stateRef.current.targetHeadingAngle = - (baseDeg * Math.PI) / 180;
    }
  }, [isMoving, currentJunctionId, targetJunctionId, currentHeading, getPosForJunction]);

  // Update 3D road arrows & Glowing Green Guide Arrow
  useEffect(() => {
    if (!stateRef.current.world) return;

    const jPos = getPosForJunction(currentJunctionId);

    if (isMoving || isRewinding) {
      // Hide arrows while walking down the street
      while (stateRef.current.world.turnArrowsGroup.children.length > 0) {
        stateRef.current.world.turnArrowsGroup.remove(stateRef.current.world.turnArrowsGroup.children[0]!);
      }
      stateRef.current.world.greenArrowGroup.visible = false;
    } else {
      // Display arrows on crossroads
      updateTurnArrowsIn3D(
        stateRef.current.world.turnArrowsGroup,
        jPos,
        currentHeading,
        availableTurns,
        highlightedTurn
      );

      // Display floating glowing 3D Green Guide Arrow
      updateGreenGuideArrow(
        stateRef.current.world.greenArrowGroup,
        jPos,
        currentHeading,
        highlightedTurn,
        highlightedTurn !== null
      );
    }
  }, [currentJunctionId, currentHeading, availableTurns, highlightedTurn, isMoving, isRewinding, getPosForJunction]);

  // Handle Raycasting Pointer Click on 3D road arrows
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !stateRef.current.camera || !stateRef.current.world || isMoving || isRewinding) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    stateRef.current.mouse.set(x, y);
    stateRef.current.raycaster.setFromCamera(stateRef.current.mouse, stateRef.current.camera);

    const intersects = stateRef.current.raycaster.intersectObjects(
      stateRef.current.world.turnArrowsGroup.children,
      true
    );

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0]!.object;
      while (obj && !obj.userData?.turn) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.turn) {
        handleAction(obj.userData.turn as RelativeDirection);
      }
    }
  };

  // Handle pointer move for hover effect on 3D arrows
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !stateRef.current.camera || !stateRef.current.world || isMoving || isRewinding) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    stateRef.current.mouse.set(x, y);
    stateRef.current.raycaster.setFromCamera(stateRef.current.mouse, stateRef.current.camera);

    const intersects = stateRef.current.raycaster.intersectObjects(
      stateRef.current.world.turnArrowsGroup.children,
      true
    );

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0]!.object;
      while (obj && !obj.userData?.turn) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.turn) {
        setHoveredTurn(obj.userData.turn as RelativeDirection);
        return;
      }
    }
    setHoveredTurn(null);
  };

  const currentLandmark = graph.junctions[currentJunctionId]?.landmark;

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-900/10 dark:border-stone-700 bg-sky-200 select-none ${className}`}
      style={{ height: '540px', minHeight: '460px' }}
    >
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className={`w-full h-full block ${hoveredTurn ? 'cursor-pointer' : 'cursor-grab'}`}
        aria-label="3D Interactive town navigation view"
      />

      {/* Top Overlay: Landmark Banner & View Toggle */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-lg border-2 border-amber-200 dark:border-stone-700 pointer-events-auto">
          <div
            className="w-4 h-4 rounded-full ring-2 ring-white shadow-sm"
            style={{ backgroundColor: currentLandmark?.color || '#e06d53' }}
          />
          <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <MapPin size={22} className="text-amber-600 dark:text-amber-400" />
            {currentLandmark?.name ?? 'Town Street'}
          </span>
        </div>

        {/* Camera Toggle Button */}
        {showCameraToggle && (
          <button
            type="button"
            onClick={() => setCameraMode((prev) => (prev === 'thirdPerson' ? 'birdsEye' : 'thirdPerson'))}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-lg border-2 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-base hover:bg-amber-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Toggle camera view"
          >
            <Eye size={20} className="text-amber-600" />
            <span>{cameraMode === 'thirdPerson' ? "Bird's-Eye View" : '3rd-Person View'}</span>
          </button>
        )}
      </div>

      {/* Prominent Floating Green Direction Waypoint Badge */}
      {highlightedTurn && !isMoving && !isRewinding && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 text-white font-extrabold text-xl shadow-2xl border-2 border-emerald-300 pointer-events-none animate-pulse">
          <Navigation size={24} className="text-white" />
          <span>Follow Green Arrow: {getTurnLabel(highlightedTurn)}</span>
        </div>
      )}

      {/* Walking Status Badge */}
      {isMoving && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-amber-500 text-stone-950 font-extrabold text-xl shadow-xl flex items-center gap-2 animate-pulse pointer-events-none">
          <span>🚶 Arthur is walking down the street...</span>
        </div>
      )}

      {/* Rewinding Status Badge */}
      {isRewinding && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-amber-200 text-amber-950 font-extrabold text-xl shadow-xl flex items-center gap-2 animate-bounce pointer-events-none">
          <span>🔄 Let's stroll back to the landmark...</span>
        </div>
      )}

      {/* Tactile On-Screen D-PAD Arrow Controller mapped to Arrow Keys / WASD */}
      <div className="absolute bottom-4 right-4 flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-stone-900/90 backdrop-blur-md shadow-2xl border-2 border-stone-600 pointer-events-auto">
        <div className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">
          Keyboard / Touch
        </div>

        {/* Up / Forward Button */}
        <button
          type="button"
          onClick={() => handleAction('straight')}
          disabled={isMoving || isRewinding}
          className={`w-14 h-11 flex flex-col items-center justify-center rounded-xl font-bold transition-all cursor-pointer ${
            activeKey === 'straight'
              ? 'bg-emerald-500 text-stone-950 scale-95 shadow-lg'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-600'
          }`}
          aria-label="Move Forward (Arrow Up or W)"
          title="Arrow Up / W: Move Forward"
        >
          <ArrowUp size={20} className={activeKey === 'straight' ? 'text-stone-950' : 'text-emerald-400'} />
          <span className="text-[9px] font-mono leading-none">UP / W</span>
        </button>

        {/* Left, Down, Right Row */}
        <div className="flex gap-1.5">
          {/* Left Button */}
          <button
            type="button"
            onClick={() => handleAction('left')}
            disabled={isMoving || isRewinding}
            className={`w-14 h-11 flex flex-col items-center justify-center rounded-xl font-bold transition-all cursor-pointer ${
              activeKey === 'left'
                ? 'bg-emerald-500 text-stone-950 scale-95 shadow-lg'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-600'
            }`}
            aria-label="Turn Left (Arrow Left or A)"
            title="Arrow Left / A: Turn Left"
          >
            <ArrowLeft size={20} className={activeKey === 'left' ? 'text-stone-950' : 'text-emerald-400'} />
            <span className="text-[9px] font-mono leading-none">LEFT / A</span>
          </button>

          {/* Down / Backward Button */}
          <button
            type="button"
            onClick={() => handleAction('u-turn')}
            disabled={isMoving || isRewinding}
            className={`w-14 h-11 flex flex-col items-center justify-center rounded-xl font-bold transition-all cursor-pointer ${
              activeKey === 'u-turn'
                ? 'bg-emerald-500 text-stone-950 scale-95 shadow-lg'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-600'
            }`}
            aria-label="Move Backward (Arrow Down or S)"
            title="Arrow Down / S: Move Backward"
          >
            <ArrowDown size={20} className={activeKey === 'u-turn' ? 'text-stone-950' : 'text-amber-400'} />
            <span className="text-[9px] font-mono leading-none">BACK / S</span>
          </button>

          {/* Right Button */}
          <button
            type="button"
            onClick={() => handleAction('right')}
            disabled={isMoving || isRewinding}
            className={`w-14 h-11 flex flex-col items-center justify-center rounded-xl font-bold transition-all cursor-pointer ${
              activeKey === 'right'
                ? 'bg-emerald-500 text-stone-950 scale-95 shadow-lg'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-600'
            }`}
            aria-label="Turn Right (Arrow Right or D)"
            title="Arrow Right / D: Turn Right"
          >
            <ArrowRight size={20} className={activeKey === 'right' ? 'text-stone-950' : 'text-emerald-400'} />
            <span className="text-[9px] font-mono leading-none">RIGHT / D</span>
          </button>
        </div>
      </div>

      {/* Keyboard Hint Overlay */}
      {!isMoving && !isRewinding && (
        <div className="absolute bottom-4 left-4 px-4 py-2.5 rounded-xl bg-stone-900/85 backdrop-blur-sm text-stone-100 text-sm sm:text-base font-semibold pointer-events-none border border-stone-700">
          ⌨️ Use <kbd className="px-1.5 py-0.5 rounded bg-stone-700 text-amber-300 font-mono text-xs">↑ ↓ ← →</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-stone-700 text-amber-300 font-mono text-xs">WASD</kbd> to move
        </div>
      )}
    </div>
  );
};
