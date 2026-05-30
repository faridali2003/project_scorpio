import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createArena, createArenaLights, getSpawnPosition, setRuntimeBounds } from './arena';
import { loadCafeArena, getCafeFogSettings } from './cafeArena';
import { createPlayerControls } from './playerControls';
import { setCollisionMeshes, clearCollisionMeshes } from './collision';
import {
  disposeEnemies,
  disposeEnemyTemplate,
  loadEnemyTemplate,
  setSpawnDifficulty,
  spawnInitialEnemies,
  ensureActiveTargets,
  updateEnemies,
} from './enemies';
import { createShooting } from './shooting';
import { loadViewModel } from './viewModel';
import {
  DEFAULT_DIFFICULTY_ID,
  DIFFICULTY_LIST,
  getDifficulty,
} from './difficulties';
import { loadGameSettings } from './gameSettings';
import GameHud from './GameHud';
import GameSettingsPanel from './GameSettingsPanel';
import './speedrun-shooter.css';

/**
 * Scorpio speedrun shooter — Level 1: 10 kills in 30 seconds.
 * @param {{ onExit?: () => void }} props
 */
export default function SpeedrunShooter({ onExit }) {
  const containerRef = useRef(null);
  const lockRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const killsRef = useRef(0);
  const phaseRef = useRef('menu');
  const settingsRef = useRef(loadGameSettings());
  const settingsOpenRef = useRef(false);
  const difficultyRef = useRef(getDifficulty(DEFAULT_DIFFICULTY_ID));

  const [sessionKey, setSessionKey] = useState(0);
  const [settings, setSettings] = useState(() => loadGameSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [difficultyId, setDifficultyId] = useState(DEFAULT_DIFFICULTY_ID);
  const [locked, setLocked] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [phase, setPhase] = useState('menu');
  const [timeLeft, setTimeLeft] = useState(() => {
    const d = getDifficulty(DEFAULT_DIFFICULTY_ID);
    return d.noTimeLimit ? null : d.timeSeconds;
  });
  const [kills, setKills] = useState(0);

  const difficulty = getDifficulty(difficultyId);

  useEffect(() => {
    difficultyRef.current = getDifficulty(difficultyId);
    setSpawnDifficulty(difficultyId);
  }, [difficultyId]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    settingsOpenRef.current = settingsOpen;
  }, [settingsOpen]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    cam.fov = settings.fov;
    cam.updateProjectionMatrix();
  }, [settings.fov, sessionKey]);

  const openSettings = useCallback(() => {
    controlsRef.current?.unlock?.();
    setLocked(false);
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const resumeFromSettings = useCallback(() => {
    setSettingsOpen(false);
    if (phaseRef.current === 'playing' && assetsReady) {
      lockRef.current?.();
    }
  }, [assetsReady]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        if (phaseRef.current === 'won' || phaseRef.current === 'lost') return;
        if (settingsOpen) closeSettings();
        else openSettings();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, openSettings, closeSettings]);

  const getSettings = useCallback(() => settingsRef.current, []);

  const handleKill = useCallback((total) => {
    killsRef.current = total;
    setKills(total);
    const diff = difficultyRef.current;
    if (!diff.noWinLimit && total >= diff.targetKills) {
      setPhase('won');
      setSettingsOpen(false);
      controlsRef.current?.unlock?.();
      setLocked(false);
    }
  }, []);

  const restart = useCallback(() => {
    controlsRef.current?.unlock?.();
    setLocked(false);
    setSettingsOpen(false);
    setPhase('menu');
    setTimeLeft(difficultyRef.current.noTimeLimit ? null : difficultyRef.current.timeSeconds);
    killsRef.current = 0;
    setKills(0);
    setAssetsReady(false);
    setSessionKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    if (difficultyRef.current.noTimeLimit || timeLeft === null) return undefined;
    if (timeLeft <= 0) return undefined;

    const id = window.setInterval(() => {
      if (settingsOpenRef.current) return;
      setTimeLeft((t) => {
        if (t <= 1) {
          if (killsRef.current < difficultyRef.current.targetKills) {
            setPhase('lost');
            setSettingsOpen(false);
            controlsRef.current?.unlock?.();
            setLocked(false);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [phase, sessionKey]);

  useEffect(() => {
    if (locked && phase === 'menu' && assetsReady && !settingsOpen) {
      setPhase('playing');
      setTimeLeft(difficultyRef.current.noTimeLimit ? null : difficultyRef.current.timeSeconds);
      killsRef.current = 0;
      setKills(0);
    }
  }, [locked, phase, assetsReady, settingsOpen]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x151522);
    scene.fog = new THREE.Fog(0x151522, 28, 75);

    const camera = new THREE.PerspectiveCamera(
      settingsRef.current.fov,
      container.clientWidth / container.clientHeight,
      0.08,
      200
    );
    cameraRef.current = camera;
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.className = 'speedrun-shooter__canvas';

    let cafeMap = null;
    let player = null;
    let viewModel = null;
    let shooting = null;
    const enemies = [];
    let cancelled = false;

    const bootstrap = async () => {
      try {
        cafeMap = await loadCafeArena(scene);
        setCollisionMeshes(cafeMap.root);
        const fog = getCafeFogSettings(cafeMap.bounds);
        scene.background = new THREE.Color(fog.color);
        scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
        camera.far = fog.cameraFar;
        camera.updateProjectionMatrix();
      } catch (err) {
        console.warn('Cafe map failed, using default arena:', err);
        const arenaGroup = createArena(scene);
        setCollisionMeshes(arenaGroup);
      }

      if (cancelled) return;

      camera.position.copy(getSpawnPosition());

      const lights = createArenaLights(scene, { cafe: Boolean(cafeMap) });
      lights.directional.target.position.set(0, 0, 0);
      scene.add(lights.directional.target);

      player = createPlayerControls(camera, renderer.domElement, setLocked, getSettings);
      lockRef.current = player.lock;
      controlsRef.current = player.controls;

      try {
        const [vm] = await Promise.all([loadViewModel(camera), loadEnemyTemplate()]);
        if (cancelled) {
          vm.dispose();
          return;
        }
        viewModel = vm;
        setSpawnDifficulty(difficultyRef.current.id);
        enemies.push(...spawnInitialEnemies(scene, difficultyRef.current));
        ensureActiveTargets(scene, enemies, difficultyRef.current, 0);
        shooting = createShooting({
          camera,
          scene,
          domElement: renderer.domElement,
          enemies,
          isLocked: () => player.controls.isLocked,
          isEnabled: () => phaseRef.current === 'playing',
          getKills: () => killsRef.current,
          getDifficulty: () => difficultyRef.current,
          onKill: handleKill,
          getVolume: () => settingsRef.current.volume,
        });
        setAssetsReady(true);
      } catch (err) {
        console.error('SpeedrunShooter assets failed:', err);
      }
    };

    bootstrap();

    const clock = new THREE.Clock();
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      if (player && phaseRef.current === 'playing' && !settingsOpenRef.current) {
        player.update(delta);
        updateEnemies(enemies, delta);
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      shooting?.dispose();
      player?.dispose();
      lockRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
      viewModel?.dispose();
      disposeEnemies(enemies);
      disposeEnemyTemplate();
      setRuntimeBounds(null);
      clearCollisionMeshes();
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [sessionKey, handleKill, getSettings]);

  return (
    <div className="speedrun-shooter" ref={containerRef}>
      {phase === 'menu' && !locked && !settingsOpen && (
        <div className="speedrun-shooter__overlay-panel">
          <span className="speedrun-shooter__overlay-title">Scorpio Aim Trainer</span>
          <span className="speedrun-shooter__overlay-sub">
            {assetsReady ? 'Cafe arena — choose difficulty' : 'Loading cafe map…'}
          </span>
          <div className="speedrun-shooter__difficulty-row">
            {DIFFICULTY_LIST.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`speedrun-shooter__diff-btn${difficultyId === d.id ? ' active' : ''}`}
                onClick={() => setDifficultyId(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="speedrun-shooter__diff-desc">{difficulty.description}</p>
          <p className="speedrun-shooter__overlay-keys">
            {difficulty.noTimeLimit
              ? 'No timer · endless practice'
              : `${difficulty.targetKills} targets · ${difficulty.timeSeconds}s`}{' '}
            · {difficulty.activeTargets} on screen
          </p>
          <button
            type="button"
            className="speedrun-shooter__play-btn"
            onClick={() => lockRef.current?.()}
            disabled={!assetsReady}
          >
            Click to play
          </button>
        </div>
      )}

      {assetsReady && !settingsOpen && (
        <button
          type="button"
          className="speedrun-shooter__gear"
          onClick={openSettings}
          title="Settings (Tab)"
          aria-label="Settings"
        >
          ⚙
        </button>
      )}

      {settingsOpen && (
        <GameSettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={closeSettings}
          onResume={phase === 'playing' ? resumeFromSettings : undefined}
        />
      )}

      <GameHud
        phase={phase}
        timeLeft={timeLeft}
        kills={kills}
        targetKills={difficulty.targetKills}
        timeLimit={difficulty.timeSeconds}
        noTimeLimit={difficulty.noTimeLimit}
        noWinLimit={difficulty.noWinLimit}
        difficultyLabel={difficulty.label}
        locked={locked}
        assetsReady={assetsReady}
        showCrosshair={settings.showCrosshair}
        onRestart={restart}
        onExit={onExit}
      />

      {onExit && phase === 'menu' && !locked && !settingsOpen && (
        <button type="button" className="speedrun-shooter__quit" onClick={onExit}>
          ← Back to Scorpio
        </button>
      )}

      {phase === 'playing' && locked && !settingsOpen && (
        <p className="speedrun-shooter__hint">
          {difficulty.label} — WASD move · Space jump · Ctrl crouch · Tab settings
        </p>
      )}
    </div>
  );
}
