import { describe, expect, it } from 'vitest';
import { workFrontmatterSchema } from './work-frontmatter-schema';

describe('workFrontmatterSchema', () => {
  it('accepts Sveltia leaving updated and description empty', () => {
    const result = workFrontmatterSchema.parse({
      title: '公共廁所 LINE Bot',
      date: '2026-11-18T18:08:00+00:00',
      updated: '',
      description: '',
      draft: false,
      tags: ['LINE Bot'],
    });
    expect(result.updatedDate).toBeUndefined();
    expect(result.description).toBe('');
  });
  it('still rejects invalid, nonempty dates', () => {
    expect(workFrontmatterSchema.safeParse({
      title:'Test',date:'2026-11-18',updated:'not-a-date',
    }).success).toBe(false);
  });
});
