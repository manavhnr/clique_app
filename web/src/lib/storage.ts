// iOS PWA (homescreen app) shares COOKIES with Safari but has SEPARATE localStorage.
// Strategy:
//   Token + refresh → cookies       (shared with PWA, small enough)
//   Full user       → localStorage  (no size limit, but not shared with PWA)
//   Compact user    → clique_session cookie (shared with PWA, ~200 bytes, always fits)
//
// On PWA first launch: token + compact user found in cookies → instant restore.
// AuthContext then background-fetches full user from /auth/me to populate localStorage
// so subsequent launches are instant too.

const IS_SERVER = typeof document === 'undefined';

// Fields stored in the compact session cookie (must stay under ~500 bytes total).
const SESSION_FIELDS = ['_id', 'name', 'username', 'phone', 'role', 'isVerifiedHost', 'hostVerificationStatus', 'profileImage'] as const;

function setCookie(name: string, value: string, days = 30) {
  if (IS_SERVER) return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (IS_SERVER) return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function removeCookie(name: string) {
  if (IS_SERVER) return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function lsGet(key: string): string | null {
  if (IS_SERVER) return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

function lsSet(key: string, value: string) {
  if (IS_SERVER) return;
  try { localStorage.setItem(key, value); } catch { /* quota exceeded */ }
}

function lsRemove(key: string) {
  if (IS_SERVER) return;
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export const storage = {
  getToken: () => getCookie('clique_token'),
  setToken: (v: string) => setCookie('clique_token', v, 30),
  removeToken: () => removeCookie('clique_token'),

  // Returns the full user object if available in localStorage (or migrates old cookie).
  getUser: (): object | null => {
    const ls = lsGet('clique_user');
    if (ls) { try { return JSON.parse(ls); } catch { /* fall through */ } }
    // Migrate legacy full-user cookie → localStorage (pre-fix sessions)
    const oldCk = getCookie('clique_user');
    if (oldCk) {
      try {
        const parsed = JSON.parse(oldCk);
        lsSet('clique_user', oldCk);
        removeCookie('clique_user');
        return parsed;
      } catch { /* invalid */ }
    }
    return null;
  },

  // Returns a compact user from the session cookie (shared with PWA context).
  // Missing fields compared to a full user — use only for auth gating.
  getSessionUser: (): object | null => {
    const ck = getCookie('clique_session');
    if (!ck) return null;
    try { return JSON.parse(ck); } catch { return null; }
  },

  setUser: (v: object) => {
    // Full user in localStorage (no size limit)
    lsSet('clique_user', JSON.stringify(v));
    // Compact user in cookie (shared with iOS PWA, guaranteed to fit)
    const compact: Record<string, unknown> = {};
    for (const key of SESSION_FIELDS) {
      if (key in v) compact[key] = (v as Record<string, unknown>)[key];
    }
    setCookie('clique_session', JSON.stringify(compact), 30);
  },

  removeUser: () => {
    lsRemove('clique_user');
    removeCookie('clique_session');
  },

  getRefresh: () => getCookie('clique_refresh'),
  setRefresh: (v: string) => setCookie('clique_refresh', v, 90),
  removeRefresh: () => removeCookie('clique_refresh'),

  clear: () => {
    removeCookie('clique_token');
    removeCookie('clique_refresh');
    lsRemove('clique_user');
    removeCookie('clique_session');
    removeCookie('clique_user'); // clean up legacy cookie
  },
};
