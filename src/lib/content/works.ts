import { getCollection, type CollectionEntry } from 'astro:content';
import { filterVisiblePosts } from './visibility';

export type WorkEntry = CollectionEntry<'works'>;

// Keep works separate from articles; unpublished drafts are hidden in production.
export async function getWorks(): Promise<WorkEntry[]> {
  const works = await getCollection('works');
  return filterVisiblePosts(works, import.meta.env.PROD)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getWorkTagStats(): Promise<Array<[string, number]>> {
  const works = await getWorks();
  const counts = new Map<string, number>();
  for (const work of works) {
    for (const tag of work.data.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
