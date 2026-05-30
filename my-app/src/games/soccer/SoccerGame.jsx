import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadStadiumGlb, getStadiumFog } from './stadiumGlb';
import { applyStadiumLighting, stadiumLightingMode } from './dayNight';
import { bindSoccerKeys, pollSoccerActions, controlHint } from './soccerInputActions';
import {
  createFifaCameraState,
  updateFifaCamera,
  movementFromCameraYaw,
  getCameraYaw,
  menuBroadcastCamera,
} from './fifaCamera';
import { createBallState, stepBall } from './ballPhysics';
import { updateBallPossession, isBallDribbling } from './ballPossession';
import { getPitchSurface } from './pitchSurface';
import { tryPlayerActions } from './playerActions';
import { createMatchState, awardSetPiece } from './matchRules';
import {
  setupSetPiece,
  tickMatchPhase,
  getMatchPhaseContext,
  isSetPiecePhase,
  syncThrowInBall,
} from './setPieces';
import { TEAM_HOME, TEAM_AWAY, MATCH_HALF_SEC, HALFTIME_SEC } from './pitchConstants';
import {
  createTeams,
  getControlled,
  movePlayer,
  integratePlayers,
  tryTouchBall,
  placePlayersForKickoff,
} from './players';
import { lerpFacing } from './playerKinematics';
import {
  createHumanoid,
  createMatchBall,
  createReferee,
  syncHumanoid,
  createPlayerIndicator,
  syncBallMesh,
} from './matchVisuals';
import {
  autoSwitchIfNeeded,
  switchControlTo,
  manualPlayerSwitch,
} from './switchPlayer';
import { applyPlayBoundsToTeams, rescaleTeamsToPlayBounds } from './playBounds';
import { whistleKickoff, whistleGoal, whistleFoul, whistleHalf } from './whistle';
import { tickAwaySoccerAI, tickHomeSoccerAI, resetSoccerAI } from './soccerAI';
import { anchorGoalkeepers } from './goalkeeperAI';
import { checkPlayBoundary, isBallOutOfPlay, maintainBallBounds } from './boundaryEnforcement';
import { lockFifaPlayBounds } from './playBounds';
import { frameMenuCamera, getPitchLookTarget } from './sceneFrame';
import { syncMatchVisuals, syncMatchVisualsStatic } from './matchVisualSync';
import { separatePlayers } from './playerSeparation';
import SoccerHud from './SoccerHud';
import InputDebugOverlay from './InputDebugOverlay';
import {
  createInputDebugState,
  isInputDebugDefaultOn,
  updateInputDebug,
} from './inputDebug';
import { tickMatchDirector } from './matchDirector';

/** Survives React Strict Mode remount so Kick off does not flicker back to “loading”. */
let pitchSceneReadyLatch = false;

