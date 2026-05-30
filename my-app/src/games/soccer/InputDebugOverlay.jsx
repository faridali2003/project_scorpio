/** On-screen input viz for screen recordings — F3 or ?soccerDebug=1 */

function PadButton({ label, face, active, sub }) {
  return (
    <div
      className={`scorpio-soccer__dbg-btn scorpio-soccer__dbg-btn--${face} ${
        active ? 'scorpio-soccer__dbg-btn--on' : ''
      }`}
    >
      <span className="scorpio-soccer__dbg-btn-label">{label}</span>
      {sub ? <span className="scorpio-soccer__dbg-btn-sub">{sub}</span> : null}
    </div>
  );
}

function KeyCap({ label, active }) {
  return (
    <kbd className={`scorpio-soccer__dbg-key ${active ? 'scorpio-soccer__dbg-key--on' : ''}`}>
      {label}
    </kbd>
  );
}

export default function InputDebugOverlay({ snapshot, visible }) {
  if (!visible || !snapshot) return null;

  const b = snapshot.buttons || {};
  const ctx = snapshot.ctx || {};
  const flags = ctx.flags || {};

  return (
    <div className="scorpio-soccer__input-debug" aria-label="Input debug overlay">
      <div className="scorpio-soccer__dbg-header">
        <span className="scorpio-soccer__dbg-title">INPUT DEBUG</span>
        <span className="scorpio-soccer__dbg-mode">
          {snapshot.usingGamepad ? 'Gamepad' : 'Keyboard'}
        </span>
        <span className="scorpio-soccer__dbg-hint">F3 hide</span>
      </div>

      <div className="scorpio-soccer__dbg-body">
        <div className="scorpio-soccer__dbg-pad">
          <div className="scorpio-soccer__dbg-shoulder">
            <PadButton label="LB" face="bumper" active={b.lb} sub={b.driven ? 'driven' : ''} />
            <PadButton label="RB" face="bumper" active={b.rb || b.switch} sub="switch" />
          </div>
          <div className="scorpio-soccer__dbg-triggers">
            <div className={`scorpio-soccer__dbg-trigger ${b.jockey ? 'scorpio-soccer__dbg-trigger--on' : ''}`}>
              LT
            </div>
            <div className={`scorpio-soccer__dbg-trigger ${b.sprint ? 'scorpio-soccer__dbg-trigger--on' : ''}`}>
              RT
            </div>
          </div>
          <div className="scorpio-soccer__dbg-face">
            <PadButton label="Y" face="y" active={b.through} sub="through" />
            <div className="scorpio-soccer__dbg-face-mid">
              <PadButton label="X" face="x" active={b.lob || b.cross} sub={b.cross ? 'cross' : 'lob'} />
              <div className="scorpio-soccer__dbg-stick">
                <div
                  className="scorpio-soccer__dbg-stick-base"
                  title={snapshot.stickAngle != null ? `${snapshot.stickAngle}°` : 'neutral'}
                >
                  <div
                    className="scorpio-soccer__dbg-stick-dot"
                    style={{
                      left: `${50 + snapshot.moveX * 38}%`,
                      top: `${50 - snapshot.moveY * 38}%`,
                    }}
                  />
                </div>
                <span className="scorpio-soccer__dbg-stick-label">LS</span>
              </div>
              <PadButton label="B" face="b" active={b.shoot} sub={b.finesse ? 'finesse' : 'shoot'} />
            </div>
            <PadButton label="A" face="a" active={b.pass} sub="pass" />
          </div>
        </div>

        <div className="scorpio-soccer__dbg-keys">
          <div className="scorpio-soccer__dbg-keys-row">
            <KeyCap label="W" active={snapshot.heldKeys?.includes('up')} />
          </div>
          <div className="scorpio-soccer__dbg-keys-row">
            <KeyCap label="A" active={snapshot.heldKeys?.includes('left')} />
            <KeyCap label="S" active={snapshot.heldKeys?.includes('down')} />
            <KeyCap label="D" active={snapshot.heldKeys?.includes('right')} />
          </div>
          <div className="scorpio-soccer__dbg-keys-row scorpio-soccer__dbg-keys-row--actions">
            <KeyCap label="E" active={snapshot.heldKeys?.includes('pass')} />
            <KeyCap label="Space" active={snapshot.heldKeys?.includes('shoot')} />
            <KeyCap label="Shift" active={snapshot.heldKeys?.includes('sprint')} />
            <KeyCap label="Tab" active={snapshot.heldKeys?.includes('switch')} />
          </div>
        </div>

        <div className="scorpio-soccer__dbg-state">
          <div>
            <strong>Phase</strong> {ctx.phase || '—'}
            {ctx.message ? ` · ${ctx.message}` : ''}
          </div>
          <div>
            <strong>Score</strong> {ctx.score || '0 — 0'}
          </div>
          {ctx.ball && (
            <div>
              <strong>Ball</strong> ({ctx.ball.x}, {ctx.ball.y}) z={ctx.ball.z}
              {flags.dribbling ? ' · dribble' : ''}
            </div>
          )}
          {ctx.player && (
            <div>
              <strong>Player #{ctx.player.id}</strong> ({ctx.player.x}, {ctx.player.y})
            </div>
          )}
          <div className="scorpio-soccer__dbg-flags">
            {flags.actResult ? <span className="scorpio-soccer__dbg-pill">{flags.actResult}</span> : null}
            {flags.out ? <span className="scorpio-soccer__dbg-pill scorpio-soccer__dbg-pill--warn">{flags.out}</span> : null}
            {flags.goal != null ? (
              <span className="scorpio-soccer__dbg-pill scorpio-soccer__dbg-pill--goal">GOAL</span>
            ) : null}
          </div>
        </div>

        <div className="scorpio-soccer__dbg-log">
          <div className="scorpio-soccer__dbg-log-title">Press log (newest first)</div>
          <ul>
            {(snapshot.log || []).map((row, i) => (
              <li key={`${row.t}-${row.label}-${i}`}>
                <span className="scorpio-soccer__dbg-log-t">{row.t}s</span>
                <span className="scorpio-soccer__dbg-log-label">{row.label}</span>
                {row.detail ? (
                  <span className="scorpio-soccer__dbg-log-detail">{row.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
