import { getCollection, type CollectionEntry } from 'astro:content';
import { filterVisiblePosts } from './visibility';
import { getCmsDocuments } from '../cloudflare/live-content';

export type BlogPost = CollectionEntry<'blog'>;

export function sortPostsByDateDesc(posts: BlogPost[]): BlogPost[] {
	return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getBlogPosts(): Promise<BlogPost[]> {
	const posts = import.meta.env.PUBLIC_EASON_LIVE === 'true'
		? await getCmsDocuments('post')
		: await getCollection('blog');
	return sortPostsByDateDesc(filterVisiblePosts(posts, import.meta.env.PROD));
}

export async function getTagStats(): Promise<Array<[string, number]>> {
	const posts = await getBlogPosts();
	const tagCount: Record<string, number> = {};

	for (const post of posts) {
		for (const tag of post.data.tags) {
			tagCount[tag] = (tagCount[tag] || 0) + 1;
		}
	}

	return Object.entries(tagCount).sort((a, b) => b[1] - a[1]);
}
