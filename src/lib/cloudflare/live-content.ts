// Cloudflare on-demand front end: content is always read from the D1-backed CMS.
// The existing static site keeps using Astro's content collections unchanged.
import type { CollectionEntry } from 'astro:content';

export const LIVE_CMS_ORIGIN = 'https://eason-blog.eason456h.workers.dev';

type Kind = 'post' | 'work';
type Collection = 'blog' | 'works';
export interface CmsDocument {
  kind: Kind;
  slug: string;
  title: string;
  description: string;
  body_markdown: string;
  categories: string[];
  tags: string[];
  date: string;
  updated?: string;
  draft: boolean;
  pinned: boolean;
}
export interface CmsSettings {
  [key: string]: unknown;
}

function validDocument(data: unknown, kind: Kind): data is CmsDocument {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.kind === kind
    && typeof d.slug === 'string'
    && typeof d.title === 'string'
    && typeof d.date === 'string'
    && !Number.isNaN(Date.parse(d.date))
    && d.draft === false
    && Array.isArray(d.tags)
    && Array.isArray(d.categories)
    && typeof d.body_markdown === 'string';
}
async function getJson(path: string): Promise<unknown> {
  const response = await fetch(new URL(path, LIVE_CMS_ORIGIN), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`CMS public API ${response.status}: ${path}`);
  return response.json();
}
function toCollectionEntry(doc: CmsDocument): CollectionEntry<'blog'> | CollectionEntry<'works'> {
  const collection: Collection = doc.kind === 'post' ? 'blog' : 'works';
  const pubDate = new Date(doc.date);
  const updatedDate = doc.updated && !Number.isNaN(Date.parse(doc.updated)) ? new Date(doc.updated) : undefined;
  return {
    id: doc.slug,
    collection,
    body: doc.body_markdown,
    data: {
      title: doc.title,
      date: pubDate,
      updated: updatedDate,
      pubDate,
      updatedDate,
      description: doc.description || undefined,
      draft: false,
      pinned: Boolean(doc.pinned),
      categories: doc.categories,
      tags: doc.tags,
    },
  } as CollectionEntry<'blog'> | CollectionEntry<'works'>;
}

export async function getCmsDocuments(kind: 'post'): Promise<CollectionEntry<'blog'>[]>;
export async function getCmsDocuments(kind: 'work'): Promise<CollectionEntry<'works'>[]>;
export async function getCmsDocuments(kind: Kind) {
  const route = kind === 'post' ? 'posts' : 'works';
  const payload = await getJson(`/api/${route}`) as { items?: unknown };
  if (!Array.isArray(payload.items)) throw new Error(`CMS returned invalid list for ${kind}`);
  return payload.items.filter((doc): doc is CmsDocument => validDocument(doc, kind))
    .map(toCollectionEntry);
}

export async function getCmsDocument(kind: 'post', slug: string): Promise<CollectionEntry<'blog'> | undefined>;
export async function getCmsDocument(kind: 'work', slug: string): Promise<CollectionEntry<'works'> | undefined>;
export async function getCmsDocument(kind: Kind, slug: string) {
  if (!slug || !/^[a-zA-Z0-9\p{L}\p{N}_-]{1,120}$/u.test(slug)) return undefined;
  const route = kind === 'post' ? 'posts' : 'works';
  const response = await fetch(new URL(`/api/${route}/${encodeURIComponent(slug)}`, LIVE_CMS_ORIGIN), {
    headers: { Accept: 'application/json' }, cache: 'no-store',
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`CMS public API ${response.status}: ${kind}/${slug}`);
  const payload: unknown = await response.json();
  return validDocument(payload, kind) ? toCollectionEntry(payload) : undefined;
}

export async function getCmsSettings<T extends object>(key: 'homepage' | 'about'): Promise<T> {
  const value = await getJson(`/api/${key}`);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid CMS settings');
  return value as T;
}


export interface CmsFriendSite {
  name: string;
  url: string;
  description: string;
}

/** Fetch public friend links from D1 on every live page request. */
export async function getCmsFriends(): Promise<CmsFriendSite[]> {
  const payload = await getJson('/api/friends') as { sites?: unknown };
  if (!Array.isArray(payload.sites)) return [];
  return payload.sites.filter((item): item is CmsFriendSite => {
    if (!item || typeof item !== 'object') return false;
    const site = item as Record<string, unknown>;
    if (typeof site.name !== 'string' || typeof site.description !== 'string' || typeof site.url !== 'string') return false;
    try {
      const url = new URL(site.url);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
    } catch { return false; }
  });
}
