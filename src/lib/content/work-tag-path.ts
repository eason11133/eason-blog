/**
 * Works have their own tag pages; do not send work tags to blog tag results.
 * Match Astro's static route param escaping for punctuation in tag names.
 */
export function getWorkTagPath(tag: string): string {
  const routeParam = tag.normalize().replaceAll('#', '%23').replaceAll('?', '%3F');
  return `/experience/tags/${routeParam}/`;
}
