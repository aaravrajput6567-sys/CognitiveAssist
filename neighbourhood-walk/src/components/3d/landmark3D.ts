/**
 * 3D Landmark Builders
 *
 * Procedurally generates 3D buildings and architectural landmarks
 * based on category and name (Bakery, Clock Tower, Library, Fountain, etc.).
 * Includes billboard nameplates and distinctive props.
 */

import * as THREE from 'three';
import type { Landmark } from '../../types/graph';
import {
  createBrickTexture,
  createAwningTexture,
  createClockTexture,
  createLandmarkLabelTexture,
  createFrontFasciaSignTexture,
} from './proceduralTextures';

export function createLandmark3D(landmark: Landmark): THREE.Group {
  const group = new THREE.Group();
  group.name = `Landmark_${landmark.id}`;

  const hexColor = parseInt(landmark.color.replace('#', '0x'), 16) || 0xe06d53;
  const lowerName = landmark.name.toLowerCase();

  if (lowerName.includes('clock') || lowerName.includes('tower') || landmark.category === 'landmark') {
    buildClockTower(group, hexColor);
  } else if (lowerName.includes('fountain') || lowerName.includes('park') || lowerName.includes('garden')) {
    buildParkFountain(group, hexColor);
  } else if (landmark.category === 'civic' || lowerName.includes('library') || lowerName.includes('hall')) {
    buildCivicBuilding(group, hexColor);
  } else if (lowerName.includes('flower') || lowerName.includes('botanic')) {
    buildFlowerShop(group, hexColor);
  } else if (lowerName.includes('post') || landmark.category === 'service') {
    buildPostOffice(group, hexColor);
  } else if (lowerName.includes('cinema') || lowerName.includes('theater')) {
    buildCinema(group, hexColor);
  } else {
    // Default charming shop / bakery / tea house
    buildCozyShop(group, hexColor, landmark.name);
  }

  // 1. Prominent Front Facade Fascia Signboard (mounted right above the front entrance facing the street)
  const fasciaTexture = createFrontFasciaSignTexture(landmark.name, landmark.category, landmark.color);
  const fasciaMat = new THREE.MeshBasicMaterial({ map: fasciaTexture });
  const woodBackMat = new THREE.MeshLambertMaterial({ color: 0x3d2010 });
  const fasciaGeo = new THREE.BoxGeometry(4.2, 1.1, 0.15);
  const fasciaMaterials = [
    woodBackMat,
    woodBackMat,
    woodBackMat,
    woodBackMat,
    fasciaMat, // Front face (+Z)
    woodBackMat,
  ];
  const fasciaSign = new THREE.Mesh(fasciaGeo, fasciaMaterials);
  fasciaSign.position.set(0, 3.2, 2.3);
  fasciaSign.castShadow = true;
  group.add(fasciaSign);

  // 2. Eye-Level Sidewalk Post Sign (standing right at the crossroad corner next to pedestrians)
  const postSignGroup = new THREE.Group();
  postSignGroup.position.set(2.5, 0, 3.4);

  const postPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8);
  const postPole = new THREE.Mesh(postPoleGeo, woodBackMat);
  postPole.position.y = 1.2;
  postPole.castShadow = true;
  postSignGroup.add(postPole);

  const hangingSignGeo = new THREE.BoxGeometry(2.6, 0.8, 0.1);
  const hangingSign = new THREE.Mesh(hangingSignGeo, fasciaMaterials);
  hangingSign.position.set(0, 1.8, 0);
  postSignGroup.add(hangingSign);
  group.add(postSignGroup);

  // 3. Floating Billboard Banner Sprite (lowered & scaled so it's always clearly in frame)
  const labelTexture = createLandmarkLabelTexture(landmark.name, landmark.category, landmark.color);
  const spriteMat = new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    depthTest: false,
  });
  const labelSprite = new THREE.Sprite(spriteMat);
  labelSprite.position.set(0, 5.6, 0);
  labelSprite.scale.set(6.8, 1.9, 1.0);
  labelSprite.renderOrder = 999;
  group.add(labelSprite);

  return group;
}

