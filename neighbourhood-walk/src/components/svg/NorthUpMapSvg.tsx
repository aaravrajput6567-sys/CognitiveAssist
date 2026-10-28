/**
 * NorthUpMapSvg
 *
 * Topological overview map with fixed North-Up compass convention.
 * Scalable SVG rendering for both passive route preview and interactive shortcut navigation.
 */

import React from 'react';
import type { TownGraph } from '../../types/graph';
import { LandmarkIcon } from './LandmarkIcons';

interface NorthUpMapSvgProps {
  graph: TownGraph;
  selectedPath?: string[];
  startJunctionId?: string;
  goalJunctionId?: string;
  availableNextJunctionIds?: string[];
  onJunctionClick?: (junctionId: string) => void;
  hideLabels?: boolean;
  className?: string;
}

export const NorthUpMapSvg: React.FC<NorthUpMapSvgProps> = ({
  graph,
  selectedPath = [],
  startJunctionId,
  goalJunctionId,
  availableNextJunctionIds = [],
  onJunctionClick,
  hideLabels = false,
  className = '',
}) => {
  const dim = graph.dimension;
  const cellSize = 110;
  const padding = 70;
  const svgSize = (dim - 1) * cellSize + padding * 2;

  // Convert (x, y) to SVG screen coordinates where North (+y) is UP
  const toScreenCoord = (x: number, y: number) => {
    const screenX = padding + x * cellSize;
    const screenY = padding + (dim - 1 - y) * cellSize;
    return { screenX, screenY };
  };

  // Build unique road segments to avoid drawing duplicate lines
  const drawnEdges = new Set<string>();
  const roadLines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];

  for (const edge of graph.edges) {
    const edgeKey = [edge.from, edge.to].sort().join('--');
    if (!drawnEdges.has(edgeKey)) {
      drawnEdges.add(edgeKey);
      const u = graph.junctions[edge.from]!;
      const v = graph.junctions[edge.to]!;
      const uCoord = toScreenCoord(u.x, u.y);
      const vCoord = toScreenCoord(v.x, v.y);
      roadLines.push({
        x1: uCoord.screenX,
        y1: uCoord.screenY,
        x2: vCoord.screenX,
        y2: vCoord.screenY,
        key: edgeKey,
      });
    }
  }

  // Build selected path points
  const selectedLinePoints = selectedPath
    .map((jId) => {
      const j = graph.junctions[jId];
      if (!j) return null;
      const c = toScreenCoord(j.x, j.y);
      return `${c.screenX},${c.screenY}`;
    })
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`north-up-map-container ${className}`}>
      <svg
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="w-full h-auto max-w-2xl mx-auto rounded-3xl bg-amber-50 dark:bg-stone-900 border-4 border-stone-300 dark:border-stone-700 shadow-xl select-none"
        role="region"
        aria-label="Town Map with North facing up."
      >
        <defs>
          {/* Active path glow */}
          <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Compass Rose (Fixed North-Up Indicator) */}
        <g transform={`translate(${svgSize - 45}, 45)`}>
          <circle cx="0" cy="0" r="28" fill="#ffffff" stroke="#1c1917" strokeWidth="2.5" />
          <polygon points="0,-24 6,-2 -6,-2" fill="#dc2626" />
          <polygon points="0,24 6,2 -6,2" fill="#78716c" />
          <polygon points="-24,0 -2,-6 -2,6" fill="#78716c" />
          <polygon points="24,0 2,-6 2,6" fill="#78716c" />
          <circle cx="0" cy="0" r="3" fill="#1c1917" />
          <text x="0" y="-12" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ffffff" fontFamily="sans-serif">
            N
          </text>
        </g>

        {/* Cobblestone Street Network */}
        <g>
          {roadLines.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#a8a29e"
              strokeWidth="16"
              strokeLinecap="round"
            />
          ))}
          {/* Inner road line for street texture */}
          {roadLines.map((line) => (
            <line
              key={`inner-${line.key}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#e7e5e4"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="8 8"
            />
          ))}
        </g>

        {/* Selected / Walked Path Highlight */}
        {selectedLinePoints && (
          <polyline
            points={selectedLinePoints}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#pathGlow)"
          />
        )}

        {/* Junction Nodes */}
        {Object.values(graph.junctions).map((junction) => {
          const { screenX, screenY } = toScreenCoord(junction.x, junction.y);
          const isStart = junction.id === startJunctionId;
          const isGoal = junction.id === goalJunctionId;
          const isPathNode = selectedPath.includes(junction.id);
          const isAvailableNext = availableNextJunctionIds.includes(junction.id);
          const isInteractive = Boolean(onJunctionClick);

          // Node styling
          let circleFill = '#ffffff';
          let circleStroke = '#44403c';
          let strokeWidth = 3;

          if (isStart) {
            circleFill = '#fef08a';
            circleStroke = '#b45309';
            strokeWidth = 5;
          } else if (isGoal) {
            circleFill = '#ccfbf1';
            circleStroke = '#0f766e';
            strokeWidth = 5;
          } else if (isPathNode) {
            circleFill = '#fed7aa';
            circleStroke = '#ea580c';
            strokeWidth = 4;
          } else if (isAvailableNext) {
            circleFill = '#fef9c3';
            circleStroke = '#eab308';
            strokeWidth = 4;
          }

          return (
            <g
              key={junction.id}
              transform={`translate(${screenX}, ${screenY})`}
              className={isInteractive ? 'cursor-pointer hover:scale-110 active:scale-95 transition-transform' : ''}
              onClick={() => {
                if (isInteractive && onJunctionClick) {
                  onJunctionClick(junction.id);
                }
              }}
              role={isInteractive ? 'button' : 'group'}
              tabIndex={isInteractive ? 0 : undefined}
              onKeyDown={(e) => {
                if (isInteractive && onJunctionClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onJunctionClick(junction.id);
                }
              }}
              aria-label={`${junction.landmark.name}${isStart ? ' (Start)' : ''}${isGoal ? ' (Goal)' : ''}`}
            >
              {/* Outer tap aura for easy touching */}
              <circle cx="0" cy="0" r="44" fill="transparent" />

              {/* Outer pulsing ring for next available tap choices */}
              {isAvailableNext && (
                <circle cx="0" cy="0" r="38" fill="none" stroke="#eab308" strokeWidth="3" opacity="0.8" className="animate-ping" />
              )}

              {/* Main Junction Circle */}
              <circle
                cx="0"
                cy="0"
                r="30"
                fill={circleFill}
                stroke={circleStroke}
                strokeWidth={strokeWidth}
              />

              {/* Landmark Icon in center */}
              <foreignObject x="-16" y="-16" width="32" height="32" className="pointer-events-none">
                <div className="flex items-center justify-center w-full h-full text-stone-900">
                  <LandmarkIcon id={junction.landmark.id} size={22} color={junction.landmark.color} />
                </div>
              </foreignObject>

              {/* Landmark Text Label (Hidden if delta >= 0.7 during retrieval) */}
              {!hideLabels && (
                <g transform="translate(0, 42)">
                  <rect
                    x="-48"
                    y="-10"
                    width="96"
                    height="20"
                    rx="10"
                    fill="#1c1917"
                    opacity="0.85"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#ffffff"
                    fontFamily="sans-serif"
                    className="pointer-events-none"
                  >
                    {junction.landmark.name}
                  </text>
                </g>
              )}

              {/* Start / Goal Flag Tags */}
              {isStart && (
                <g transform="translate(0, -38)">
                  <rect x="-24" y="-9" width="48" height="18" rx="6" fill="#b45309" />
                  <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff">
                    START
                  </text>
                </g>
              )}
              {isGoal && (
                <g transform="translate(0, -38)">
                  <rect x="-22" y="-9" width="44" height="18" rx="6" fill="#0f766e" />
                  <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff">
                    GOAL
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
