// Cookies are shared between Safari browser and PWA standalone mode on iOS.
// localStorage is NOT — hence token loss when launching from homescreen.

const IS_SERVER = typeof document === 'undefined';

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

export const storage = {
  getToken: () => getCookie('clique_token'),
  setToken: (v: string) => setCookie('clique_token', v, 30),
  removeToken: () => removeCookie('clique_token'),

  getUser: () => {
    const v = getCookie('clique_user');
    if (!v) return null;
    try { return JSON.parse(v); } catch { return null; }
  },
  setUser: (v: object) => setCookie('clique_user', JSON.stringify(v), 30),
  removeUser: () => removeCookie('clique_user'),

  getRefresh: () => getCookie('clique_refresh'),
  setRefresh: (v: string) => setCookie('clique_refresh', v, 90),
  removeRefresh: () => removeCookie('clique_refresh'),

  clear: () => {
    removeCookie('clique_token');
    removeCookie('clique_user');
    removeCookie('clique_refresh');
  },
};
