/**
 * 3D Town World Generator
 *
 * Constructs the procedural town environment:
 * - Cobblestone road network connecting grid junctions
 * - Sidewalk curbs, streetlamps, stylized leafy trees
 * - Sky, drifting clouds, and grass ground plane
 * - Interactive 3D road arrows for crossroads turn selection
 */

import * as THREE from 'three';
import type { TownGraph, RelativeDirection, CardinalDirection } from '../../types/graph';
import { createCobblestoneTexture, createSidewalkTexture } from './proceduralTextures';
import { createLandmark3D } from './landmark3D';
import { CARDINAL_ANGLES, DIRECTION_VECTORS } from '../../engine/navigationLogic';

export const GRID_SPACING = 24; // Distance between junctions in 3D units
export const ROAD_WIDTH = 5.2;

export interface TownWorldObjects {
  scene: THREE.Scene;
  landmarkGroups: Map<string, THREE.Group>;
  turnArrowsGroup: THREE.Group;
  greenArrowGroup: THREE.Group;
  cloudsGroup: THREE.Group;
  treesGroup: THREE.Group;
}

export function buildTownWorld(graph: TownGraph): TownWorldObjects {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbbe1fa); // Crisp sunny sky blue
  scene.fog = new THREE.FogExp2(0xbbe1fa, 0.007);

  // Lighting
  const hemiLight = new THREE.HemisphereLight(0xfffaed, 0x475569, 0.85);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfffae8, 1.1);
  dirLight.position.set(40, 80, 50);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 200;
  const d = 80;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // Ambient gentle fill light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  // Center coordinate offset so (0,0) in 3D is near the center of the town
  const halfDim = (graph.dimension - 1) / 2;

  // Ground plane (Grass meadow)
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x6ca352 });
  const groundGeo = new THREE.PlaneGeometry(300, 300);
  const ground = new THREE.Mesh(groundGeo, grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // Materials for roads
  const cobblestoneTexture = createCobblestoneTexture();
  const roadMat = new THREE.MeshLambertMaterial({
    map: cobblestoneTexture,
  });

  const sidewalkTexture = createSidewalkTexture();
  const sidewalkMat = new THREE.MeshLambertMaterial({
    map: sidewalkTexture,
  });

  const curbMat = new THREE.MeshLambertMaterial({ color: 0x8a8277 });

  // Store landmark 3D groups for quick lookup
  const landmarkGroups = new Map<string, THREE.Group>();
  const treesGroup = new THREE.Group();
  scene.add(treesGroup);

  // Helper to convert grid (x, y) to 3D world (wx, wz)
  // North is +y, so in 3D: wx = (x - halfDim) * GRID_SPACING, wz = -(y - halfDim) * GRID_SPACING
  const getJunctionWorldPos = (jx: number, jy: number) => ({
    x: (jx - halfDim) * GRID_SPACING,
    z: -(jy - halfDim) * GRID_SPACING,
  });

  // 1. Build Crossroads and Landmarks at each junction
  Object.values(graph.junctions).forEach((junction) => {
    const pos = getJunctionWorldPos(junction.x, junction.y);

    // Crossroad intersection square
    const crossroadGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 2, ROAD_WIDTH + 2);
    const crossroad = new THREE.Mesh(crossroadGeo, roadMat);
    crossroad.rotation.x = -Math.PI / 2;
    crossroad.position.set(pos.x, 0.01, pos.z);
    crossroad.receiveShadow = true;
    scene.add(crossroad);

    // Crossroad sidewalks rim
    const swGeo = new THREE.BoxGeometry(ROAD_WIDTH + 4.8, 0.15, ROAD_WIDTH + 4.8);
    const sw = new THREE.Mesh(swGeo, sidewalkMat);
    sw.position.set(pos.x, 0.05, pos.z);
    sw.receiveShadow = true;
    scene.add(sw);

    // Landmark building: placed charmingly in the corner of the crossroad
    const landmark3D = createLandmark3D(junction.landmark);
    // Position landmark slightly offset (North-East quadrant of crossroads)
    landmark3D.position.set(pos.x + 6.8, 0, pos.z - 6.8);
    landmark3D.rotation.y = -Math.PI / 4; // Angled invitingly towards intersection
    scene.add(landmark3D);
    landmarkGroups.set(junction.id, landmark3D);

    // Streetlamp at crossroad
    const lamp = createStreetLamp();
    lamp.position.set(pos.x - 3.8, 0, pos.z + 3.8);
    scene.add(lamp);

    // Decorative Tree
    const tree = createStylizedTree();
    tree.position.set(pos.x - 7.5, 0, pos.z - 7.5);
    treesGroup.add(tree);
  });

  // 2. Build Road Edges between connected junctions
  const drawnEdges = new Set<string>();

  graph.edges.forEach((edge) => {
    const fromJ = graph.junctions[edge.from];
    const toJ = graph.junctions[edge.to];
    if (!fromJ || !toJ) return;

    // Undirected key to avoid drawing duplicate road segments
    const edgeKey = [edge.from, edge.to].sort().join('--');
    if (drawnEdges.has(edgeKey)) return;
    drawnEdges.add(edgeKey);

    const posA = getJunctionWorldPos(fromJ.x, fromJ.y);
    const posB = getJunctionWorldPos(toJ.x, toJ.y);

    const midX = (posA.x + posB.x) / 2;
    const midZ = (posA.z + posB.z) / 2;
    const length = Math.hypot(posB.x - posA.x, posB.z - posA.z);
    const angle = Math.atan2(posB.x - posA.x, posB.z - posA.z);

    // Main road strip
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, length);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = -angle;
    road.position.set(midX, 0.015, midZ);
    road.receiveShadow = true;
    scene.add(road);

    // Sidewalks on left and right
    const sidewalkWidth = 1.4;
    [-ROAD_WIDTH / 2 - sidewalkWidth / 2, ROAD_WIDTH / 2 + sidewalkWidth / 2].forEach((offsetSide) => {
      const swGeo = new THREE.BoxGeometry(sidewalkWidth, 0.14, length);
      const swMesh = new THREE.Mesh(swGeo, sidewalkMat);
      swMesh.rotation.y = angle;
      const offsetX = Math.cos(angle) * offsetSide;
      const offsetZ = -Math.sin(angle) * offsetSide;
      swMesh.position.set(midX + offsetX, 0.07, midZ + offsetZ);
      swMesh.receiveShadow = true;
      scene.add(swMesh);

      // Curbs
      const curbGeo = new THREE.BoxGeometry(0.18, 0.18, length);
      const curbMesh = new THREE.Mesh(curbGeo, curbMat);
      curbMesh.rotation.y = angle;
      curbMesh.position.set(midX + offsetX * 0.85, 0.09, midZ + offsetZ * 0.85);
      scene.add(curbMesh);
    });

    // Trees and lamps along the street segment
    const streetLamp = createStreetLamp();
    const lampOffsetX = Math.cos(angle) * (ROAD_WIDTH / 2 + 1.2);
    const lampOffsetZ = -Math.sin(angle) * (ROAD_WIDTH / 2 + 1.2);
    streetLamp.position.set(midX + lampOffsetX, 0, midZ + lampOffsetZ);
    scene.add(streetLamp);

    const streetTree = createStylizedTree();
    const treeOffsetX = Math.cos(angle) * (-ROAD_WIDTH / 2 - 2.4);
    const treeOffsetZ = -Math.sin(angle) * (-ROAD_WIDTH / 2 - 2.4);
    streetTree.position.set(midX + treeOffsetX, 0, midZ + treeOffsetZ);
    treesGroup.add(streetTree);
  });

  // 3. Clouds drifting in sky
  const cloudsGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const cloud = createStylizedCloud();
    cloud.position.set(
      (Math.random() - 0.5) * 180,
      35 + Math.random() * 15,
      (Math.random() - 0.5) * 180
    );
    cloudsGroup.add(cloud);
  }
  scene.add(cloudsGroup);

  // 4. Interactive Turn Arrows group
  const turnArrowsGroup = new THREE.Group();
  turnArrowsGroup.name = 'TurnArrowsGroup';
  scene.add(turnArrowsGroup);

  // 5. Floating Glowing Green Guide Arrow group
  const greenArrowGroup = createGreenGuideArrow();
  scene.add(greenArrowGroup);

  return {
    scene,
    landmarkGroups,
    turnArrowsGroup,
    greenArrowGroup,
    cloudsGroup,
    treesGroup,
  };
}