/**
 * Clock Tower: Tall stone spire with battlements and clock face
 */
function buildClockTower(group: THREE.Group, accentColor: number): void {
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x9c958a });
  const roofMat = new THREE.MeshLambertMaterial({ color: accentColor });
  const clockTexture = createClockTexture();
  const clockMat = new THREE.MeshBasicMaterial({ map: clockTexture });

  // Main tower shaft
  const shaftGeo = new THREE.BoxGeometry(3.6, 7.5, 3.6);
  const shaft = new THREE.Mesh(shaftGeo, stoneMat);
  shaft.position.y = 3.75;
  shaft.castShadow = true;
  group.add(shaft);

  // Balcony rim
  const balconyGeo = new THREE.BoxGeometry(4.2, 0.4, 4.2);
  const balcony = new THREE.Mesh(balconyGeo, stoneMat);
  balcony.position.y = 7.7;
  group.add(balcony);

  // Clock faces on 4 sides
  const clockGeo = new THREE.PlaneGeometry(1.6, 1.6);
  const frontClock = new THREE.Mesh(clockGeo, clockMat);
  frontClock.position.set(0, 6.4, 1.82);
  group.add(frontClock);

  const backClock = new THREE.Mesh(clockGeo, clockMat);
  backClock.position.set(0, 6.4, -1.82);
  backClock.rotation.y = Math.PI;
  group.add(backClock);

  const rightClock = new THREE.Mesh(clockGeo, clockMat);
  rightClock.position.set(1.82, 6.4, 0);
  rightClock.rotation.y = Math.PI / 2;
  group.add(rightClock);

  const leftClock = new THREE.Mesh(clockGeo, clockMat);
  leftClock.position.set(-1.82, 6.4, 0);
  leftClock.rotation.y = -Math.PI / 2;
  group.add(leftClock);

  // Pyramid roof
  const roofGeo = new THREE.ConeGeometry(2.6, 3.2, 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 9.5;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Weather vane spire
  const spireGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2);
  const spireMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.y = 11.4;
  group.add(spire);
}

/**
 * Park with 3-tier tiered marble fountain and flowerbeds
 */
function buildParkFountain(group: THREE.Group, accentColor: number): void {
  const marbleMat = new THREE.MeshLambertMaterial({ color: 0xd6d0c7 });
  const waterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x5b8c46 });
  const flowerMat = new THREE.MeshLambertMaterial({ color: accentColor });

  // Plaza base
  const baseGeo = new THREE.CylinderGeometry(4.5, 4.6, 0.3, 24);
  const base = new THREE.Mesh(baseGeo, grassMat);
  base.position.y = 0.15;
  group.add(base);

  // Fountain lower basin
  const basinGeo = new THREE.CylinderGeometry(2.6, 2.8, 0.7, 16);
  const basin = new THREE.Mesh(basinGeo, marbleMat);
  basin.position.y = 0.65;
  basin.castShadow = true;
  group.add(basin);

  // Lower water
  const waterGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.1, 16);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 1.05;
  group.add(water);

  // Central pillar
  const pillarGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.6, 12);
  const pillar = new THREE.Mesh(pillarGeo, marbleMat);
  pillar.position.y = 1.8;
  group.add(pillar);

  // Upper bowl
  const bowlGeo = new THREE.CylinderGeometry(1.3, 0.7, 0.4, 16);
  const bowl = new THREE.Mesh(bowlGeo, marbleMat);
  bowl.position.y = 2.6;
  group.add(bowl);

  // Fountain top finial
  const finialGeo = new THREE.SphereGeometry(0.3, 12, 12);
  const finial = new THREE.Mesh(finialGeo, marbleMat);
  finial.position.y = 3.0;
  group.add(finial);

  // Flower planter boxes around perimeter
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const fx = Math.cos(angle) * 3.6;
    const fz = Math.sin(angle) * 3.6;

    const planterGeo = new THREE.BoxGeometry(1.2, 0.4, 1.2);
    const planter = new THREE.Mesh(planterGeo, marbleMat);
    planter.position.set(fx, 0.35, fz);
    group.add(planter);

    const bushGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const bush = new THREE.Mesh(bushGeo, flowerMat);
    bush.position.set(fx, 0.75, fz);
    group.add(bush);
  }
}