export default function SoccerGame({ onExit }) {
  const containerRef = useRef(null);
  const phaseRef = useRef('menu');
  const matchRef = useRef(createMatchState());
  const ballRef = useRef(createBallState());
  const playersRef = useRef(createTeams());
  const inputPrevRef = useRef({});
  const lightingRef = useRef('day');
  const loadGenRef = useRef(0);
  const camStateRef = useRef(createFifaCameraState());

  const [phase, setPhase] = useState('menu');
  const [matchStarted, setMatchStarted] = useState(false);
  const [match, setMatch] = useState(createMatchState());
  const [hudTick, setHudTick] = useState(0);
  const [usingGamepad, setUsingGamepad] = useState(false);
  const [lightingMode, setLightingMode] = useState('day');
  const [stadiumReady, setStadiumReady] = useState(pitchSceneReadyLatch);
  const [loadError, setLoadError] = useState(null);
  const [showInputDebug, setShowInputDebug] = useState(isInputDebugDefaultOn);
  const [inputDebugSnap, setInputDebugSnap] = useState(null);

  const showInputDebugRef = useRef(showInputDebug);
  const inputDebugStateRef = useRef(createInputDebugState());
  const inputDebugPrevRef = useRef({});
  const inputDebugSnapRef = useRef(null);
  const syncMatchRef = useRef(() => {});
  const togglePauseRef = useRef(() => {});
  const startMatchRef = useRef(() => {});
  const stadiumReadyRef = useRef(pitchSceneReadyLatch);
  const matchStartedRef = useRef(false);
  const pitchLookRef = useRef({ x: 0, y: 0.5, z: 0 });

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    showInputDebugRef.current = showInputDebug;
  }, [showInputDebug]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setShowInputDebug((v) => !v);
        return;
      }
      if (matchStartedRef.current) return;
      if (e.code !== 'Enter') return;
      if (!stadiumReadyRef.current) return;
      e.preventDefault();
      startMatchRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!showInputDebug) {
      setInputDebugSnap(null);
      return undefined;
    }
    const id = setInterval(() => {
      const snap = inputDebugSnapRef.current;
      if (snap) setInputDebugSnap({ ...snap, log: [...(snap.log || [])] });
    }, 80);
    return () => clearInterval(id);
  }, [showInputDebug]);

  const syncMatch = useCallback(() => {
    setMatch({ ...matchRef.current });
    setHudTick((t) => t + 1);
  }, []);

  const startMatch = useCallback(() => {
    const initLighting = stadiumLightingMode();
    lightingRef.current = initLighting;
    setLightingMode(initLighting);
    matchRef.current = createMatchState();
    ballRef.current = createBallState();
    const players = playersRef.current;
    players.forEach((p) => {
      p.controlled = p.team === TEAM_HOME && p.id === 6;
      p.vx = 0;
      p.vy = 0;
    });
    placePlayersForKickoff(players, TEAM_HOME, ballRef.current, matchRef.current);
    matchRef.current.phase = 'kickoff';
    matchRef.current.phaseTimer = 2.5;
    matchRef.current.message = 'Kick off — press A / E';
    setupSetPiece(matchRef.current, ballRef.current, players);
    matchRef.current.clockSec = 0;
    syncMatch();
    setMatchStarted(true);
    matchStartedRef.current = true;
    setPhase('playing');
    phaseRef.current = 'playing';
    inputPrevRef.current = {};
    camStateRef.current = createFifaCameraState();
    resetSoccerAI();
    whistleKickoff();
  }, [syncMatch]);

  const togglePause = useCallback(() => {
    setPhase((p) => (p === 'paused' ? 'playing' : p === 'playing' ? 'paused' : p));
  }, []);

  syncMatchRef.current = syncMatch;
  togglePauseRef.current = togglePause;
  startMatchRef.current = startMatch;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (pitchSceneReadyLatch) {
      stadiumReadyRef.current = true;
      setStadiumReady(true);
    }

    const gen = ++loadGenRef.current;
    setLoadError(null);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6a9ec4);
    scene.fog = null;

    const camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.4,
      500
    );
    camera.position.set(0, 28, -42);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    const syncRendererSize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w < 8 || h < 8) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x6a9ec4, 1);
    renderer.domElement.className = 'scorpio-soccer__canvas';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);
    syncRendererSize();

    const unbindKeys = bindSoccerKeys(renderer.domElement);
    renderer.domElement.focus();

    const ambient = new THREE.AmbientLight(0xb8d4ff, 0.72);
    ambient.name = 'Stadium_Ambient';
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x1a3d12, 0.45);
    hemi.name = 'Stadium_Hemi';
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff5e8, 2.8);
    sun.name = 'Stadium_Sun';
    sun.position.set(50, 80, 30);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = false;
    scene.add(sun);
    scene.add(sun.target);

    const floods = new THREE.Group();
    floods.name = 'Floodlights';
    [[-48, 38, 48], [48, 38, 48], [48, 38, -48], [-48, 38, -48]].forEach(([x, y, z]) => {
      const spot = new THREE.SpotLight(0xfff0dd, 0, 200, Math.PI / 2.8, 0.55, 0.6);
      spot.position.set(x, y, z);
      spot.target.position.set(0, 0, 0);
      spot.castShadow = false;
      spot.userData.nightEnergy = 32;
      floods.add(spot);
      floods.add(spot.target);
      const fill = new THREE.PointLight(0xffe8cc, 0, 100);
      fill.position.set(x * 0.85, y * 0.7, z * 0.85);
      fill.userData.nightEnergy = 14;
      floods.add(fill);
    });
    scene.add(floods);
    applyStadiumLighting(scene, lightingRef.current);

    let ballMesh = null;
    const referee = createReferee();
    referee.userData.rx = 0;
    referee.userData.ry = 0;
    scene.add(referee);

    const playerIndicator = createPlayerIndicator();
    scene.add(playerIndicator);

    playersRef.current.forEach((p) => {
      const kit = p.team === TEAM_HOME ? 0x1a5fcc : 0xcc2222;
      const shorts = p.team === TEAM_HOME ? 0x0a2a6a : 0x8a1515;
      const group = createHumanoid({ kit, shorts, isGk: p.isGk, team: p.team });
      scene.add(group);
      p.mesh = group;
    });

    loadStadiumGlb(scene)
      .then(({ bounds, ballTemplate, fallback }) => {
        if (gen !== loadGenRef.current) return;
        console.info('[Scorpio Soccer] stadium ready', fallback ? '(built-in pitch)' : '(stadium.glb)');
        lockFifaPlayBounds();
        rescaleTeamsToPlayBounds(playersRef.current);
        applyPlayBoundsToTeams(playersRef.current);
        playersRef.current.forEach((p) => {
          if (p.isGk && p.mesh) {
            syncHumanoid(p.mesh, p.x, p.y, p.facing, false);
          }
        });
        placePlayersForKickoff(playersRef.current, matchRef.current.setPieceTeam, ballRef.current, matchRef.current);
        ballMesh = createMatchBall(ballTemplate);
        scene.add(ballMesh);
        playersRef.current.forEach((p) => {
          if (p.mesh) syncHumanoid(p.mesh, p.x, p.y, p.facing, p.controlled);
        });
        syncBallMesh(ballMesh, ballRef.current, 0);
        scene.background = new THREE.Color(0x6a9ec4);
        scene.fog = null;
        camera.far = getStadiumFog(bounds).cameraFar;
        camera.updateProjectionMatrix();
        frameMenuCamera(camera, scene);
        pitchLookRef.current = getPitchLookTarget(scene);
        syncRendererSize();
        pitchSceneReadyLatch = true;
        stadiumReadyRef.current = true;
        setStadiumReady(true);
        setLoadError(null);
        applyStadiumLighting(scene, lightingRef.current);
        renderer.render(scene, camera);
      })
      .catch((err) => {
        if (gen !== loadGenRef.current) return;
        console.error('[Scorpio Soccer] stadium load:', err);
        ballMesh = createMatchBall(null);
        scene.add(ballMesh);
        playersRef.current.forEach((p) => {
          if (p.mesh) syncHumanoid(p.mesh, p.x, p.y, p.facing, p.controlled);
        });
        syncBallMesh(ballMesh, ballRef.current, 0);
        lockFifaPlayBounds();
        rescaleTeamsToPlayBounds(playersRef.current);
        applyPlayBoundsToTeams(playersRef.current);
        placePlayersForKickoff(
          playersRef.current,
          matchRef.current.setPieceTeam,
          ballRef.current,
          matchRef.current
        );
        pitchSceneReadyLatch = true;
        stadiumReadyRef.current = true;
        setLoadError(null);
        setStadiumReady(true);
        scene.background = new THREE.Color(0x6a9ec4);
        scene.fog = null;
        frameMenuCamera(camera, scene);
        pitchLookRef.current = getPitchLookTarget(scene);
        syncRendererSize();
        applyStadiumLighting(scene, lightingRef.current);
        renderer.render(scene, camera);
      });

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => syncRendererSize())
        : null;
    resizeObserver?.observe(container);

    let messageTimer = 0;
    const clock = new THREE.Clock();
    let frameId;
    let hudInterval = null;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      try {
      const dt = Math.min(clock.getDelta(), 0.05);
      const currentPhase = phaseRef.current;

      if (!matchStartedRef.current || currentPhase === 'fulltime') {
        applyStadiumLighting(scene, lightingRef.current);
        menuBroadcastCamera(camera, dt, pitchLookRef.current);
        syncMatchVisualsStatic({
          players: playersRef.current,
          ball: ballRef.current,
          ballMesh,
          referee,
          playerIndicator,
          active: getControlled(playersRef.current, TEAM_HOME),
        });
        renderer.render(scene, camera);
        return;
      }

      applyStadiumLighting(scene, lightingRef.current);

      const m = matchRef.current;
      const ball = ballRef.current;
      if (m.restartLock > 0) {
        m.restartLock = Math.max(0, m.restartLock - dt);
        ball.vx = ball.vy = ball.vz = 0;
        ball.wx = ball.wy = ball.wz = 0;
      }

      if (currentPhase === 'paused') {
        syncMatchVisualsStatic({
          players: playersRef.current,
          ball: ballRef.current,
          ballMesh,
          referee,
          playerIndicator,
          active: getControlled(playersRef.current, TEAM_HOME),
        });
        renderer.render(scene, camera);
        return;
      }

      const players = playersRef.current;
      const actions = pollSoccerActions(inputPrevRef.current, m, players, ball);
      inputPrevRef.current = actions;
      if (actions.usingGamepad) setUsingGamepad(true);

      let frameActResult = false;
      let frameEvents = { goal: null, out: null };

      if (actions.pause) togglePauseRef.current();

      if (actions.tactic) {
        m.message = actions.tactic;
        messageTimer = 2;
        syncMatchRef.current();
      }

      let active = getControlled(players, TEAM_HOME);
      if (actions.switchPlayer || actions.switchPlayerDirection) {
        active =
          manualPlayerSwitch(
            players,
            TEAM_HOME,
            ball,
            actions.switchPlayerDirection
          ) || active;
      } else if (m.phase === 'play') {
        active =
          autoSwitchIfNeeded(players, TEAM_HOME, ball, m.passSwitchToId) || active;
      }

      const camYaw = getCameraYaw(camStateRef.current);
      const passAim = movementFromCameraYaw(camYaw, actions.moveX, actions.moveY);

      const phaseResumed = tickMatchPhase(m, ball, players, dt, actions, active, passAim);
      if (phaseResumed) syncMatchRef.current();
      const phaseCtx = getMatchPhaseContext(m);
      const canMove = phaseCtx.canMove;
      const canSimBall = phaseCtx.canSimulateBall;

      updateFifaCamera(camera, camStateRef.current, active, ball, dt, TEAM_HOME);

      if (active && canMove) {
        const world = passAim;
        movePlayer(active, world.x, world.y, actions.sprint, dt, true, {
          jockey: actions.jockey,
          lb: actions.lb,
          responsive: true,
          keepFacing: false,
        });
        const moveLen = Math.hypot(world.x, world.y);
        if (moveLen > 0.14) {
          lerpFacing(active, Math.atan2(world.y, world.x), dt, 16);
        } else if (
          actions.jockey ||
          (ball.possessionId === active.id && isBallDribbling(ball))
        ) {
          lerpFacing(active, Math.atan2(ball.y - active.y, ball.x - active.x), dt, 12);
        }
        if (m.phase === 'throw' && m.setPieceTeam === TEAM_HOME) {
          syncThrowInBall(m, ball, active);
        }
      }

      if (m.callForPassTimer > 0) {
        m.callForPassTimer = Math.max(0, m.callForPassTimer - dt);
        if (m.callForPassTimer <= 0) m.callForPassId = null;
      }

      if (
        active &&
        m.phase === 'play' &&
        actions.pass &&
        ball.possessionId !== active.id
      ) {
        const dBall = Math.hypot(active.x - ball.x, active.y - ball.y);
        if (dBall > 1.85) {
          m.callForPassId = active.id;
          m.callForPassTimer = 0.55;
        }
      }

      const ballBeforeTouch = { x: ball.x, y: ball.y, z: ball.z };

      const actResult =
        active &&
        m.phase === 'play' &&
        tryPlayerActions(active, ball, players, m, actions, passAim);
      frameActResult = actResult;

      if (canSimBall && m.restartLock <= 0 && m.phase === 'play') {
        if (!isBallDribbling(ball)) {
          tryTouchBall(players, ball);
          frameEvents = stepBall(
            ball,
            dt,
            ballBeforeTouch,
            getPitchSurface(lightingRef.current),
            m.lastTouchTeam
          );
          if (m.phase !== 'play' && frameEvents.goal != null) {
            frameEvents = { ...frameEvents, goal: null };
          }
        }
        const tackleResult = updateBallPossession(ball, players, m, dt);
        maintainBallBounds(ball);
        if (tackleResult === 'foul') {
          setupSetPiece(m, ball, players);
          whistleFoul();
          syncMatchRef.current();
        }
        if (m.passSwitchToId != null) {
          const recv = players.find((p) => p.id === m.passSwitchToId);
          if (recv) {
            const dRecv = Math.hypot(recv.x - ball.x, recv.y - ball.y);
            if (dRecv < 20) {
              active = switchControlTo(players, recv) || active;
            }
            if (
              dRecv < 2.5 ||
              ball.possessionId === recv.id ||
              (ball._kickCooldown <= 0 && dRecv < 5)
            ) {
              active = switchControlTo(players, recv) || active;
              m.passSwitchToId = null;
            }
          }
        }
      }

      if (m.phase === 'play') {
        tickMatchDirector(ball, players, m);
        anchorGoalkeepers(players, ball, dt);
        tickAwaySoccerAI(players, ball, m, dt);
        tickHomeSoccerAI(players, ball, m, dt);
      } else if (isSetPiecePhase(m.phase)) {
        anchorGoalkeepers(players, ball, dt);
      }

      separatePlayers(players);
      integratePlayers(players, dt);

      if (actResult === 'offside') {
        setupSetPiece(m, ball, players);
        whistleFoul();
        syncMatchRef.current();
      } else if (actResult === 'pass' || actResult === 'through') {
        const recv = players.find((p) => p.id === m.passSwitchToId);
        if (recv) active = switchControlTo(players, recv) || active;
        syncMatchRef.current();
      } else if (actResult) {
        syncMatchRef.current();
      }

      if (canSimBall && m.phase === 'play' && m.restartLock <= 0) {
        if (!frameEvents.goal && !frameEvents.out && isBallOutOfPlay(ball)) {
          const extra = checkPlayBoundary(ball, ballBeforeTouch, m);
          if (extra.out) frameEvents = extra;
          if (extra.goal != null) frameEvents = extra;
        }

        const eventsResolved = frameEvents;

        if (eventsResolved.goal !== null && m.phase === 'play') {
          if (eventsResolved.goal === TEAM_HOME) m.homeScore += 1;
          else m.awayScore += 1;
          m.phase = 'kickoff';
          m.restartLock = 3.5;
          m.setPieceTeam = eventsResolved.goal === TEAM_HOME ? TEAM_AWAY : TEAM_HOME;
          placePlayersForKickoff(players, m.setPieceTeam, ball, m);
          setupSetPiece(m, ball, players);
          m.message = `GOAL! ${m.homeScore} — ${m.awayScore} · press A / E to restart`;
          m.phaseTimer = 8;
          ball.vx = ball.vy = ball.vz = 0;
          ball.possessionId = null;
          messageTimer = 4;
          whistleGoal();
          syncMatchRef.current();
        } else if (eventsResolved.out && m.phase === 'play') {
          const team = m.lastTouchTeam === TEAM_HOME ? TEAM_AWAY : TEAM_HOME;
          awardSetPiece(m, eventsResolved.out, team, ball.x, ball.y);
          setupSetPiece(m, ball, players);
          ball.vx = ball.vy = 0;
          ball.possessionId = null;
          whistleFoul();
          syncMatchRef.current();
        }
      }

      if (m.phase === 'play') {
        m.clockSec += dt;
        if (m.half === 1 && m.clockSec >= MATCH_HALF_SEC) {
          m.half = 2;
          m.clockSec = MATCH_HALF_SEC;
          m.message = 'Half time — press A / E';
          m.phase = 'kickoff';
          m.phaseTimer = HALFTIME_SEC;
          m.setPieceTeam = TEAM_AWAY;
          placePlayersForKickoff(players, TEAM_AWAY, ball, m);
          setupSetPiece(m, ball, players);
          whistleHalf();
          syncMatchRef.current();
        } else if (m.half === 2 && m.clockSec >= MATCH_HALF_SEC * 2) {
          setPhase('fulltime');
          phaseRef.current = 'fulltime';
          whistleHalf();
          syncMatchRef.current();
        }
      }

      if (messageTimer > 0) {
        messageTimer -= dt;
        if (messageTimer <= 0) m.message = '';
      }

      if (ballMesh) syncBallMesh(ballMesh, ball, dt);

      if (showInputDebugRef.current && currentPhase !== 'menu') {
        const dbgCtx = {
          phase: m.phase,
          message: m.message,
          score: `${m.homeScore} — ${m.awayScore}`,
          ball: {
            x: ball.x.toFixed(1),
            y: ball.y.toFixed(1),
            z: ball.z.toFixed(2),
          },
          player: active
            ? { id: active.id, x: active.x.toFixed(1), y: active.y.toFixed(1) }
            : null,
          flags: {
            dribbling: isBallDribbling(ball),
            actResult: frameActResult || null,
            out: frameEvents.out || null,
            goal: frameEvents.goal,
          },
        };
        if (frameEvents.goal !== null) {
          dbgCtx.gameEvent = { type: 'GOAL', detail: frameEvents.goal === TEAM_HOME ? 'HOME' : 'AWAY' };
        } else if (frameEvents.out) {
          dbgCtx.gameEvent = { type: 'OUT', detail: frameEvents.out };
        }
        const snap = updateInputDebug(
          inputDebugStateRef.current,
          actions,
          dbgCtx,
          inputDebugPrevRef.current
        );
        inputDebugSnapRef.current = snap;
        inputDebugPrevRef.current = {
          pass: actions.pass,
          shoot: actions.shoot,
          through: actions.through,
          lob: actions.lob,
          cross: actions.cross,
          switchPlayer: actions.switchPlayer,
          tactic: actions.tactic,
        };
      }

      syncMatchVisuals({
        players,
        ball,
        ballMesh,
        referee,
        playerIndicator,
        active: getControlled(players, TEAM_HOME),
        dt,
      });

      renderer.render(scene, camera);
      } catch (err) {
        console.error('[Scorpio Soccer] frame error:', err);
      }
    };

    animate();
    hudInterval = setInterval(() => {
      if (phaseRef.current === 'playing') syncMatchRef.current();
    }, 250);

    const onResize = () => syncRendererSize();
    window.addEventListener('resize', onResize);

    return () => {
      loadGenRef.current += 1;
      clearInterval(hudInterval);
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      unbindKeys();
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((mat) => mat.dispose());
        }
      });
    };
  }, []);

  const handleStart = () => {
    if (!stadiumReadyRef.current) return;
    startMatch();
    containerRef.current?.querySelector('canvas')?.focus();
  };

  const actionsForHint = inputPrevRef.current;

  return (
    <div className="scorpio-soccer">
      <div
        className="scorpio-soccer__canvas-wrap"
        ref={containerRef}
        onMouseDown={(e) => e.currentTarget.querySelector('canvas')?.focus()}
      />
      <SoccerHud
        phase={phase}
        match={match}
        matchStarted={matchStarted}
        hudTick={hudTick}
        usingGamepad={usingGamepad}
        lightingMode={lightingMode}
        stadiumReady={stadiumReady}
        loadError={loadError}
        controlHintText={controlHint(actionsForHint)}
        showInputDebugHint
        onStart={handleStart}
        onExit={onExit}
        onPause={togglePause}
      />
      <InputDebugOverlay snapshot={inputDebugSnap} visible={showInputDebug && phase !== 'menu'} />
    </div>
  );
}