/**
 * Creates a prominent 3D glowing emerald green guide arrow
 */
export function createGreenGuideArrow(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GreenGuideArrowGroup';
  group.visible = false;

  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 1.2,
    roughness: 0.15,
  });

  // Shaft
  const shaftGeo = new THREE.BoxGeometry(0.8, 0.45, 2.4);
  const shaft = new THREE.Mesh(shaftGeo, greenMat);
  shaft.position.z = -0.6;
  shaft.castShadow = true;
  group.add(shaft);

  // Head
  const headGeo = new THREE.ConeGeometry(1.4, 1.8, 4);
  const head = new THREE.Mesh(headGeo, greenMat);
  head.position.z = 1.3;
  head.rotation.x = Math.PI / 2;
  head.castShadow = true;
  group.add(head);

  // Point light for bright green road illumination
  const light = new THREE.PointLight(0x22c55e, 2.2, 10.0);
  light.position.y = 0.5;
  group.add(light);

  // Concentric glowing rings on road surface below arrow
  const ringGeo1 = new THREE.RingGeometry(1.6, 2.0, 32);
  const ringMat1 = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.rotation.x = -Math.PI / 2;
  ring1.position.y = -1.5;
  group.add(ring1);

  const ringGeo2 = new THREE.RingGeometry(2.3, 2.6, 32);
  const ringMat2 = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  });
  const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = -1.5;
  group.add(ring2);

  // Floating text banner above green arrow
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 124, 28);
  ctx.fill();
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.roundRect(14, 14, 484, 112, 24);
  ctx.fill();
  ctx.fillStyle = '#022c22';
  ctx.font = '900 52px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🟢 GO THIS WAY 🟢', 256, 70);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.y = 2.0;
  sprite.scale.set(4.2, 1.15, 1.0);
  sprite.renderOrder = 1000;
  group.add(sprite);

  return group;
}