/**
 * Civic Building / Library: Classical stone pillars and pediment
 */
function buildCivicBuilding(group: THREE.Group, accentColor: number): void {
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0xddd7cc });
  const roofMat = new THREE.MeshLambertMaterial({ color: accentColor });
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });

  // Podium steps
  const stepsGeo = new THREE.BoxGeometry(6.2, 0.5, 5.2);
  const steps = new THREE.Mesh(stepsGeo, stoneMat);
  steps.position.y = 0.25;
  group.add(steps);

  // Main hall body
  const bodyGeo = new THREE.BoxGeometry(5.4, 4.2, 4.4);
  const body = new THREE.Mesh(bodyGeo, stoneMat);
  body.position.y = 2.6;
  body.castShadow = true;
  group.add(body);

  // 4 Neoclassical front columns
  const colGeo = new THREE.CylinderGeometry(0.2, 0.22, 3.8, 12);
  for (let i = 0; i < 4; i++) {
    const col = new THREE.Mesh(colGeo, stoneMat);
    col.position.set(-2.0 + i * 1.33, 2.4, 2.3);
    col.castShadow = true;
    group.add(col);
  }

  // Triangular pediment roof
  const pedimentGeo = new THREE.ConeGeometry(3.6, 1.8, 4);
  const pediment = new THREE.Mesh(pedimentGeo, roofMat);
  pediment.position.set(0, 5.6, 0.2);
  pediment.rotation.y = Math.PI / 4;
  pediment.scale.set(1.2, 1.0, 0.8);
  pediment.castShadow = true;
  group.add(pediment);

  // Entrance door
  const doorGeo = new THREE.BoxGeometry(1.2, 2.2, 0.2);
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 1.6, 2.22);
  group.add(door);
}

/**
 * Flower Shop: Wooden cottage with outdoor flower crates
 */
function buildFlowerShop(group: THREE.Group, accentColor: number): void {
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x9c7a56 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a7c59 });
  const flowerColors = [accentColor, 0xf43f5e, 0xfbbf24, 0xa855f7];

  // Shop building
  const shopGeo = new THREE.BoxGeometry(4.8, 3.6, 4.2);
  const shop = new THREE.Mesh(shopGeo, woodMat);
  shop.position.y = 1.8;
  shop.castShadow = true;
  group.add(shop);

  // Sloped roof
  const roofGeo = new THREE.ConeGeometry(3.8, 1.8, 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 4.5, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.1, 1.0, 0.95);
  group.add(roof);

  // Outdoor flower displays
  for (let i = 0; i < 3; i++) {
    const crateGeo = new THREE.BoxGeometry(1.0, 0.4, 0.6);
    const crate = new THREE.Mesh(crateGeo, woodMat);
    crate.position.set(-1.4 + i * 1.4, 0.25, 2.4);
    group.add(crate);

    const fGeo = new THREE.SphereGeometry(0.32, 8, 8);
    const fMat = new THREE.MeshLambertMaterial({ color: flowerColors[i % flowerColors.length]! });
    const flowers = new THREE.Mesh(fGeo, fMat);
    flowers.position.set(-1.4 + i * 1.4, 0.6, 2.4);
    group.add(flowers);
  }
}

/**
 * Post Office: Red brick building with red British cylinder mailbox
 */
function buildPostOffice(group: THREE.Group, accentColor: number): void {
  const brickTexture = createBrickTexture('#ab3b24');
  const brickMat = new THREE.MeshLambertMaterial({ map: brickTexture });
  const roofMat = new THREE.MeshLambertMaterial({ color: accentColor });
  const postRedMat = new THREE.MeshLambertMaterial({ color: 0xd92626 });

  // Main building
  const bldgGeo = new THREE.BoxGeometry(5.0, 3.8, 4.4);
  const bldg = new THREE.Mesh(bldgGeo, brickMat);
  bldg.position.y = 1.9;
  bldg.castShadow = true;
  group.add(bldg);

  // Mansard roof
  const roofGeo = new THREE.ConeGeometry(3.9, 1.6, 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 4.6;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  // Iconic Red Post Box outside
  const postBoxBaseGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12);
  const postBox = new THREE.Mesh(postBoxBaseGeo, postRedMat);
  postBox.position.set(2.2, 0.6, 2.4);
  postBox.castShadow = true;
  group.add(postBox);

  const postBoxCapGeo = new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const postBoxCap = new THREE.Mesh(postBoxCapGeo, postRedMat);
  postBoxCap.position.set(2.2, 1.2, 2.4);
  group.add(postBoxCap);
}

