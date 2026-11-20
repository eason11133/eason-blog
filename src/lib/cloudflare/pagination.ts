import type { Page } from 'astro';

export type PageUrlFactory = (current: number, last: number) => {
  current: string; prev: string | undefined; next: string | undefined;
};

export function buildContentPage<T>(
  entries: T[],
  number: number,
  urls: PageUrlFactory,
  pageSize = 15,
): Page<T> | undefined {
  const total = entries.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (!Number.isSafeInteger(number) || number < 1 || number > lastPage) return undefined;
  const start = (number - 1) * pageSize;
  const data = entries.slice(start, start + pageSize);
  return {
    data,
    start,
    end: start + Math.max(0, data.length - 1),
    total,
    currentPage: number,
    size: pageSize,
    lastPage,
    url: {
      ...urls(number, lastPage),
      first: number > 1 ? urls(1, lastPage).current : undefined,
      last: number < lastPage ? urls(lastPage, lastPage).current : undefined,
    },
  };
}
