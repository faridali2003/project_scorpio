import { useEffect, useLayoutEffect, useRef } from 'react';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const TEXT_FIELDS = new Set(['email', 'username', 'security']);
const PW_FIELDS = new Set(['password', 'newPassword']);

const CHAR_PROFILE = [
  { tx: 12, skew: 5, faceX: 8, faceY: -2 },
  { tx: 10, skew: 6, faceX: 7, faceY: -2 },
  { tx: 14, skew: 6, faceX: 10, faceY: -12 },
  { tx: 8, skew: 4, faceX: 5, faceY: -2 },
];

/** Wrong-password poses matched to reference video (each character differs). */
const FAIL_POSE = [
  { skew: -15, tx: -13, faceX: -6, faceY: 5 },
  { skew: 12, tx: 9, faceX: 5, faceY: 4 },
  { skew: -24, tx: -24, faceX: -9, faceY: 7 },
  { skew: 18, tx: 20, faceX: 11, faceY: 3 },
];

const FAIL_SHOCK_MS = 2600;
const FAIL_HEADNO_MS = 1700;
const SUCCESS_MS = 2600;

function CharBody({ idx, className, eyes, bodyRefs, faceRefs, mouthRefs }) {
  return (
    <div ref={(el) => { bodyRefs.current[idx] = el; }} className={`auth-char-body ${className}`} data-mood="idle">
      <div ref={(el) => { faceRefs.current[idx] = el; }} className="auth-char-face">
        {eyes}
        <div ref={(el) => { mouthRefs.current[idx] = el; }} className="auth-char-mouth" aria-hidden />
      </div>
    </div>
  );
}

