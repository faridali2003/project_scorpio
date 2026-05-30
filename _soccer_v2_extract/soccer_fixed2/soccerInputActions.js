/**
 * Xbox controls — RB switches player (always). No attack/defend mode gating.
 */
import { readGamepadSticks } from './fifaCamera';

const BUFFER_MS = 350;

const KEY = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  pass: ['KeyE'],
  shoot: ['Space'],
  lob: ['KeyQ'],
  cross: ['KeyC'],
  through: ['KeyT'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jockey: ['KeyX'],
  switch: ['Tab'],
  pause: ['Escape', 'KeyP'],
};

const keysDown = new Set();

export function bindSoccerKeys(domElement) {
  const down = (e) => {
    if (['Tab', ' '].includes(e.key)) e.preventDefault();
    keysDown.add(e.code);
  };
  const up = (e) => keysDown.delete(e.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  const focus = () => domElement?.focus();
  domElement?.addEventListener('mousedown', focus);
  window.addEventListener('gamepadconnected', focus);
  if (domElement) {
    domElement.tabIndex = 0;
    domElement.setAttribute('role', 'application');
  }
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    keysDown.clear();
  };
}

function keyHeld(codes) {
  return codes.some((c) => keysDown.has(c));
}

function pollPads() {
  return navigator.getGamepads?.() || [];
}

function activePad() {
  const pads = pollPads();
  for (let i = 0; i < pads.length; i += 1) {
    if (pads[i]?.connected) return pads[i];
  }
  return null;
}

function btnEdge(pad, idx, prev) {
  return Boolean(pad.buttons[idx]?.pressed) && !prev[idx];
}

function trigger(v) {
  return v > 0.2 ? v : 0;
}

function pushBuffer(buf, action) {
  buf.push({ action, at: performance.now() });
  while (buf.length > 6) buf.shift();
}

function consumeBuffer(buf, name) {
  const now = performance.now();
  const i = buf.findIndex((b) => b.action === name && now - b.at < BUFFER_MS);
  if (i < 0) return false;
  buf.splice(i, 1);
  return true;
}

