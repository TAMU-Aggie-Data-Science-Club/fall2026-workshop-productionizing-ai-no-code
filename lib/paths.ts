export const BASE_PATH = '/prod-ai';

/** Prefix root-relative links and public assets (plain anchors are not prefixed by the router). */
export function workshopPath(path: string) {
  return `${BASE_PATH}${path}`;
}

export function lessonPath(pathname: string) {
  if (pathname === BASE_PATH || pathname === `${BASE_PATH}/`) return '/';
  return pathname.startsWith(`${BASE_PATH}/`)
    ? pathname.slice(BASE_PATH.length)
    : pathname;
}