function Eyes({ size = 'normal', pupilRefs, eyeRefs, startIndex }) {
  const sizeClass = size === 'small' ? 'auth-eyes--small' : size === 'tiny' ? 'auth-eyes--tiny' : '';
  const eyeSizeClass = size === 'small' ? 'auth-eye--small' : size === 'tiny' ? 'auth-eye--tiny' : '';
  const pupilSizeClass = size === 'small' ? 'auth-pupil--small' : size === 'tiny' ? 'auth-pupil--tiny' : '';

  return (
    <div className={`auth-eyes ${sizeClass}`.trim()}>
      {[0, 1].map((i) => {
        const idx = startIndex + i;
        return (
          <div
            key={idx}
            ref={(el) => { eyeRefs.current[idx] = el; }}
            className={`auth-eye ${eyeSizeClass}`.trim()}
          >
            <div
              ref={(el) => { pupilRefs.current[idx] = el; }}
              className={`auth-pupil ${pupilSizeClass}`.trim()}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function AuthCharacters({
  activeField,
  passwordFocused,
  isTypingPassword,
  showPassword,
  passwordLength,
  focusPoint,
  loginFailedKey = 0,
  loginSuccessKey = 0,
  failUntilRef,
  successUntilRef,
}) {
  const pupilRefs = useRef([]);
  const eyeRefs = useRef([]);
  const bodyRefs = useRef([]);
  const faceRefs = useRef([]);
  const mouthRefs = useRef([]);

  const stateRef = useRef({
    activeField,
    passwordFocused,
    showPassword,
    passwordLength,
    focusPoint,
  });

  const mouseRef = useRef({ x: window.innerWidth * 0.3, y: window.innerHeight * 0.5 });
  const gossipUntilRef = useRef(0);
  const purplePeekUntilRef = useRef(0);
  const peekTimerRef = useRef(null);
  const fieldChangedAtRef = useRef(0);
  const bodyAnimRef = useRef([]);
  const pupilAnimRef = useRef([]);
  const moodRef = useRef([]);
  const failEndRef = useRef(0);
  const failShockEndRef = useRef(0);
  const lastFailKeyRef = useRef(0);
  const successEndRef = useRef(0);
  const lastSuccessKeyRef = useRef(0);
  const failUntilRefProp = useRef(failUntilRef);
  const successUntilRefProp = useRef(successUntilRef);
  failUntilRefProp.current = failUntilRef;
  successUntilRefProp.current = successUntilRef;

  useLayoutEffect(() => {
    const prev = stateRef.current.activeField;
    if (prev !== activeField) fieldChangedAtRef.current = performance.now();
    stateRef.current = {
      activeField,
      passwordFocused,
      showPassword,
      passwordLength,
      focusPoint,
    };
  }, [activeField, passwordFocused, showPassword, passwordLength, focusPoint]);

  useEffect(() => {
    if (isTypingPassword) gossipUntilRef.current = performance.now() + 900;
  }, [isTypingPassword]);

  useLayoutEffect(() => {
    if (loginFailedKey > lastFailKeyRef.current) {
      lastFailKeyRef.current = loginFailedKey;
      const now = performance.now();
      const shockEnd = now + FAIL_SHOCK_MS;
      const sequenceEnd = now + FAIL_SHOCK_MS + FAIL_HEADNO_MS;
      failShockEndRef.current = shockEnd;
      failEndRef.current = sequenceEnd;
      if (failUntilRef) failUntilRef.current = sequenceEnd;
    }
  }, [loginFailedKey, failUntilRef]);

  useLayoutEffect(() => {
    if (loginSuccessKey > lastSuccessKeyRef.current) {
      lastSuccessKeyRef.current = loginSuccessKey;
      const until = performance.now() + SUCCESS_MS;
      successEndRef.current = until;
      if (successUntilRef) successUntilRef.current = until;
    }
  }, [loginSuccessKey, successUntilRef]);

  useEffect(() => {
    const clearPeekTimer = () => {
      if (peekTimerRef.current) {
        clearTimeout(peekTimerRef.current);
        peekTimerRef.current = null;
      }
    };

    const schedulePeek = () => {
      clearPeekTimer();
      const { showPassword: show, passwordLength: len, activeField: field, passwordFocused: focused } = stateRef.current;
      if (!show || len <= 0 || !PW_FIELDS.has(field) || !focused) {
        purplePeekUntilRef.current = 0;
        return;
      }
      peekTimerRef.current = setTimeout(() => {
        purplePeekUntilRef.current = performance.now() + 750;
        schedulePeek();
      }, 2000 + Math.random() * 1800);
    };

    schedulePeek();
    return clearPeekTimer;
  }, [showPassword, passwordLength, activeField, passwordFocused]);

  useEffect(() => {
    const onMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouseMove);

    const getBodies = () => bodyRefs.current.filter(Boolean);
    const getFaces = () => faceRefs.current.filter(Boolean);
    const getPupils = () => pupilRefs.current.filter(Boolean);
    const getEyes = () => eyeRefs.current.filter(Boolean);

    const ensureAnim = () => {
      const n = getBodies().length;
      while (bodyAnimRef.current.length < n) {
        bodyAnimRef.current.push({
          skew: 0, tx: 0, sy: 1, faceX: 0, faceY: 0, faceRotate: 0, eyeOpen: 1,
        });
      }
      while (moodRef.current.length < n) moodRef.current.push('idle');
      while (pupilAnimRef.current.length < getPupils().length) {
        pupilAnimRef.current.push({ x: 0, y: 0 });
      }
    };

    const bodyCenter = (body) => {
      const r = body.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 3 };
    };

    const mouseSkew = (body) => {
      const { x: cx } = bodyCenter(body);
      return clamp(-(mouseRef.current.x - cx) / 120, -4, 4);
    };

    const leanToward = (body, focusX) => {
      if (!focusX) return 0;
      return clamp((focusX - bodyCenter(body).x) / (window.innerWidth * 0.34), 0, 1);
    };

    const setMood = (body, i, mood) => {
      if (moodRef.current[i] !== mood) {
        moodRef.current[i] = mood;
        body.dataset.mood = mood;
      }
    };

    let rafId = 0;

    const tick = () => {
      ensureAnim();

      const bodies = getBodies();
      const faces = getFaces();
      const pupils = getPupils();
      const eyeWraps = getEyes();
      if (bodies.length === 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const {
        activeField: field,
        passwordFocused: pwFocused,
        showPassword: show,
        passwordLength: pwLen,
        focusPoint: focus,
      } = stateRef.current;

      const failSequenceEnd = Math.max(
        failEndRef.current,
        failUntilRefProp.current?.current ?? 0,
      );
      const failShockEnd = failShockEndRef.current > 0
        ? failShockEndRef.current
        : failSequenceEnd - FAIL_HEADNO_MS;
      const isFailShock = now < failShockEnd;
      const isFailNo = now >= failShockEnd && now < failSequenceEnd;
      const isFail = isFailShock || isFailNo;

      const successUntil = Math.max(
        successEndRef.current,
        successUntilRefProp.current?.current ?? 0,
      );
      const isSuccess = !isFail && now < successUntil;
      const isGossip = now < gossipUntilRef.current;
      const isPurplePeek = now < purplePeekUntilRef.current;
      const onPasswordField = PW_FIELDS.has(field) && pwFocused;
      const isTextField = TEXT_FIELDS.has(field) && focus && !onPasswordField;

      const hidingPw = onPasswordField && !show;
      const showingPw = onPasswordField && show && pwLen > 0;
      const pwBlend = onPasswordField ? (pwLen > 0 ? 1 : 0.35) : 0;

      const formX = focus?.x ?? window.innerWidth * 0.72;
      const formY = focus?.y ?? window.innerHeight * 0.48;

      let failAge = 0;
      if (isFailShock) {
        failAge = FAIL_SHOCK_MS - (failShockEnd - now);
      }

      const transition = clamp((now - fieldChangedAtRef.current) / 800, 0, 1);
      const moveSpeed = 0.035 + transition * 0.045;
      const pupilSpeed = 0.09;

      const forcedByPupil = new Map();

      bodies.forEach((body, i) => {
        const profile = CHAR_PROFILE[i] ?? CHAR_PROFILE[0];
        let skew = mouseSkew(body);
        let tx = 0;
        let sy = 1;
        let faceX = 0;
        let faceY = 0;
        let faceRotate = 0;
        let targetEyeOpen = 1;
        let mouth = 'neutral';
        let mood = 'idle';

        if (isFailShock) {
          const pose = FAIL_POSE[i] ?? FAIL_POSE[0];
          const purpleNo = clamp(failAge / 260, 0, 1);
          const othersDismay = clamp((failAge - 120) / 360, 0, 1);
          const blend = i === 2 ? purpleNo : othersDismay;

          mouth = 'dismay';
          mood = 'fail';
          sy = 1;
          targetEyeOpen = 1;

          skew = pose.skew * blend;
          tx = pose.tx * blend;
          faceX = pose.faceX * blend;
          faceY = pose.faceY * blend;

          eyeWraps.filter((ew) => body.contains(ew)).forEach((ew) => {
            const p = ew.querySelector('.auth-pupil');
            if (p) forcedByPupil.set(p, { trackForm: true, yBias: i === 3 ? 3 : 1 });
          });
        } else if (isFailNo) {
          const noAge = now - failShockEnd;
          const t = clamp(noAge / FAIL_HEADNO_MS, 0, 1);
          const envelope = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
          const pose = FAIL_POSE[i] ?? FAIL_POSE[0];

          mouth = 'dismay';
          mood = 'fail-no';
          sy = 1;
          targetEyeOpen = 1;

          /* Body stays locked in the shocked pose — no body shake. */
          skew = pose.skew;
          tx = pose.tx;
          faceY = pose.faceY;

          /* Subtle head-only side-to-side "no". */
          const headAmp = (3 + (i === 2 ? 1.5 : 0)) * envelope;
          const headShake = Math.sin(t * Math.PI * 2 * 2.2) * headAmp;
          const headTilt = Math.sin(t * Math.PI * 2 * 2.2) * (2 + (i === 2 ? 1 : 0)) * envelope;
          faceX = pose.faceX + headShake;
          faceRotate = headTilt;

          eyeWraps.filter((ew) => body.contains(ew)).forEach((ew) => {
            const p = ew.querySelector('.auth-pupil');
            if (p) forcedByPupil.set(p, { x: 0, y: 0 });
          });
        } else if (isSuccess) {
          const successAge = SUCCESS_MS - (successUntil - now);
          const stagger = i * 85;
          const localAge = Math.max(0, successAge - stagger);
          const inT = clamp(localAge / 450, 0, 1);
          const hop = Math.abs(Math.sin(localAge * 0.017)) * inT * (1 - localAge / SUCCESS_MS * 0.35);
          const cheer = inT * 0.72;
          const wiggle = Math.sin(localAge * 0.022 + i) * 2.5 * inT;

          mouth = (i === 0 || i === 2) ? 'neutral' : 'happy';
          mood = 'celebrate';
          skew = profile.skew * cheer * 0.45 + ((i === 0 || i === 2) ? 0 : wiggle * 0.35);
          tx = profile.tx * cheer * 0.35;
          sy = 1 + hop * (i === 2 ? 0.11 : 0.065);
          faceY = -hop * (i === 2 ? 10 : 8);
          faceX = profile.faceX * cheer * 0.35;
          faceRotate = (i === 0 || i === 2) ? 0 : wiggle;
          targetEyeOpen = 1;

          eyeWraps.filter((ew) => body.contains(ew)).forEach((ew) => {
            const p = ew.querySelector('.auth-pupil');
            if (p) forcedByPupil.set(p, { x: 0, y: (i === 0 || i === 2) ? 0 : -1 });
          });
        } else if (isTextField) {
          const lean = leanToward(body, formX);
          const watch = lean * 0.88;

          skew = mouseSkew(body) * (1 - watch * 0.45) + watch * profile.skew;
          tx = watch * profile.tx;

          if (i === 2) {
            sy = 1 + watch * 0.13;
            faceX = watch * profile.faceX * 1.15;
            faceY = watch * profile.faceY;
            mouth = 'neutral';
            mood = 'giraffe';
          } else {
            faceX = watch * profile.faceX;
            faceY = watch * profile.faceY * 0.5;
            mouth = 'curious';
            mood = 'watch';
          }

          eyeWraps.filter((ew) => body.contains(ew)).forEach((ew) => {
            const p = ew.querySelector('.auth-pupil');
            if (p) forcedByPupil.set(p, { trackForm: true });
          });
        } else if (showingPw) {
          if (i === 2 && isPurplePeek) {
            skew = -5;
            tx = 10;
            sy = 1.08;
            faceX = 6;
            faceY = -4;
            mood = 'peek';
            eyeWraps.filter((ew) => body.contains(ew)).forEach((ew) => {
              const p = ew.querySelector('.auth-pupil');
              if (p) forcedByPupil.set(p, { trackForm: true });
            });
          } else {
            skew = 0;
            mood = 'away';
            eyeWraps.filter((ew) => body.contains(ew)).forEach((ew) => {
              const p = ew.querySelector('.auth-pupil');
              if (p) forcedByPupil.set(p, { x: -5, y: -4 });
            });
          }
        } else if (hidingPw) {
          const h = pwBlend;
          skew = (-10 - i * 1.2) * h + mouseSkew(body) * (1 - h) * 0.3;
          tx = (14 + i * 2.5) * h;
          sy = 1 + (i === 2 ? 0.08 : 0) * h;
          faceX = (6 + i) * h;
          faceY = -3 * h;
          targetEyeOpen = isGossip ? 1 : 1 - 0.8 * h;
          mood = isGossip ? 'gossip' : 'away';

          if (isGossip) {
            skew = (i < 2 ? 5 : -4) * h;
            tx = (i < 2 ? 7 : -4) * h;
            const peers = eyeWraps.filter((ew) => body.contains(ew));
            peers.forEach((ew, ei) => {
              const p = ew.querySelector('.auth-pupil');
              if (p) forcedByPupil.set(p, ei === 0 ? { x: 4, y: 3 } : { x: -3, y: 3 });
            });
          } else {
            eyeWraps.filter((ew) => body.contains(ew)).forEach((ew) => {
              const p = ew.querySelector('.auth-pupil');
              if (p) forcedByPupil.set(p, { x: -5, y: -4 });
            });
          }
        }

        setMood(body, i, mood);

        const anim = bodyAnimRef.current[i];
        const speed = isFailShock
          ? (i === 2 ? 0.18 : 0.14)
          : isFailNo
            ? 0.2
            : isSuccess
              ? 0.16
              : moveSpeed;
        const faceSpeed = isFailNo ? 0.42 : isSuccess ? 0.18 : speed;
        anim.skew = lerp(anim.skew, skew, speed);
        anim.tx = lerp(anim.tx, tx, speed);
        anim.sy = lerp(anim.sy, sy, speed);
        anim.faceX = lerp(anim.faceX, faceX, faceSpeed);
        anim.faceY = lerp(anim.faceY, faceY, speed);
        anim.faceRotate = lerp(anim.faceRotate, faceRotate, faceSpeed);
        anim.eyeOpen = lerp(anim.eyeOpen, targetEyeOpen, 0.1);

        body.style.transform = `translateX(${anim.tx.toFixed(2)}px) skewX(${anim.skew.toFixed(2)}deg) scaleY(${anim.sy.toFixed(3)})`;

        const faceEl = faces[i];
        if (faceEl) {
          faceEl.style.transform = `translate(${anim.faceX.toFixed(2)}px, ${anim.faceY.toFixed(2)}px) rotate(${anim.faceRotate.toFixed(2)}deg)`;
        }

        const mouthEl = mouthRefs.current[i];
        if (mouthEl) {
          const nextMouth = `auth-char-mouth auth-char-mouth--${mouth}`;
          if (mouthEl.className !== nextMouth) mouthEl.className = nextMouth;
        }

        eyeWraps.filter((ew) => body.contains(ew)).forEach((ew) => {
          ew.classList.toggle('auth-eye--closed', anim.eyeOpen < 0.35);
          ew.classList.toggle('auth-eye--dismay', isFailShock && i === 3);
          ew.classList.toggle('auth-eye--happy', isSuccess && i !== 0 && i !== 2);
          ew.classList.remove('auth-eye--wide');
        });
      });

      pupils.forEach((pupil, idx) => {
        const eyeWrap = pupil.parentElement;
        if (!eyeWrap || eyeWrap.classList.contains('auth-eye--closed')) {
          pupil.style.transform = 'translate(0px, 0px)';
          return;
        }

        const forced = forcedByPupil.get(pupil);
        let tx = 0;
        let ty = 0;

        if (forced?.trackForm) {
          const r = eyeWrap.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = formX - cx;
          const dy = (formY - cy) + (forced.yBias ?? 0);
          const maxR = Math.max(eyeWrap.offsetWidth / 2 - pupil.offsetWidth / 2 - 1, 1);
          const dist = Math.hypot(dx, dy) || 1;
          const f = Math.min(dist, maxR) / dist;
          tx = dx * f;
          ty = dy * f;
        } else if (forced) {
          tx = forced.x;
          ty = forced.y;
        } else {
          const r = eyeWrap.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = mouseRef.current.x - cx;
          const dy = mouseRef.current.y - cy;
          const maxR = Math.max(eyeWrap.offsetWidth / 2 - pupil.offsetWidth / 2 - 1, 0);
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            const f = Math.min(dist, maxR) / dist;
            tx = dx * f;
            ty = dy * f;
          }
        }

        const pa = pupilAnimRef.current[idx];
        pa.x = lerp(pa.x, tx, pupilSpeed);
        pa.y = lerp(pa.y, ty, pupilSpeed);
        pupil.style.transform = `translate(${pa.x.toFixed(2)}px, ${pa.y.toFixed(2)}px)`;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div className="auth-characters-stage">
      <div className="auth-characters-stage__glow" aria-hidden />
      <div className="auth-characters-stage__floor" aria-hidden>
        <div className="auth-characters-stage__platform" />
        <div className="auth-characters-stage__shelf" />
      </div>
      <div className="auth-characters" aria-hidden="true">
        <div className="auth-characters__decor-ring auth-characters__decor-ring--1" />
        <div className="auth-characters__decor-ring auth-characters__decor-ring--2" />

        <CharBody idx={0} className="auth-char-dome-orange" bodyRefs={bodyRefs} faceRefs={faceRefs} mouthRefs={mouthRefs} eyes={<Eyes size="small" pupilRefs={pupilRefs} eyeRefs={eyeRefs} startIndex={0} />} />
        <CharBody idx={1} className="auth-char-blob" bodyRefs={bodyRefs} faceRefs={faceRefs} mouthRefs={mouthRefs} eyes={<Eyes pupilRefs={pupilRefs} eyeRefs={eyeRefs} startIndex={2} />} />
        <CharBody idx={2} className="auth-char-rect" bodyRefs={bodyRefs} faceRefs={faceRefs} mouthRefs={mouthRefs} eyes={<Eyes pupilRefs={pupilRefs} eyeRefs={eyeRefs} startIndex={4} />} />
        <CharBody idx={3} className="auth-char-dome-dark" bodyRefs={bodyRefs} faceRefs={faceRefs} mouthRefs={mouthRefs} eyes={<Eyes size="tiny" pupilRefs={pupilRefs} eyeRefs={eyeRefs} startIndex={6} />} />
      </div>
    </div>
  );
}
