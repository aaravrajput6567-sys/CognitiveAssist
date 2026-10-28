/**
 * Procedural Texture Generator for Three.js
 *
 * Generates crisp, warm, stylized textures in memory via HTML5 Canvas.
 * 100% offline-first, 0 external image dependencies, instant load.
 */

import * as THREE from 'three';

// Cache generated textures so we don't recreate them repeatedly
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Cobblestone road texture with subtle variations
 */
export function createCobblestoneTexture(): THREE.CanvasTexture {
  const key = 'cobblestone';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base mortar color
  ctx.fillStyle = '#655e56';
  ctx.fillRect(0, 0, 512, 512);

  // Draw cobblestones in staggered rows
  const rows = 16;
  const rowHeight = 512 / rows;
  const stoneColors = ['#8d847a', '#7e766c', '#9b9186', '#726a61', '#a3998d'];

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight;
    const offset = (r % 2) * 16;
    let x = -offset;

    while (x < 512 + 32) {
      const stoneWidth = 24 + ((r * 7 + x * 13) % 14);
      const color = stoneColors[Math.abs(Math.floor(x + r * 17)) % stoneColors.length]!;

      ctx.fillStyle = color;
      ctx.beginPath();
      // Rounded cobblestone
      const pad = 2;
      const rx = x + pad;
      const ry = y + pad;
      const rw = stoneWidth - pad * 2;
      const rh = rowHeight - pad * 2;
      ctx.roundRect(rx, ry, rw, rh, 4);
      ctx.fill();

      // Top-left highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rx + 2, ry + rh - 2);
      ctx.lineTo(rx + 2, ry + 2);
      ctx.lineTo(rx + rw - 2, ry + 2);
      ctx.stroke();

      // Bottom-right shadow
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.moveTo(rx + rw - 2, ry + 2);
      ctx.lineTo(rx + rw - 2, ry + rh - 2);
      ctx.lineTo(rx + 2, ry + rh - 2);
      ctx.stroke();

      x += stoneWidth;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 6);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Sidewalk paving flagstones
 */
export function createSidewalkTexture(): THREE.CanvasTexture {
  const key = 'sidewalk';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b0a89d';
  ctx.fillRect(0, 0, 256, 256);

  // Large stone flags
  ctx.strokeStyle = '#7c746a';
  ctx.lineWidth = 3;

  for (let x = 0; x <= 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Brick wall texture for buildings
 */
export function createBrickTexture(baseColor = '#c15c3d'): THREE.CanvasTexture {
  const key = `brick_${baseColor}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Mortar
  ctx.fillStyle = '#dcd5ca';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 16;
  const rowH = 256 / rows;
  const brickW = 32;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const offset = (r % 2) * (brickW / 2);
    for (let x = -offset; x < 256 + brickW; x += brickW) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(x + 1, y + 1, brickW - 2, rowH - 2);

      // Subtle shading
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(x + 1, y + rowH - 3, brickW - 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Striped awning canvas texture (e.g. bakery / cafe)
 */
export function createAwningTexture(primaryColor = '#d93829', secondaryColor = '#ffffff'): THREE.CanvasTexture {
  const key = `awning_${primaryColor}_${secondaryColor}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const stripeW = 32;
  for (let x = 0; x < 256; x += stripeW * 2) {
    ctx.fillStyle = primaryColor;
    ctx.fillRect(x, 0, stripeW, 256);
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(x + stripeW, 0, stripeW, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Clock face texture
 */
export function createClockTexture(): THREE.CanvasTexture {
  const key = 'clock_face';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dial background
  ctx.fillStyle = '#fffdf7';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  // Brass rim
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 10;
  ctx.stroke();

  // Tick marks
  ctx.strokeStyle = '#2b2621';
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const x1 = 128 + Math.cos(angle) * 95;
    const y1 = 128 + Math.sin(angle) * 95;
    const x2 = 128 + Math.cos(angle) * 110;
    const y2 = 128 + Math.sin(angle) * 110;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Hands (set to 10:10, welcoming traditional clock pose)
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(85, 80); // hour hand
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(175, 70); // minute hand
  ctx.stroke();

  // Center pin
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.arc(128, 128, 8, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

/**
 * High-resolution Storefront Fascia Signboard mounted directly on the front wall
 */
export function createFrontFasciaSignTexture(name: string, category: string, accentColor = '#f59e0b'): THREE.CanvasTexture {
  const key = `fascia_${name}_${category}_${accentColor}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(8, 8, 1008, 240);

  // Signboard outer border (carved dark walnut / brass)
  ctx.fillStyle = '#2d1810';
  ctx.fillRect(4, 4, 1016, 248);

  // Inner brass lining
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 996, 228);

  // Sign plate background (clean, warm ivory white for maximum readability)
  ctx.fillStyle = '#fffdfa';
  ctx.fillRect(20, 20, 984, 216);

  // Top color accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(20, 20, 984, 18);

  // Bottom color accent bar
  ctx.fillRect(20, 218, 984, 18);

  // Large bold landmark name
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 68px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), 512, 115);

  // Subtitle category in gold/bronze
  ctx.fillStyle = '#7c2d12';
  ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`★  ${category.toUpperCase()}  ★`, 512, 180);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Billboard text badge for landmarks (higher resolution & contrast)
 */
export function createLandmarkLabelTexture(name: string, category: string, color = '#fef3c7'): THREE.CanvasTexture {
  const key = `label_${name}_${category}_${color}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 280;
  const ctx = canvas.getContext('2d')!;

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 248, 36);
  ctx.fill();

  // Badge background (High-contrast pure white)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(10, 10, 992, 244, 34);
  ctx.fill();

  // Top header bar in landmark color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(10, 10, 992, 34, [34, 34, 0, 0]);
  ctx.fill();

  // Deep dark border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(10, 10, 992, 244, 34);
  ctx.stroke();

  // Large Bold Title
  ctx.fillStyle = '#09090b';
  ctx.font = '900 76px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 512, 128);

  // Subtitle category
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`• ${category.toUpperCase()} •`, 512, 205);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

