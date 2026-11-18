import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import homepage from './homepage.json';

type CmsField = { name: string; widget?: string; fields?: CmsField[] };
type CmsCollection = {
  name: string;
  file?: string;
  folder?: string;
  preview_path?: string;
  fields: CmsField[];
};
type CmsConfig = {
  backend: { name: string; repo: string; branch: string; auth_methods: string[] };
  media_folder: string;
  public_folder: string;
  singletons: CmsCollection[];
  collections: CmsCollection[];
  field_defaults: { richtext: { modes: string[]; editor_components: string[] } };
};

const cms = parse(readFileSync(resolve('public/admin/config.yml'), 'utf8')) as CmsConfig;
const fieldNames = (fields: CmsField[]) => fields.map(({ name }) => name);
const asFrontmatter = (file: string): Record<string, unknown> => {
  const source = readFileSync(resolve(file), 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (!match) throw new Error(`Missing YAML frontmatter: ${file}`);
  return parse(match[1]) as Record<string, unknown>;
};

describe('Sveltia CMS integration', () => {
  it('uses the original GitHub repo with token login, not Pages CMS', () => {
    expect(cms.backend).toMatchObject({
      name: 'github',
      repo: 'eason11133/eason-blog',
      branch: 'main',
      auth_methods: ['token'],
    });
    expect(existsSync(resolve('public/admin/index.html'))).toBe(true);
    expect(existsSync(resolve('.pages.yml'))).toBe(false);
    expect(cms.singletons.map(({ name }) => name)).toEqual(['homepage', 'about']);
    expect(cms.collections.map(({ name }) => name)).toEqual(['posts', 'works']);
  });

  it('exposes every homepage value, including its existing unmodified hero image', () => {
    const home = cms.singletons.find(({ name }) => name === 'homepage');
    expect(home?.file).toBe('src/data/homepage.json');
    for (const key of Object.keys(homepage)) {
      expect(fieldNames(home?.fields ?? [])).toContain(key);
    }
    expect(cms.media_folder).toBe('/public/image');
    expect(cms.public_folder).toBe('/image');
    expect(homepage.hero_background).toBe('/image/eason-home-hero.jpg');
    expect(existsSync(resolve('public', homepage.hero_background.slice(1)))).toBe(true);
    expect(homepage.status_tags.map(({ style }) => style)).toEqual([
      'admissions', 'website', 'learning',
    ]);
  });

  it('keeps every legacy About frontmatter key editable so save cannot silently erase it', () => {
    const about = cms.singletons.find(({ name }) => name === 'about');
    expect(about?.file).toBe('src/content/about.md');
    const data = asFrontmatter('src/content/about.md');
    for (const name of Object.keys(data)) expect(fieldNames(about?.fields ?? [])).toContain(name);
    const profileFields = about?.fields.find(({ name }) => name === 'profile')?.fields ?? [];
    for (const name of Object.keys(data.profile as Record<string, unknown>)) {
      expect(fieldNames(profileFields)).toContain(name);
    }
    const navFields = about?.fields.find(({ name }) => name === 'navigation')?.fields ?? [];
    for (const name of Object.keys(data.navigation as Record<string, unknown>)) {
      expect(fieldNames(navFields)).toContain(name);
    }
  });

  it('recognizes existing articles and works without moving their filenames', () => {
    for (const { name, folder, fields, preview_path } of cms.collections) {
      expect(folder).toBe(name === 'posts' ? 'src/content/blog' : 'src/content/works');
      expect(preview_path).toBe(name === 'posts' ? '/blog/{{slug}}/' : '/experience/{{slug}}/');
      for (const filename of readdirSync(resolve(folder!)).filter(x => x.endsWith('.md'))) {
        const doc = asFrontmatter(`${folder}/${filename}`);
        for (const key of Object.keys(doc)) expect(fieldNames(fields)).toContain(key);
      }
      expect(fields.find(({ name }) => name === 'body')?.widget).toBe('richtext');
    }
    expect(cms.field_defaults.richtext.modes).toEqual(['rich_text', 'raw']);
    expect(cms.field_defaults.richtext.editor_components).toEqual([
      'code-block', 'image', 'table', 'hr',
    ]);
  });
});
