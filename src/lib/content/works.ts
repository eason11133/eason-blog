import { getCollection, type CollectionEntry } from 'astro:content';
import { filterVisiblePosts } from './visibility';

export type WorkEntry = CollectionEntry<'works'>;

// Keep works separate from articles; unpublished drafts are hidden in production.
export async function getWorks(): Promise<WorkEntry[]> {
  const works = await getCollection('works');
  return filterVisiblePosts(works, import.meta.env.PROD)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
