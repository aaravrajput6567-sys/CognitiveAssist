/**
 * 3D Stylized Character (Arthur)
 *
 * Procedurally constructed 3D humanoid with tweed cap, warm jacket, scarf,
 * and walking stick. Includes hierarchical bone/group rigging for smooth walking,
 * turning, cane tapping, and idle breathing animations.
 */

import * as THREE from 'three';

export interface CharacterRig {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  cane: THREE.Group;
  walkCycle: number;
  idleCycle: number;
}

export function createArthurCharacter(): CharacterRig {
  const root = new THREE.Group();
  root.name = 'ArthurRoot';

  // Materials
  const tweedCoatMat = new THREE.MeshLambertMaterial({ color: 0x825232 }); // Warm tweed brown
  const trousersMat = new THREE.MeshLambertMaterial({ color: 0x3f4e5c }); // Charcoal slate
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xf5c396 });     // Warm peach skin
  const capMat = new THREE.MeshLambertMaterial({ color: 0x586047 });      // Olive tweed
  const scarfMat = new THREE.MeshLambertMaterial({ color: 0xb9382b });    // Cozy crimson
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0x241d17 });     // Dark brown leather
  const caneWoodMat = new THREE.MeshLambertMaterial({ color: 0x4a2c11 }); // Mahogany
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.8,
    roughness: 0.3,
  });
  const glassesMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });

  // Pelvis
  const pelvis = new THREE.Group();
  pelvis.position.y = 1.05;
  pelvis.rotation.y = Math.PI; // Face forward down the road (-Z) when root rotation is 0
  root.add(pelvis);

  // Torso
  const torso = new THREE.Group();
  const coatGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.75, 10);
  const coatMesh = new THREE.Mesh(coatGeo, tweedCoatMat);
  coatMesh.position.y = 0.42;
  coatMesh.castShadow = true;
  torso.add(coatMesh);

  // Scarf
  const scarfGeo = new THREE.TorusGeometry(0.24, 0.08, 8, 16);
  const scarfMesh = new THREE.Mesh(scarfGeo, scarfMat);
  scarfMesh.rotation.x = Math.PI / 2;
  scarfMesh.position.y = 0.8;
  scarfMesh.castShadow = true;
  torso.add(scarfMesh);

  // Scarf tail hanging down
  const scarfTailGeo = new THREE.BoxGeometry(0.12, 0.32, 0.06);
  const scarfTail = new THREE.Mesh(scarfTailGeo, scarfMat);
  scarfTail.position.set(0.12, 0.65, 0.26);
  scarfTail.rotation.z = -0.15;
  torso.add(scarfTail);

  // Head group
  const head = new THREE.Group();
  head.position.y = 0.98;

  // Head sphere
  const headGeo = new THREE.SphereGeometry(0.22, 16, 14);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Nose
  const noseGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const noseMesh = new THREE.Mesh(noseGeo, skinMat);
  noseMesh.position.set(0, 0, 0.22);
  head.add(noseMesh);

  // Glasses (2 round wire rims + bridge)
  const rimGeo = new THREE.TorusGeometry(0.065, 0.012, 6, 14);
  const leftRim = new THREE.Mesh(rimGeo, glassesMat);
  leftRim.position.set(-0.09, 0.02, 0.2);
  const rightRim = new THREE.Mesh(rimGeo, glassesMat);
  rightRim.position.set(0.09, 0.02, 0.2);
  head.add(leftRim);
  head.add(rightRim);

  const bridgeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.08);
  const bridge = new THREE.Mesh(bridgeGeo, glassesMat);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.02, 0.21);
  head.add(bridge);

  // Tweed Flat Cap
  const capCrownGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.1, 16);
  const capCrown = new THREE.Mesh(capCrownGeo, capMat);
  capCrown.position.set(0, 0.14, -0.02);
  capCrown.rotation.x = -0.1;
  head.add(capCrown);

  const capBrimGeo = new THREE.CylinderGeometry(0.28, 0.26, 0.03, 16, 1, false, 0, Math.PI);
  const capBrim = new THREE.Mesh(capBrimGeo, capMat);
  capBrim.position.set(0, 0.13, 0.14);
  capBrim.rotation.x = 0.15;
  head.add(capBrim);

  torso.add(head);
  pelvis.add(torso);

  // Left Leg
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0, 0);
  const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.9, 8);
  const leftLegMesh = new THREE.Mesh(legGeo, trousersMat);
  leftLegMesh.position.y = -0.45;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);

  const shoeGeo = new THREE.BoxGeometry(0.14, 0.12, 0.26);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, -0.9, 0.05);
  leftShoe.castShadow = true;
  leftLeg.add(leftShoe);
  pelvis.add(leftLeg);

  // Right Leg
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, 0, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, trousersMat);
  rightLegMesh.position.y = -0.45;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, -0.9, 0.05);
  rightShoe.castShadow = true;
  rightLeg.add(rightShoe);
  pelvis.add(rightLeg);

  // Left Arm (Swings naturally)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.38, 0.68, 0);
  const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.65, 8);
  const leftArmMesh = new THREE.Mesh(armGeo, tweedCoatMat);
  leftArmMesh.position.y = -0.3;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);

  const handGeo = new THREE.SphereGeometry(0.07, 8, 8);
  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.y = -0.65;
  leftArm.add(leftHand);
  torso.add(leftArm);

  // Right Arm (Holds Walking Cane)
  const rightArm = new THREE.Group();
  rightArm.position.set(0.38, 0.68, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, tweedCoatMat);
  rightArmMesh.position.y = -0.3;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);

  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.y = -0.65;
  rightArm.add(rightHand);

  // Walking Cane attached to right hand
  const cane = new THREE.Group();
  cane.position.set(0, -0.65, 0.05);

  // Cane Shaft
  const caneShaftGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.95, 8);
  const caneShaft = new THREE.Mesh(caneShaftGeo, caneWoodMat);
  caneShaft.position.y = -0.4;
  caneShaft.castShadow = true;
  cane.add(caneShaft);

  // Curved Brass Handle
  const handleGeo = new THREE.TorusGeometry(0.07, 0.022, 8, 12, Math.PI);
  const handleMesh = new THREE.Mesh(handleGeo, brassMat);
  handleMesh.rotation.z = Math.PI;
  handleMesh.position.set(0.04, 0.07, 0);
  cane.add(handleMesh);

  rightArm.add(cane);
  torso.add(rightArm);

  return {
    root,
    pelvis,
    torso,
    head,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    cane,
    walkCycle: 0,
    idleCycle: 0,
  };
}

