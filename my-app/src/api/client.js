const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function getAuthUserId() {
  try {
    const token = localStorage.getItem('scorpio_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const id = Number(payload.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export function avatarUrl(profilePic, username, size = 48) {
  const name = encodeURIComponent(username || 'User');
  const fallback = `https://ui-avatars.com/api/?name=${name}&size=${size}&background=1c2333&color=58a6ff`;
  if (!profilePic) return fallback;
  if (/^https?:\/\//i.test(profilePic)) return profilePic;
  const base = BASE.replace(/\/$/, '');
  if (profilePic.startsWith('/')) return `${base}${profilePic}`;
  const file = profilePic.includes('/') ? profilePic.split('/').pop() : profilePic;
  return `${base}/uploads/${file}`;
}

export function encodeGame(name) {
  return encodeURIComponent(name);
}

export async function api(path, options = {}) {
  const token = localStorage.getItem('scorpio_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));

  if (
    res.status === 401 &&
    (data.error === 'Invalid token' || data.error === 'No token provided')
  ) {
    localStorage.removeItem('scorpio_token');
    localStorage.removeItem('scorpio_user');
    window.dispatchEvent(new CustomEvent('scorpio:session-expired'));
  }

  return { ok: res.ok, data, status: res.status };
}

export function chatRoomId(userIdA, userIdB) {
  const a = Number(userIdA);
  const b = Number(userIdB);
  return [a, b].sort((x, y) => x - y).join('_');
}

export function sameUserId(a, b) {
  return String(a) === String(b);
}

export { BASE };