export function pollSoccerActions(prev, match, players, ball) {
  const buf = prev._buffer || [];
  const prevBtn = prev._buttonState || [];
  void match;
  void players;
  void ball;

  const pad = activePad();
  const now = performance.now();
  const next = {
    moveX: 0,
    moveY: 0,
    sprint: false,
    jockey: false,
    lb: false,
    rb: false,
    switchPlayer: false,
    switchPlayerDirection: null,
    pass: false,
    shoot: false,
    lob: false,
    cross: false,
    through: false,
    driven: false,
    finesse: false,
    tactic: null,
    pause: false,
    usingGamepad: false,
    _buffer: buf,
    _buttonState: prevBtn,
    _lastActionT: prev._lastActionT,
  };

  const canAct = !prev._lastActionT || now - prev._lastActionT > 140;
  const fire = (v) => v && canAct;

  if (pad) {
    next.usingGamepad = true;
    const sticks = readGamepadSticks(pad);
    next.moveX = sticks.move.x;
    next.moveY = sticks.move.y;
    next.sprint = trigger(pad.buttons[7]?.value ?? 0) > 0.3 || trigger(pad.axes[7] ?? 0) > 0.3;
    next.jockey = trigger(pad.buttons[6]?.value ?? 0) > 0.3 || trigger(pad.axes[6] ?? 0) > 0.3;
    next.lb = pad.buttons[4]?.pressed;
    next.rb = pad.buttons[5]?.pressed;

    if (sticks.camMag > 0.42) {
      next.switchPlayerDirection = { x: sticks.cam.x, y: sticks.cam.y };
    } else if (btnEdge(pad, 5, prevBtn)) {
      next.switchPlayer = true;
    }

    if (btnEdge(pad, 0, prevBtn)) pushBuffer(buf, 'pass');
    if (btnEdge(pad, 1, prevBtn)) pushBuffer(buf, 'shoot');
    if (btnEdge(pad, 2, prevBtn)) {
      pushBuffer(buf, pad.buttons[4]?.pressed ? 'cross' : 'lob');
    }
    if (btnEdge(pad, 3, prevBtn)) pushBuffer(buf, 'through');
    if (btnEdge(pad, 9, prevBtn)) next.pause = true;

    if (btnEdge(pad, 12, prevBtn)) next.tactic = 'Press';
    if (btnEdge(pad, 13, prevBtn)) next.tactic = 'Drop back';
    if (btnEdge(pad, 14, prevBtn)) next.tactic = 'Narrow';
    if (btnEdge(pad, 15, prevBtn)) next.tactic = 'Wide';

    next._buttonState = pad.buttons.map((b) => b.pressed);
  } else {
    let mx = 0;
    let my = 0;
    if (keyHeld(KEY.left)) mx -= 1;
    if (keyHeld(KEY.right)) mx += 1;
    if (keyHeld(KEY.up)) my += 1;
    if (keyHeld(KEY.down)) my -= 1;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    next.moveX = mx;
    next.moveY = my;
    next.sprint = keyHeld(KEY.sprint);
    next.jockey = keyHeld(KEY.jockey);
    if (keyHeld(KEY.pass) && !prev._kbPass) pushBuffer(buf, 'pass');
    if (keyHeld(KEY.shoot) && !prev._kbShoot) pushBuffer(buf, 'shoot');
    if (keyHeld(KEY.lob) && !prev._kbLob) pushBuffer(buf, 'lob');
    if (keyHeld(KEY.cross) && !prev._kbCross) pushBuffer(buf, 'cross');
    if (keyHeld(KEY.through) && !prev._kbThrough) pushBuffer(buf, 'through');
    if (keyHeld(KEY.switch) && !prev._kbSwitch) next.switchPlayer = true;
    if (keyHeld(KEY.pause) && !prev._kbPause) next.pause = true;

    next._kbPass = keyHeld(KEY.pass);
    next._kbShoot = keyHeld(KEY.shoot);
    next._kbLob = keyHeld(KEY.lob);
    next._kbCross = keyHeld(KEY.cross);
    next._kbThrough = keyHeld(KEY.through);
    next._kbSwitch = keyHeld(KEY.switch);
    next._kbPause = keyHeld(KEY.pause);
  }

  next.pass = fire(consumeBuffer(buf, 'pass'));
  next.shoot = fire(consumeBuffer(buf, 'shoot'));
  next.lob = fire(consumeBuffer(buf, 'lob'));
  next.cross = fire(consumeBuffer(buf, 'cross'));
  next.through = fire(consumeBuffer(buf, 'through'));
  next.driven = next.pass && next.lb;
  next.finesse = next.shoot && next.lb;

  if (next.pass || next.shoot || next.lob || next.cross || next.through) {
    next._lastActionT = now;
  }

  return next;
}

/** Labels for input-debug overlay (keyboard held state). */
export function getHeldKeyLabels() {
  const out = [];
  if (keyHeld(KEY.up)) out.push('up');
  if (keyHeld(KEY.down)) out.push('down');
  if (keyHeld(KEY.left)) out.push('left');
  if (keyHeld(KEY.right)) out.push('right');
  if (keyHeld(KEY.pass)) out.push('pass');
  if (keyHeld(KEY.shoot)) out.push('shoot');
  if (keyHeld(KEY.lob)) out.push('lob');
  if (keyHeld(KEY.cross)) out.push('cross');
  if (keyHeld(KEY.through)) out.push('through');
  if (keyHeld(KEY.sprint)) out.push('sprint');
  if (keyHeld(KEY.jockey)) out.push('jockey');
  if (keyHeld(KEY.switch)) out.push('switch');
  if (keyHeld(KEY.pause)) out.push('pause');
  return out;
}

export function controlHint(actions) {
  if (actions?.usingGamepad) {
    return 'LS move/aim · RT sprint · LT jockey · RB or RS switch · A pass · B shoot · Y through · X lob · LB driven pass / finesse shot';
  }
  return 'WASD · Shift sprint · Tab switch · E pass · Space shoot · Q lob · C cross · T through';
}
