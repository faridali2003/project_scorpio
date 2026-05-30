import { getHeldKeyLabels } from './soccerInputActions';

const LOG_MAX = 28;

export function isInputDebugDefaultOn() {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  return q.get('soccerDebug') === '1' || q.get('debugInput') === '1';
}

export function createInputDebugState() {
  return {
    log: [],
    lastActions: null,
  };
}

function stampSec() {
  return (performance.now() / 1000).toFixed(2);
}

function pushLog(state, label, detail = '') {
  state.log.unshift({ t: stampSec(), label, detail });
  if (state.log.length > LOG_MAX) state.log.pop();
}

/** Record button edges + build HUD snapshot (call once per frame after pollSoccerActions). */
export function updateInputDebug(state, actions, ctx, prevActions) {
  if (!state) return null;

  const edge = (key, label, detail = '') => {
    if (actions[key] && !prevActions?.[key]) pushLog(state, label, detail);
  };

  edge('pass', 'PASS', actions.driven ? 'LB + pass (driven)' : 'A / E');
  edge('shoot', 'SHOOT', actions.finesse ? 'LB + shoot (finesse)' : 'B / Space');
  edge('through', 'THROUGH', 'Y / T');
  edge('lob', 'LOB', 'X / Q');
  edge('cross', 'CROSS', 'X+LB / C');
  edge('switchPlayer', 'SWITCH', 'RB / Tab');
  edge('pause', 'PAUSE', 'Menu / Esc');

  if (actions.tactic && actions.tactic !== prevActions?.tactic) {
    pushLog(state, 'TACTIC', actions.tactic);
  }

  if (ctx?.gameEvent) {
    pushLog(state, ctx.gameEvent.type, ctx.gameEvent.detail || '');
  }

  state.lastActions = {
    pass: actions.pass,
    shoot: actions.shoot,
    through: actions.through,
    lob: actions.lob,
    cross: actions.cross,
    switchPlayer: actions.switchPlayer,
  };

  return buildInputDebugSnapshot(actions, ctx, state.log);
}

export function buildInputDebugSnapshot(actions, ctx, log) {
  const stickLen = Math.hypot(actions.moveX ?? 0, actions.moveY ?? 0);
  const stickAngle =
    stickLen > 0.08 ? Math.round((Math.atan2(actions.moveY, actions.moveX) * 180) / Math.PI) : null;

  return {
    usingGamepad: Boolean(actions.usingGamepad),
    moveX: Number((actions.moveX ?? 0).toFixed(2)),
    moveY: Number((actions.moveY ?? 0).toFixed(2)),
    stickLen: Number(stickLen.toFixed(2)),
    stickAngle,
    buttons: {
      pass: actions.pass,
      shoot: actions.shoot,
      through: actions.through,
      lob: actions.lob,
      cross: actions.cross,
      switch: actions.switchPlayer,
      sprint: actions.sprint,
      jockey: actions.jockey,
      lb: actions.lb,
      rb: actions.rb,
      driven: actions.driven,
      finesse: actions.finesse,
    },
    heldKeys: getHeldKeyLabels(),
    log: log ? [...log] : [],
    ctx: ctx
      ? {
          phase: ctx.phase,
          message: ctx.message,
          score: ctx.score,
          ball: ctx.ball,
          player: ctx.player,
          flags: ctx.flags,
        }
      : null,
  };
}