/**
 * Updates the position and heading of the 3D green guide arrow
 */
export function updateGreenGuideArrow(
  greenArrowGroup: THREE.Group,
  junctionPos: { x: number; z: number },
  currentHeading: CardinalDirection,
  targetTurn: RelativeDirection | null,
  visible: boolean
): void {
  if (!visible || !targetTurn) {
    greenArrowGroup.visible = false;
    return;
  }

  greenArrowGroup.visible = true;
  const baseAngleDeg = CARDINAL_ANGLES[currentHeading];
  let turnOffsetDeg = 0;
  if (targetTurn === 'left') turnOffsetDeg = -90;
  if (targetTurn === 'right') turnOffsetDeg = 90;
  if (targetTurn === 'straight') turnOffsetDeg = 0;
  if (targetTurn === 'u-turn') turnOffsetDeg = 180;

  const targetHeadingDeg = (baseAngleDeg + turnOffsetDeg + 360) % 360;
  const targetRad = (targetHeadingDeg * Math.PI) / 180;

  const arrowDistance = 4.8;
  const ax = junctionPos.x + Math.sin(targetRad) * arrowDistance;
  const az = junctionPos.z - Math.cos(targetRad) * arrowDistance;

  greenArrowGroup.position.set(ax, 1.8, az);
  greenArrowGroup.rotation.y = -targetRad + Math.PI;
}

/**
 * Creates 3D interactive cobblestone arrows on the road surface
 */
export function updateTurnArrowsIn3D(
  turnArrowsGroup: THREE.Group,
  junctionPos: { x: number; z: number },
  currentHeading: CardinalDirection,
  availableTurns: RelativeDirection[],
  highlightedTurn: RelativeDirection | null = null
): void {
  // Clear previous arrows
  while (turnArrowsGroup.children.length > 0) {
    const child = turnArrowsGroup.children[0]!;
    turnArrowsGroup.remove(child);
  }

  const baseAngleDeg = CARDINAL_ANGLES[currentHeading];

  availableTurns.forEach((turn) => {
    let turnOffsetDeg = 0;
    if (turn === 'left') turnOffsetDeg = -90;
    if (turn === 'right') turnOffsetDeg = 90;
    if (turn === 'straight') turnOffsetDeg = 0;

    const targetHeadingDeg = (baseAngleDeg + turnOffsetDeg + 360) % 360;
    const targetRad = (targetHeadingDeg * Math.PI) / 180;

    // Offset arrow along that direction on the road
    const arrowDistance = 4.2;
    // In our coordinate system: 0 deg = North (-Z), 90 deg = East (+X), 180 deg = South (+Z), 270 deg = West (-X)
    const arrowX = junctionPos.x + Math.sin(targetRad) * arrowDistance;
    const arrowZ = junctionPos.z - Math.cos(targetRad) * arrowDistance;

    const isHighlighted = turn === highlightedTurn;

    // Arrow mesh
    const arrowMeshGroup = new THREE.Group();
    arrowMeshGroup.position.set(arrowX, 0.08, arrowZ);
    arrowMeshGroup.rotation.y = -targetRad + Math.PI;
    arrowMeshGroup.userData = { turn, isInteractive: true };

    // Stone base plaque
    const plaqueMat = new THREE.MeshLambertMaterial({
      color: isHighlighted ? 0xfef08a : 0xf8fafc,
    });
    const plaqueGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.12, 16);
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.castShadow = true;
    plaque.receiveShadow = true;
    arrowMeshGroup.add(plaque);

    // Glowing Arrow Symbol (Chevron / Arrowhead)
    const arrowColor = isHighlighted ? 0x16a34a : 0x2563eb;
    const arrowSymbolMat = new THREE.MeshBasicMaterial({ color: arrowColor });

    // Arrow shaft
    const shaftGeo = new THREE.BoxGeometry(0.5, 0.08, 1.2);
    const shaft = new THREE.Mesh(shaftGeo, arrowSymbolMat);
    shaft.position.set(0, 0.1, -0.2);
    arrowMeshGroup.add(shaft);

    // Arrow point head
    const headGeo = new THREE.ConeGeometry(0.7, 0.9, 3);
    const head = new THREE.Mesh(headGeo, arrowSymbolMat);
    head.position.set(0, 0.1, 0.7);
    head.rotation.x = Math.PI / 2;
    arrowMeshGroup.add(head);

    // Subtle pulsing ring if highlighted
    if (isHighlighted) {
      const ringGeo = new THREE.RingGeometry(1.7, 2.0, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      arrowMeshGroup.add(ring);
    }

    turnArrowsGroup.add(arrowMeshGroup);
  });
}

