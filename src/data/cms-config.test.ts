import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import homepage from './homepage.json';

const cmsConfig = parse(readFileSync(resolve('public/admin/config.yml'), 'utf8')) as {
  backend: { name: string; repo: string; auth_methods: string[] };
  singletons: Array<{ name: string; file: string; fields: Array<{ name: string }> }>;
  collections: Array<{ name: string; folder: string; fields: Array<{ name: string }> }>;
  field_defaults: { richtext: { editor_components: string[] } };
};

describe('Sveltia CMS migration contract', () => {
  it('keeps the editor connected to the current GitHub repository', () => {
    expect(cmsConfig.backend).toMatchObject({
      name: 'github',
      repo: 'eason11133/eason-blog',
      auth_methods: ['token'],
    });
    expect(cmsConfig.singletons.map(({ name }) => name)).toEqual(['homepage', 'about']);
    expect(cmsConfig.collections.map(({ name }) => name)).toEqual(['posts', 'works']);
  });

  it('exposes homepage fields and original statuses without changing the visual assets', () => {
    const homeFields = cmsConfig.singletons.find(({ name }) => name === 'homepage')?.fields;
    const names = homeFields?.map(({ name }) => name) ?? [];
    for (const key of Object.keys(homepage)) expect(names).toContain(key);
    expect(homepage.hero_background).toMatch(/^\//);
    expect(homepage.status_tags.map(({ style }) => style)).toEqual([
      'admissions',
      'website',
      'learning',
    ]);
    expect(cmsConfig.singletons.find(({ name }) => name === 'homepage')?.file).toBe(
      'src/data/homepage.json',
    );
  });

  it('keeps Markdown locations and enables images, code blocks and tables', () => {
    expect(cmsConfig.collections.find(({ name }) => name === 'posts')?.folder).toBe(
      'src/content/blog',
    );
    expect(cmsConfig.collections.find(({ name }) => name === 'works')?.folder).toBe(
      'src/content/works',
    );
    expect(cmsConfig.singletons.find(({ name }) => name === 'about')?.file).toBe(
      'src/content/about.md',
    );
    expect(cmsConfig.field_defaults.richtext.editor_components).toEqual([
      'code-block',
      'image',
      'table',
      'hr',
    ]);
  });
});
