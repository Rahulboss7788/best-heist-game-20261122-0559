// Everything the eye sees: the hall, its wardens and their cones, the jewel, the
// thief, and the HUD with its alarm meter. The world is drawn in a fixed order —
// floor, cones, walls and cover, people, then the HUD — so a cone never shows
// through a column or a wall it cannot cross.

import { ALARM, CAMERA, FIELD, FONT, FONT_UI, GUARD, PALETTE, TOOLS, fitScale } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function alarmColour(alarm) {
  if (alarm >= 70) return PALETTE.danger;
  if (alarm >= 40) return PALETTE.warning;
  return PALETTE.good;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(canvas.clientWidth * ratio);
    const height = Math.floor(canvas.clientHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function drawFloor(museum) {
    const tile = 64;
    const hall = museum.hall;
    for (let y = hall.y; y < hall.y + hall.height; y += tile) {
      for (let x = hall.x; x < hall.x + hall.width; x += tile) {
        const even = ((x - hall.x) / tile + (y - hall.y) / tile) % 2 === 0;
        context.fillStyle = even ? PALETTE.floorA : PALETTE.floorB;
        context.fillRect(x, y, tile, tile);
      }
    }
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 1;
    for (let x = hall.x; x <= hall.x + hall.width; x += tile) {
      context.beginPath();
      context.moveTo(x + 0.5, hall.y);
      context.lineTo(x + 0.5, hall.y + hall.height);
      context.stroke();
    }
    for (let y = hall.y; y <= hall.y + hall.height; y += tile) {
      context.beginPath();
      context.moveTo(hall.x, y + 0.5);
      context.lineTo(hall.x + hall.width, y + 0.5);
      context.stroke();
    }
    // The red carpet down the middle, from the entrance to the pedestal.
    context.fillStyle = PALETTE.carpet;
    context.fillRect(596, 340, 88, 296);
    context.fillStyle = PALETTE.carpetEdge;
    context.fillRect(592, 340, 4, 296);
    context.fillRect(680, 340, 4, 296);
    for (let y = 360; y < 620; y += 44) {
      context.fillStyle = PALETTE.carpetEdge;
      context.beginPath();
      context.moveTo(640, y);
      context.lineTo(652, y + 10);
      context.lineTo(640, y + 20);
      context.lineTo(628, y + 10);
      context.closePath();
      context.fill();
    }
  }

  function drawWalls(museum) {
    const hall = museum.hall;
    context.fillStyle = PALETTE.wall;
    context.fillRect(hall.x - 16, hall.y - 16, hall.width + 32, 16);
    context.fillRect(hall.x - 16, hall.y + hall.height, hall.width + 32, 16);
    context.fillRect(hall.x - 16, hall.y, 16, hall.height);
    context.fillRect(hall.x + hall.width, hall.y, 16, hall.height);
    context.strokeStyle = PALETTE.wallTrim;
    context.lineWidth = 2;
    context.strokeRect(hall.x - 15.5, hall.y - 15.5, hall.width + 31, hall.height + 31);
    context.strokeRect(hall.x + 0.5, hall.y + 0.5, hall.width - 1, hall.height - 1);
    // Gilded frames on the walls.
    for (const painting of museum.paintings) {
      context.fillStyle = PALETTE.paintingFrame;
      context.fillRect(painting.x - 4, painting.y - 4, painting.width + 8, painting.height + 8);
      context.fillStyle = painting.hue;
      context.fillRect(painting.x, painting.y, painting.width, painting.height);
      context.strokeStyle = 'rgba(242, 234, 216, 0.35)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(painting.x + 8, painting.y + painting.height - 10);
      context.lineTo(painting.x + painting.width / 2, painting.y + 12);
      context.lineTo(painting.x + painting.width - 8, painting.y + painting.height - 10);
      context.stroke();
    }
    // The service door: the way out.
    const exit = museum.exit;
    context.fillStyle = PALETTE.exitDark;
    context.fillRect(exit.x - 4, exit.y - 4, exit.width + 8, exit.height + 8);
    context.fillStyle = PALETTE.exit;
    context.fillRect(exit.x, exit.y, exit.width, exit.height);
    context.fillStyle = '#06281c';
    context.font = `bold 15px ${FONT_UI}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('SERVICE EXIT', exit.x + exit.width / 2, exit.y + exit.height / 2);
  }

  function drawCone(x, y, angle, halfAngle, range, colour, alpha) {
    const gradient = context.createRadialGradient(x, y, 8, x, y, range);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    context.closePath();
    context.fill();
    // A bright edge along the cone's rim, so the danger line reads at a glance.
    context.globalAlpha = Math.min(0.85, alpha * 2.2);
    context.strokeStyle = colour;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(x + Math.cos(angle - halfAngle) * 10, y + Math.sin(angle - halfAngle) * 10);
    context.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
    context.moveTo(x + Math.cos(angle + halfAngle) * 10, y + Math.sin(angle + halfAngle) * 10);
    context.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
    context.stroke();
    context.globalAlpha = 1;
  }

  function drawCover(museum) {
    // Tall display cases: glass and gold frames, tall enough to hide behind.
    for (const blocker of museum.blockers) {
      if (blocker.sight) {
        context.fillStyle = PALETTE.caseFrame;
        context.fillRect(blocker.x - 3, blocker.y - 3, blocker.width + 6, blocker.height + 6);
        context.fillStyle = PALETTE.caseGlass;
        context.globalAlpha = 0.55;
        context.fillRect(blocker.x, blocker.y, blocker.width, blocker.height);
        context.globalAlpha = 1;
        context.strokeStyle = 'rgba(242, 234, 216, 0.5)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(blocker.x + 8, blocker.y + blocker.height - 8);
        context.lineTo(blocker.x + blocker.width / 2, blocker.y + 8);
        context.lineTo(blocker.x + blocker.width - 8, blocker.y + blocker.height - 8);
        context.stroke();
      }
    }
    // Low plinths with their side loot.
    for (const blocker of museum.blockers) {
      if (!blocker.sight && blocker.width > 20) {
        context.fillStyle = PALETTE.plinth;
        context.fillRect(blocker.x, blocker.y, blocker.width, blocker.height);
        context.strokeStyle = PALETTE.wallTrim;
        context.lineWidth = 1.5;
        context.strokeRect(blocker.x + 0.5, blocker.y + 0.5, blocker.width - 1, blocker.height - 1);
      }
    }
    // Velvet ropes along the carpet.
    for (const blocker of museum.blockers) {
      if (blocker.width === 8 || blocker.height === 8) {
        context.fillStyle = PALETTE.rope;
        context.fillRect(blocker.x, blocker.y, blocker.width, blocker.height);
        context.fillStyle = PALETTE.ropePost;
        context.beginPath();
        context.arc(blocker.x + blocker.width / 2, blocker.y, 4, 0, TAU);
        context.arc(blocker.x + blocker.width / 2, blocker.y + blocker.height, 4, 0, TAU);
        context.fill();
      }
    }
    // Marble columns with gold capitals: the safest cover in the hall.
    for (const column of museum.columns) {
      context.fillStyle = 'rgba(0, 0, 0, 0.35)';
      context.beginPath();
      context.ellipse(column.x + 5, column.y + 7, column.radius + 2, column.radius * 0.7, 0, 0, TAU);
      context.fill();
      context.fillStyle = PALETTE.column;
      context.beginPath();
      context.arc(column.x, column.y, column.radius, 0, TAU);
      context.fill();
      context.fillStyle = PALETTE.columnShade;
      context.beginPath();
      context.arc(column.x, column.y, column.radius - 7, 0, TAU);
      context.fill();
      context.strokeStyle = PALETTE.wallTrim;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(column.x, column.y, column.radius, 0, TAU);
      context.stroke();
    }
  }

  function drawJewel(state, museum) {
    const pedestal = museum.pedestal;
    const centreX = pedestal.x + pedestal.width / 2;
    const centreY = pedestal.y + pedestal.height / 2;
    context.fillStyle = '#2c2417';
    context.fillRect(pedestal.x - 4, pedestal.y + pedestal.height - 6, pedestal.width + 8, 10);
    context.fillStyle = PALETTE.plinth;
    context.fillRect(pedestal.x, pedestal.y, pedestal.width, pedestal.height);
    context.strokeStyle = PALETTE.wallTrim;
    context.lineWidth = 2;
    context.strokeRect(pedestal.x + 0.5, pedestal.y + 0.5, pedestal.width - 1, pedestal.height - 1);
    if (!state.jewelTaken) {
      const pulse = 0.75 + 0.25 * Math.sin(state.time * 2.4);
      const glow = context.createRadialGradient(centreX, centreY - 14, 4, centreX, centreY - 14, 62);
      glow.addColorStop(0, `rgba(191, 239, 255, ${0.55 * pulse})`);
      glow.addColorStop(1, 'rgba(191, 239, 255, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(centreX, centreY - 14, 62, 0, TAU);
      context.fill();
      // The Aurora Star: a faceted diamond.
      context.fillStyle = PALETTE.jewel;
      context.beginPath();
      context.moveTo(centreX, centreY - 34);
      context.lineTo(centreX + 15, centreY - 14);
      context.lineTo(centreX, centreY + 6);
      context.lineTo(centreX - 15, centreY - 14);
      context.closePath();
      context.fill();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.moveTo(centreX, centreY - 34);
      context.lineTo(centreX + 7, centreY - 14);
      context.lineTo(centreX, centreY - 6);
      context.lineTo(centreX - 7, centreY - 14);
      context.closePath();
      context.fill();
      // Sparkles circling the jewel.
      for (const sparkle of state.sparkles) {
        const angle = sparkle.angle + state.time * sparkle.speed;
        const sx = centreX + Math.cos(angle) * sparkle.radius;
        const sy = centreY - 14 + Math.sin(angle) * sparkle.radius * 0.7;
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(state.time * 3 + sparkle.phase));
        context.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        context.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
      context.fillStyle = PALETTE.jewelGlow;
      context.font = `bold 13px ${FONT_UI}`;
      context.textAlign = 'center';
      context.textBaseline = 'bottom';
      context.fillText('THE AURORA STAR', centreX, pedestal.y - 10);
      if (state.pickProgress > 0) {
        const barWidth = 84;
        context.fillStyle = 'rgba(13, 15, 20, 0.85)';
        context.fillRect(centreX - barWidth / 2 - 3, pedestal.y + pedestal.height + 8, barWidth + 6, 12);
        context.fillStyle = PALETTE.jewel;
        context.fillRect(centreX - barWidth / 2, pedestal.y + pedestal.height + 11, barWidth * state.pickProgress, 6);
      }
    } else {
      context.fillStyle = PALETTE.muted;
      context.font = `13px ${FONT_UI}`;
      context.textAlign = 'center';
      context.textBaseline = 'bottom';
      context.fillText('case empty', centreX, pedestal.y - 10);
    }
  }

  function drawLoot(state) {
    for (const item of state.loot) {
      if (item.taken) continue;
      const bob = Math.sin(state.time * 2 + item.x) * 2;
      const glow = context.createRadialGradient(item.x, item.y + bob, 2, item.x, item.y + bob, 30);
      glow.addColorStop(0, 'rgba(255, 211, 77, 0.5)');
      glow.addColorStop(1, 'rgba(255, 211, 77, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(item.x, item.y + bob, 30, 0, TAU);
      context.fill();
      context.fillStyle = PALETTE.loot;
      context.beginPath();
      context.moveTo(item.x, item.y + bob - 10);
      context.lineTo(item.x + 8, item.y + bob);
      context.lineTo(item.x, item.y + bob + 10);
      context.lineTo(item.x - 8, item.y + bob);
      context.closePath();
      context.fill();
      context.fillStyle = '#e8c15a';
      context.font = `11px ${FONT_UI}`;
      context.textAlign = 'center';
      context.textBaseline = 'top';
      context.fillText(item.name, item.x, item.y + 16);
    }
  }

  function drawSmokeAndCoins(state) {
    for (const smoke of state.smokes) {
      const fade = Math.min(1, smoke.timeLeft / 1.2);
      context.fillStyle = `rgba(154, 163, 173, ${0.45 * fade})`;
      context.beginPath();
      context.arc(smoke.x, smoke.y, smoke.radius, 0, TAU);
      context.fill();
      context.fillStyle = `rgba(220, 226, 232, ${0.25 * fade})`;
      context.beginPath();
      context.arc(smoke.x - 24, smoke.y - 12, smoke.radius * 0.55, 0, TAU);
      context.arc(smoke.x + 26, smoke.y + 10, smoke.radius * 0.5, 0, TAU);
      context.fill();
    }
    for (const coin of state.coinDrops) {
      context.fillStyle = PALETTE.loot;
      context.beginPath();
      context.arc(coin.x, coin.y, 6, 0, TAU);
      context.fill();
      context.strokeStyle = '#7a5b00';
      context.lineWidth = 1.5;
      context.stroke();
    }
  }

  function drawGuard(guard) {
    const suspicious = guard.suspicion;
    const colour = guard.alertLeft > 0 || suspicious > 0.66 ? PALETTE.coneHot : PALETTE.cone;
    const alpha = guard.alertLeft > 0 ? 0.5 : 0.3 + suspicious * 0.28;
    drawCone(guard.x, guard.y, guard.angle, GUARD.halfAngle, GUARD.sightRange, colour, alpha);
  }

  function drawGuardBody(guard) {
    context.fillStyle = 'rgba(0, 0, 0, 0.35)';
    context.beginPath();
    context.ellipse(guard.x + 3, guard.y + 5, guard.radius, guard.radius * 0.6, 0, 0, TAU);
    context.fill();
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(guard.x, guard.y, guard.radius, 0, TAU);
    context.fill();
    context.strokeStyle = guard.alertLeft > 0 ? PALETTE.danger : PALETTE.guardTrim;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(guard.x, guard.y, guard.radius, 0, TAU);
    context.stroke();
    // The direction the warden faces.
    context.fillStyle = '#e8dcc0';
    context.beginPath();
    context.arc(guard.x + Math.cos(guard.angle) * 7, guard.y + Math.sin(guard.angle) * 7, 5, 0, TAU);
    context.fill();
    if (guard.suspicion > 0.15 || guard.alertLeft > 0) {
      const mark = guard.alertLeft > 0 || guard.suspicion > 0.85 ? '!' : '?';
      context.fillStyle = guard.alertLeft > 0 || guard.suspicion > 0.85 ? PALETTE.danger : PALETTE.warning;
      context.font = `bold 20px ${FONT_UI}`;
      context.textAlign = 'center';
      context.textBaseline = 'bottom';
      context.fillText(mark, guard.x, guard.y - guard.radius - 4);
      if (guard.suspicion > 0.15) {
        context.fillStyle = 'rgba(13, 15, 20, 0.8)';
        context.fillRect(guard.x - 16, guard.y - guard.radius - 16, 32, 5);
        context.fillStyle = PALETTE.warning;
        context.fillRect(guard.x - 16, guard.y - guard.radius - 16, 32 * guard.suspicion, 5);
      }
    }
  }

  function drawCamera(camera) {
    const alpha = 0.36;
    drawCone(camera.x, camera.y, camera.angle, CAMERA.halfAngle, CAMERA.sightRange, PALETTE.cameraCone, alpha);
    context.fillStyle = PALETTE.camera;
    context.beginPath();
    context.arc(camera.x, camera.y, 11, 0, TAU);
    context.fill();
    context.strokeStyle = PALETTE.danger;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(camera.x, camera.y, 11, 0, TAU);
    context.stroke();
    context.fillStyle = PALETTE.danger;
    context.beginPath();
    context.arc(camera.x + Math.cos(camera.angle) * 8, camera.y + Math.sin(camera.angle) * 8, 3.5, 0, TAU);
    context.fill();
  }

  function drawPlayer(state) {
    const player = state.player;
    // A warm pool of light around the thief, so the dark figure never vanishes
    // into the dark floor.
    const glow = context.createRadialGradient(player.x, player.y, 4, player.x, player.y, 42);
    glow.addColorStop(0, 'rgba(232, 193, 90, 0.22)');
    glow.addColorStop(1, 'rgba(232, 193, 90, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(player.x, player.y, 42, 0, TAU);
    context.fill();
    context.fillStyle = 'rgba(0, 0, 0, 0.4)';
    context.beginPath();
    context.ellipse(player.x + 3, player.y + 5, player.radius, player.radius * 0.6, 0, 0, TAU);
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y, player.radius, 0, TAU);
    context.fill();
    context.strokeStyle = PALETTE.playerTrim;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, player.radius, 0, TAU);
    context.stroke();
    // Gold scarf pointing where the thief moves.
    context.strokeStyle = PALETTE.playerTrim;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(player.x, player.y);
    context.lineTo(player.x + Math.cos(player.angle) * (player.radius + 7), player.y + Math.sin(player.angle) * (player.radius + 7));
    context.stroke();
    context.fillStyle = '#f2ead8';
    context.beginPath();
    context.arc(player.x + Math.cos(player.angle) * 6, player.y + Math.sin(player.angle) * 6, 4.5, 0, TAU);
    context.fill();
    if (player.sneaking) {
      context.setLineDash([4, 4]);
      context.strokeStyle = 'rgba(242, 234, 216, 0.6)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 6, 0, TAU);
      context.stroke();
      context.setLineDash([]);
    }
  }

  function drawHud(state, hud) {
    const width = FIELD.width;
    context.fillStyle = 'rgba(13, 15, 20, 0.92)';
    context.fillRect(0, 0, width, 54);
    context.fillStyle = PALETTE.panelEdge;
    context.fillRect(0, 54, width, 2);
    // Alarm meter.
    context.fillStyle = PALETTE.text;
    context.font = `bold 13px ${FONT_UI}`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText('ALARM', 18, 20);
    const meterX = 78;
    const meterWidth = 250;
    context.fillStyle = '#2a3040';
    context.fillRect(meterX, 10, meterWidth, 18);
    context.fillStyle = alarmColour(state.alarm);
    context.fillRect(meterX, 10, meterWidth * (state.alarm / ALARM.caughtAt), 18);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1.5;
    context.strokeRect(meterX + 0.5, 10.5, meterWidth - 1, 17);
    if (hud.seen) {
      context.fillStyle = PALETTE.danger;
      context.font = `bold 13px ${FONT_UI}`;
      context.fillText('SPOTTED', meterX + meterWidth + 12, 20);
    }
    // Gala clock.
    context.fillStyle = state.timeLeft <= 30 ? PALETTE.danger : PALETTE.text;
    context.font = `bold 22px ${FONT_UI}`;
    context.textAlign = 'center';
    context.fillText(`GALA ENDS ${formatTime(state.timeLeft)}`, width / 2, 22);
    context.fillStyle = PALETTE.muted;
    context.font = `12px ${FONT_UI}`;
    context.fillText(state.jewelTaken ? 'Jewel secured — reach the service exit' : 'Steal the Aurora Star', width / 2, 42);
    // Score and loot.
    context.fillStyle = PALETTE.text;
    context.font = `bold 18px ${FONT_UI}`;
    context.textAlign = 'right';
    context.fillText(`SCORE ${state.score}`, width - 18, 20);
    const taken = state.loot.filter((item) => item.taken).length;
    context.fillStyle = PALETTE.loot;
    context.font = `13px ${FONT_UI}`;
    context.fillText(`loot ${taken}/4`, width - 18, 42);
    // Tools, bottom left.
    context.textAlign = 'left';
    context.font = `13px ${FONT_UI}`;
    const tools = [
      { label: `Q  Smoke ×${state.smokeCharges}`, ready: state.smokeCharges > 0 },
      { label: `E  Coin ×${state.coins}`, ready: state.coins > 0 },
      { label: 'Shift  Sneak', ready: true },
      { label: 'F  Pick the lock', ready: !state.jewelTaken },
    ];
    tools.forEach((tool, index) => {
      const y = FIELD.height - 24 - (tools.length - 1 - index) * 22;
      context.fillStyle = tool.ready ? PALETTE.text : PALETTE.muted;
      context.fillText(tool.label, 18, y);
    });
    // The message banner.
    if (state.messageLeft > 0 && state.message) {
      context.font = `italic 17px ${FONT}`;
      context.textAlign = 'center';
      const textWidth = context.measureText(state.message).width;
      context.fillStyle = 'rgba(13, 15, 20, 0.85)';
      context.fillRect(width / 2 - textWidth / 2 - 14, 66, textWidth + 28, 30);
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 1;
      context.strokeRect(width / 2 - textWidth / 2 - 14.5, 66.5, textWidth + 28, 29);
      context.fillStyle = PALETTE.text;
      context.fillText(state.message, width / 2, 82);
    }
    // A red edge when the alarm runs hot.
    if (state.alarm >= 70 || hud.seen) {
      const pulse = 0.25 + 0.15 * Math.sin(state.time * 6);
      context.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
      context.lineWidth = 10;
      context.strokeRect(5, 59, width - 10, FIELD.height - 64);
    }
  }

  function drawOverlay(title, lines, accent) {
    context.fillStyle = 'rgba(10, 12, 17, 0.78)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = accent;
    context.font = `bold 54px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(title, FIELD.width / 2, 210);
    context.fillStyle = PALETTE.text;
    context.font = `19px ${FONT}`;
    lines.forEach((line, index) => {
      context.fillText(line, FIELD.width / 2, 290 + index * 34);
    });
  }

  function drawTitle(state, best) {
    context.fillStyle = 'rgba(10, 12, 17, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.jewelGlow;
    context.font = `bold 64px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('THE GILDED HOUR', FIELD.width / 2, 150);
    context.fillStyle = PALETTE.wallTrim;
    context.font = `italic 22px ${FONT}`;
    context.fillText('A gala. A jewel. One quiet hour.', FIELD.width / 2, 200);
    context.fillStyle = PALETTE.text;
    context.font = `18px ${FONT_UI}`;
    const lines = [
      'WASD or arrows to move — click anywhere to walk there. Hold Shift to sneak.',
      'Stay out of the wardens’ amber cones and the Argus cameras’ red cones.',
      'Q throws smoke, E tosses a coin to lure a warden, F picks the jewel’s lock.',
      'Take the Aurora Star, then slip out the green service exit before the gala ends.',
    ];
    lines.forEach((line, index) => {
      context.fillText(line, FIELD.width / 2, 268 + index * 30);
    });
    const blink = 0.6 + 0.4 * Math.sin(state.time * 3);
    context.fillStyle = `rgba(232, 193, 90, ${blink})`;
    context.font = `bold 22px ${FONT_UI}`;
    context.fillText('Press Space or click to begin', FIELD.width / 2, 440);
    if (best > 0) {
      context.fillStyle = PALETTE.muted;
      context.font = `16px ${FONT_UI}`;
      context.fillText(`Best getaway: ${best}`, FIELD.width / 2, 478);
    }
  }

  return {
    draw(state, screen, best, hud, museum) {
      resize();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewWidth = canvas.clientWidth;
      const viewHeight = canvas.clientHeight;
      const fit = fitScale(viewWidth, viewHeight);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = PALETTE.backdrop;
      context.fillRect(0, 0, viewWidth, viewHeight);
      context.save();
      context.translate(fit.offsetX, fit.offsetY);
      context.scale(fit.scale, fit.scale);
      context.clearRect(0, 0, FIELD.width, FIELD.height);
      drawFloor(museum);
      for (const guard of state.guards) drawGuard(guard);
      for (const camera of state.cameras) drawCamera(camera);
      drawWalls(museum);
      drawCover(museum);
      drawJewel(state, museum);
      drawLoot(state);
      drawSmokeAndCoins(state);
      for (const guard of state.guards) drawGuardBody(guard);
      drawPlayer(state);
      drawHud(state, hud);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) {
        drawOverlay('PAUSED', ['Take a breath. The wardens wait for no one.', 'Press P or Space to keep moving.'], PALETTE.text);
      } else if (screen === SCREEN_OVER) {
        if (state.outcome === 'escaped') {
          const lines = [
            `The Aurora Star leaves with you. Score ${state.score}.`,
            `Time bonus ${state.timeBonus || 0}  ·  Calm bonus ${state.calmBonus || 0}`,
            best > 0 ? `Best getaway: ${best}` : '',
            'Press Space to steal it all over again.',
          ];
          drawOverlay('CLEAN GETAWAY', lines.filter(Boolean), PALETTE.good);
        } else if (state.outcome === 'time') {
          drawOverlay('THE GALA ENDS', [
            'The lights come up. The hall locks down.',
            `Score ${state.score}. The jewel stays in its case.`,
            'Press Space to try the night again.',
          ], PALETTE.warning);
        } else {
          drawOverlay('CAUGHT', [
            'The wardens close in. The alarm does the rest.',
            `Score ${state.score}. The Aurora Star stays put.`,
            'Press Space to try the night again.',
          ], PALETTE.danger);
        }
      }
      context.restore();
    },
  };
}
