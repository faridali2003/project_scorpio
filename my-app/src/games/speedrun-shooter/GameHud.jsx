export default function GameHud({
  phase,
  timeLeft,
  kills,
  targetKills,
  timeLimit,
  noTimeLimit = false,
  noWinLimit = false,
  difficultyLabel,
  locked,
  assetsReady,
  onRestart,
  onExit,
  showCrosshair = true,
}) {
  const showCrosshairUi = showCrosshair && locked && assetsReady && phase === 'playing';
  const showStats = assetsReady && (phase === 'playing' || phase === 'won' || phase === 'lost');

  return (
    <>
      {showStats && (
        <div className="speedrun-shooter__stats">
          <div className="speedrun-shooter__stat">
            <span className="speedrun-shooter__stat-label">Time</span>
            <span
              className={`speedrun-shooter__stat-value${timeLeft <= 10 ? ' speedrun-shooter__stat-value--warn' : ''}`}
            >
              {noTimeLimit ? '∞' : phase === 'playing' ? `${timeLeft}s` : '0s'}
            </span>
          </div>
          <div className="speedrun-shooter__stat">
            <span className="speedrun-shooter__stat-label">Kills</span>
            <span className="speedrun-shooter__stat-value speedrun-shooter__stat-value--accent">
              {noWinLimit ? kills : `${kills}/${targetKills}`}
            </span>
          </div>
          {difficultyLabel && (
            <div className="speedrun-shooter__stat">
              <span className="speedrun-shooter__stat-label">Mode</span>
              <span className="speedrun-shooter__stat-value">{difficultyLabel}</span>
            </div>
          )}
        </div>
      )}

      {showCrosshairUi && (
        <div className="speedrun-shooter__crosshair" aria-hidden="true">
          <span className="speedrun-shooter__crosshair-line speedrun-shooter__crosshair-line--top" />
          <span className="speedrun-shooter__crosshair-line speedrun-shooter__crosshair-line--bottom" />
          <span className="speedrun-shooter__crosshair-line speedrun-shooter__crosshair-line--left" />
          <span className="speedrun-shooter__crosshair-line speedrun-shooter__crosshair-line--right" />
          <span className="speedrun-shooter__crosshair-dot" />
        </div>
      )}

      {phase === 'won' && (
        <div className="speedrun-shooter__end">
          <div className="speedrun-shooter__end-card speedrun-shooter__end-card--win">
            <h2>Level cleared</h2>
            <p>
              {kills} targets cleared in {timeLimit}s ({difficultyLabel}).
            </p>
            <div className="speedrun-shooter__end-actions">
              <button type="button" className="btn btn-primary" onClick={onRestart}>
                Play again
              </button>
              {onExit ? (
                <button type="button" className="btn btn-secondary" onClick={onExit}>
                  Back to Scorpio
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {phase === 'lost' && (
        <div className="speedrun-shooter__end">
          <div className="speedrun-shooter__end-card speedrun-shooter__end-card--lose">
            <h2>Game over</h2>
            <p>
              You got {kills}/{targetKills} kills. Need {targetKills} in {timeLimit}s ({difficultyLabel}
              ).
            </p>
            <div className="speedrun-shooter__end-actions">
              <button type="button" className="btn btn-primary" onClick={onRestart}>
                Try again
              </button>
              {onExit ? (
                <button type="button" className="btn btn-secondary" onClick={onExit}>
                  Back to Scorpio
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
