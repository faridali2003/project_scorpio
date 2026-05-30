import { formatClock } from './matchRules';

export default function SoccerHud({
  phase,
  match,
  matchStarted,
  hudTick,
  usingGamepad,
  lightingMode,
  stadiumReady = true,
  loadError = null,
  controlHintText = '',
  showInputDebugHint = false,
  onStart,
  onExit,
  onPause,
}) {
  const playing = phase === 'playing' || phase === 'paused';
  const showPreMatch = !matchStarted;
  void hudTick;

  return (
    <div className="scorpio-soccer__hud">
      {showPreMatch && (
        <div className="scorpio-soccer__menu-bar">
          <button
            type="button"
            className="btn btn-primary btn-lg scorpio-soccer__kickoff-btn"
            onClick={onStart}
          >
            Kick off
          </button>
          {onExit ? (
            <button type="button" className="btn btn-secondary" onClick={onExit}>
              Back to store
            </button>
          ) : null}
          <span className="scorpio-soccer__menu-bar-hint">
            {stadiumReady
              ? 'Enter · gamepad A · click above'
              : 'Pitch loading in background — you can still start'}
          </span>
        </div>
      )}

      {showPreMatch && (
        <div className="scorpio-soccer__menu">
          <div className="scorpio-soccer__menu-panel">
            <h1>Scorpio Soccer</h1>
            <p>7v7 · press Kick off above to play</p>
            {showInputDebugHint ? (
              <p className="scorpio-soccer__menu-sub scorpio-soccer__menu-debug">
                QA: press <strong>F3</strong> for input overlay · <strong>?soccerDebug=1</strong>
              </p>
            ) : null}
            <details className="scorpio-soccer__controls-details">
              <summary>Controls</summary>
              <div className="scorpio-soccer__controls-guide">
                <ul>
                  <li><strong>WASD / LS</strong> Move</li>
                  <li><strong>E / A</strong> Pass · <strong>Space / B</strong> Shoot</li>
                  <li><strong>Shift / RT</strong> Sprint · <strong>Tab / RB</strong> Switch</li>
                </ul>
              </div>
            </details>
            {loadError ? (
              <p className="scorpio-soccer__menu-error">Note: {loadError}</p>
            ) : null}
          </div>
        </div>
      )}

      {playing && (
        <>
          <div className="scorpio-soccer__scoreboard">
            <span className="scorpio-soccer__team scorpio-soccer__team--home">HOME</span>
            <span className="scorpio-soccer__score">
              {match.homeScore} — {match.awayScore}
            </span>
            <span className="scorpio-soccer__team scorpio-soccer__team--away">AWAY</span>
          </div>
          <div className="scorpio-soccer__match-bar">
            <span className="scorpio-soccer__clock">
              {formatClock(match.clockSec)} · {match.half === 1 ? '1st half' : '2nd half'}
            </span>
            <span
              className={`scorpio-soccer__possession ${
                match.homeInPossession
                  ? 'scorpio-soccer__possession--attack'
                  : match.awayInPossession
                    ? 'scorpio-soccer__possession--defend'
                    : ''
              }`}
            >
              {match.homeInPossession ? 'HOME ball' : match.awayInPossession ? 'AWAY ball' : 'Loose ball'}
            </span>
            <span className={`scorpio-soccer__light scorpio-soccer__light--${lightingMode}`}>
              {lightingMode === 'night' ? 'Night' : 'Day'}
            </span>
          </div>
          {(match.message || match.phase !== 'play') && (
            <div
              key={match.message || match.phase}
              className="scorpio-soccer__banner"
            >
              {match.message || match.phase.replace(/_/g, ' ')}
              {match.phaseTimer > 0 && match.phase !== 'play'
                ? ` (${Math.ceil(match.phaseTimer)}s)`
                : ''}
            </div>
          )}
          <div className="scorpio-soccer__hint">{controlHintText}</div>
        </>
      )}

      {phase === 'paused' && (
        <div className="scorpio-soccer__menu scorpio-soccer__menu--overlay">
          <div className="scorpio-soccer__menu-panel">
            <h2>Paused</h2>
            <div className="scorpio-soccer__menu-actions">
              <button type="button" className="btn btn-primary" onClick={onPause}>
                Resume
              </button>
              {onExit ? (
                <button type="button" className="btn btn-secondary" onClick={onExit}>
                  Quit
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {phase === 'fulltime' && (
        <div className="scorpio-soccer__menu scorpio-soccer__menu--overlay">
          <div className="scorpio-soccer__menu-panel">
            <h2>Full time</h2>
            <p className="scorpio-soccer__final">
              {match.homeScore} — {match.awayScore}
            </p>
            <div className="scorpio-soccer__menu-actions">
              <button type="button" className="btn btn-primary" onClick={onStart}>
                Rematch
              </button>
              {onExit ? (
                <button type="button" className="btn btn-secondary" onClick={onExit}>
                  Back to store
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