/**
 * Cinema / Theater: Art deco marquee canopy and poster frames
 */
function buildCinema(group: THREE.Group, accentColor: number): void {
  const stuccoMat = new THREE.MeshLambertMaterial({ color: 0x4a4a5a });
  const marqueeMat = new THREE.MeshLambertMaterial({ color: accentColor });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });

  // Cinema hall
  const hallGeo = new THREE.BoxGeometry(5.2, 5.0, 4.6);
  const hall = new THREE.Mesh(hallGeo, stuccoMat);
  hall.position.y = 2.5;
  hall.castShadow = true;
  group.add(hall);

  // Marquee canopy protruding over sidewalk
  const canopyGeo = new THREE.BoxGeometry(3.6, 0.5, 1.8);
  const canopy = new THREE.Mesh(canopyGeo, marqueeMat);
  canopy.position.set(0, 2.8, 2.8);
  group.add(canopy);

  // Marquee lightbulbs
  for (let i = 0; i < 6; i++) {
    const bulbGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const bulb = new THREE.Mesh(bulbGeo, goldMat);
    bulb.position.set(-1.4 + i * 0.56, 2.5, 3.7);
    group.add(bulb);
  }
}

/**
 * Cozy Shop (Bakery, Tea House, Bookstore, Cafe)
 * Features warm brick/stucco, shopfront bay window, and striped awning
 */
function buildCozyShop(group: THREE.Group, accentColor: number, _name: string): void {
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xf3ede2 }); // Warm cream stucco
  const roofMat = new THREE.MeshLambertMaterial({ color: accentColor });
  const awningTexture = createAwningTexture('#c93b2b', '#ffffff');
  const awningMat = new THREE.MeshLambertMaterial({ map: awningTexture });
  const windowGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Warm warm interior light
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });

  // Main 2-story shop building
  const buildingGeo = new THREE.BoxGeometry(4.8, 4.2, 4.2);
  const building = new THREE.Mesh(buildingGeo, wallMat);
  building.position.y = 2.1;
  building.castShadow = true;
  group.add(building);

  // Gabled roof
  const roofGeo = new THREE.ConeGeometry(3.8, 1.8, 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 5.1, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.1, 1.0, 0.95);
  roof.castShadow = true;
  group.add(roof);

  // Chimney
  const chimneyGeo = new THREE.BoxGeometry(0.6, 1.4, 0.6);
  const chimneyMat = new THREE.MeshLambertMaterial({ color: 0x991b1b });
  const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
  chimney.position.set(1.5, 5.2, -0.8);
  group.add(chimney);

  // Striped canopy awning
  const awningGeo = new THREE.CylinderGeometry(1.6, 1.6, 3.2, 12, 1, false, 0, Math.PI);
  const awning = new THREE.Mesh(awningGeo, awningMat);
  awning.rotation.z = Math.PI / 2;
  awning.rotation.y = Math.PI;
  awning.position.set(0, 2.4, 2.5);
  awning.scale.set(1.0, 0.6, 0.8);
  group.add(awning);

  // Shop front window with warm glow
  const windowGeo = new THREE.PlaneGeometry(1.6, 1.4);
  const windowMesh = new THREE.Mesh(windowGeo, windowGlowMat);
  windowMesh.position.set(-1.1, 1.3, 2.12);
  group.add(windowMesh);

  // Shop door
  const doorGeo = new THREE.PlaneGeometry(0.9, 1.8);
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(1.1, 1.0, 2.12);
  group.add(door);
}