/**
 * Updates Arthur's procedural rigging animations
 */
export function updateArthurAnimation(
  rig: CharacterRig,
  deltaSec: number,
  isWalking: boolean,
  walkSpeed = 5.0,
  isRewinding = false
): void {
  if (isWalking) {
    rig.walkCycle += deltaSec * walkSpeed;
    const cycle = rig.walkCycle;

    // Opposite leg swing
    const legAngle = Math.sin(cycle) * 0.55;
    rig.leftLeg.rotation.x = legAngle;
    rig.rightLeg.rotation.x = -legAngle;

    // Arm swing (left arm swings opposite to left leg)
    rig.leftArm.rotation.x = -legAngle * 0.7;
    // Right arm holds cane, tapping forward rhythmically
    rig.rightArm.rotation.x = Math.max(-0.4, Math.sin(cycle) * 0.35 - 0.2);
    rig.cane.rotation.x = -Math.sin(cycle) * 0.25;

    // Gentle vertical walking bob (2 bobs per full stride cycle)
    const bob = Math.abs(Math.sin(cycle)) * 0.07;
    rig.pelvis.position.y = 1.05 + bob;

    // Subtle side sway
    rig.pelvis.rotation.z = Math.sin(cycle) * 0.04;
    rig.torso.rotation.y = -Math.sin(cycle) * 0.06;

    // Looking forward with gentle cap nod
    rig.head.rotation.x = Math.sin(cycle * 2) * 0.03;
    rig.head.rotation.y = 0;
  } else {
    // Idle state: gentle breathing and relaxed stance
    rig.idleCycle += deltaSec * 1.8;
    const cycle = rig.idleCycle;

    // Smooth return of limbs to neutral stance
    rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, 0, 0.1);
    rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, 0, 0.1);
    rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, 0.08, 0.1);
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -0.15, 0.1);
    rig.cane.rotation.x = THREE.MathUtils.lerp(rig.cane.rotation.x, 0.1, 0.1);

    // Breathing motion
    const breath = Math.sin(cycle) * 0.02;
    rig.pelvis.position.y = 1.05 + breath;
    rig.pelvis.rotation.z = 0;
    rig.torso.rotation.y = 0;

    if (isRewinding) {
      // Curious, looking left and right gently during auto-rewind
      rig.head.rotation.y = Math.sin(cycle * 1.5) * 0.28;
      rig.head.rotation.x = -0.05;
    } else {
      rig.head.rotation.y = Math.sin(cycle * 0.4) * 0.08;
      rig.head.rotation.x = 0;
    }
  }
}