/**
 * Procedural stylized vintage streetlamp with warm yellow glow
 */
function createStreetLamp(): THREE.Group {
  const lamp = new THREE.Group();
  const ironMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  // Post
  const postGeo = new THREE.CylinderGeometry(0.1, 0.14, 3.8, 8);
  const post = new THREE.Mesh(postGeo, ironMat);
  post.position.y = 1.9;
  post.castShadow = true;
  lamp.add(post);

  // Lantern glass
  const glassGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.5, 6);
  const glass = new THREE.Mesh(glassGeo, glowMat);
  glass.position.y = 3.9;
  lamp.add(glass);

  // Lantern cap
  const capGeo = new THREE.ConeGeometry(0.35, 0.25, 6);
  const cap = new THREE.Mesh(capGeo, ironMat);
  cap.position.y = 4.25;
  lamp.add(cap);

  return lamp;
}

/**
 * Procedural stylized leafy tree (low-poly canopy)
 */
function createStylizedTree(): THREE.Group {
  const tree = new THREE.Group();
  const barkMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
  const leafColors = [0x4d7c0f, 0x65a30d, 0x3f6212];
  const leafMat = new THREE.MeshLambertMaterial({
    color: leafColors[Math.floor(Math.random() * leafColors.length)]!,
  });

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.35, 2.2, 8);
  const trunk = new THREE.Mesh(trunkGeo, barkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  tree.add(trunk);

  // Foliage cluster
  const canopy1 = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), leafMat);
  canopy1.position.y = 2.8;
  canopy1.castShadow = true;
  tree.add(canopy1);

  const canopy2 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), leafMat);
  canopy2.position.set(0.6, 3.4, 0.3);
  canopy2.castShadow = true;
  tree.add(canopy2);

  const canopy3 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), leafMat);
  canopy3.position.set(-0.5, 3.5, -0.4);
  canopy3.castShadow = true;
  tree.add(canopy3);

  return tree;
}

/**
 * Fluffy white 3D cloud
 */
function createStylizedCloud(): THREE.Group {
  const cloud = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(2.0 + Math.random() * 1.5, 8, 6), cloudMat);
    puff.position.set(
      (i - 2) * 2.2 + (Math.random() - 0.5),
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 1.2
    );
    cloud.add(puff);
  }
  return cloud;
}

/**
 * Converts graph junction to 3D world coordinates
 */
export function getJunction3DPosition(
  junctionX: number,
  junctionY: number,
  dimension: number
): { x: number; z: number } {
  const halfDim = (dimension - 1) / 2;
  return {
    x: (junctionX - halfDim) * GRID_SPACING,
    z: -(junctionY - halfDim) * GRID_SPACING,
  };
}

/**
 * Computes heading direction vector in 3D world space
 */
export function getDirectionVector3D(cardinal: CardinalDirection): { dx: number; dz: number } {
  const vec = DIRECTION_VECTORS[cardinal];
  // In 3D: North (+y) = -z, East (+x) = +x, South (-y) = +z, West (-x) = -x
  return {
    dx: vec.dx,
    dz: -vec.dy,
  };
}
