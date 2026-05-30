import { DEFAULT_GAME_SETTINGS, saveGameSettings } from './gameSettings';

export default function GameSettingsPanel({ settings, onChange, onClose, onResume }) {
  const patch = (key, value) => {
    const next = { ...settings, [key]: value };
    onChange(next);
    saveGameSettings(next);
  };

  const reset = () => {
    onChange({ ...DEFAULT_GAME_SETTINGS });
    saveGameSettings(DEFAULT_GAME_SETTINGS);
  };

  return (
    <div className="speedrun-shooter__settings-backdrop" role="dialog" aria-label="Game settings">
      <div className="speedrun-shooter__settings">
        <div className="speedrun-shooter__settings-header">
          <h2>Settings</h2>
          <button type="button" className="speedrun-shooter__settings-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <label className="speedrun-shooter__settings-row">
          <span>Mouse sensitivity</span>
          <input
            type="range"
            min="0.25"
            max="2.5"
            step="0.05"
            value={settings.lookSensitivity}
            onChange={(e) => patch('lookSensitivity', parseFloat(e.target.value))}
          />
          <span className="speedrun-shooter__settings-value">{settings.lookSensitivity.toFixed(2)}</span>
        </label>

        <label className="speedrun-shooter__settings-row speedrun-shooter__settings-row--check">
          <span>Invert Y axis</span>
          <input
            type="checkbox"
            checked={settings.invertY}
            onChange={(e) => patch('invertY', e.target.checked)}
          />
        </label>

        <label className="speedrun-shooter__settings-row">
          <span>Field of view</span>
          <input
            type="range"
            min="60"
            max="100"
            step="1"
            value={settings.fov}
            onChange={(e) => patch('fov', parseInt(e.target.value, 10))}
          />
          <span className="speedrun-shooter__settings-value">{settings.fov}°</span>
        </label>

        <label className="speedrun-shooter__settings-row">
          <span>Move speed</span>
          <input
            type="range"
            min="0.7"
            max="1.3"
            step="0.05"
            value={settings.moveSpeed}
            onChange={(e) => patch('moveSpeed', parseFloat(e.target.value))}
          />
          <span className="speedrun-shooter__settings-value">{settings.moveSpeed.toFixed(2)}×</span>
        </label>

        <label className="speedrun-shooter__settings-row">
          <span>Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={(e) => patch('volume', parseFloat(e.target.value))}
          />
          <span className="speedrun-shooter__settings-value">{Math.round(settings.volume * 100)}%</span>
        </label>

        <label className="speedrun-shooter__settings-row speedrun-shooter__settings-row--check">
          <span>Show crosshair</span>
          <input
            type="checkbox"
            checked={settings.showCrosshair}
            onChange={(e) => patch('showCrosshair', e.target.checked)}
          />
        </label>

        <p className="speedrun-shooter__settings-note">
          Replace GLTF files in <code>public/games/speedrun-shooter/</code> with your Blender exports
          (same names or edit <code>assets.js</code>).
        </p>

        <div className="speedrun-shooter__settings-actions">
          <button type="button" className="btn btn-secondary" onClick={reset}>
            Reset defaults
          </button>
          {onResume ? (
            <button type="button" className="btn btn-primary" onClick={onResume}>
              Resume game
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
