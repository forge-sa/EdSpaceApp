import { useLocalSearchParams, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { API_URL } from './api';

// App routes mirror the website's paths (/post/12, /@handle, /classes/10a, /clubs/3),
// so a link to the site can open the same screen in the app.

export const profileHref = (handle: string) => `/@${handle}` as Href;
export const postHref = (id: number) => `/post/${id}` as Href;
export const classHref = (slug: string) => `/classes/${encodeURIComponent(slug)}` as Href;
export const clubHref = (id: number) => `/clubs/${id}` as Href;
export const searchHref = (q: string, type?: 'users') =>
  ({ pathname: '/search', params: type ? { q, type } : { q } }) as Href;

const SITE = API_URL.replace(/^https?:\/\//, '').toLowerCase();
// The live site also answers at www.edville.space and its old address,
// edspace.altynkhan.com, which older posts still link to.
const SITE_HOSTS = SITE === 'edville.space' ? [SITE, 'www.edville.space', 'edspace.altynkhan.com'] : [SITE];

/** Maps a link to the EdSpace website onto an in-app route, if there is one. */
export function internalHref(url: string): Href | null {
  const m = /^https?:\/\/([^/?#]+)(\/[^?#]*)?(\?[^#]*)?/i.exec(url);
  if (!m || !SITE_HOSTS.includes(m[1].toLowerCase())) return null;
  const path = (m[2] || '/').replace(/\/+$/, '') || '/';
  let r: RegExpExecArray | null;
  if ((r = /^\/post\/(\d+)$/.exec(path))) return postHref(Number(r[1]));
  if ((r = /^\/@([a-z0-9_]{3,20})(\/(followers|following))?$/i.exec(path))) return `${profileHref(r[1].toLowerCase())}${r[2] ?? ''}` as Href;
  if ((r = /^\/classes\/([^/]+)$/.exec(path))) return classHref(decodeURIComponent(r[1]));
  if ((r = /^\/clubs\/(\d+)$/.exec(path))) return clubHref(Number(r[1]));
  if (path === '/explore') {
    // (React Native's URLSearchParams can't read params, so parse by hand.)
    const raw = /[?&]q=([^&]*)/.exec(m[3] ?? '')?.[1];
    const q = raw ? decodeURIComponent(raw.replace(/\+/g, ' ')) : '';
    return q ? searchHref(q) : ('/explore' as Href);
  }
  if (['/', '/classes', '/teachers', '/clubs', '/bookmarks', '/notifications', '/settings'].includes(path)) return path as Href;
  return null;
}

/** Opens an outside link in the in-app browser. */
export function openExternal(url: string) {
  return WebBrowser.openBrowserAsync(url).catch(() => {});
}

/** Profiles live at /@handle, as on the website; null for any other path. */
export function useHandleParam() {
  const { handle = '' } = useLocalSearchParams<{ handle: string }>();
  return handle.startsWith('@') && handle.length > 1 ? handle.slice(1).toLowerCase() : null;
}
