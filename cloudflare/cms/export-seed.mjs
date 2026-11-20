// Emit an idempotent D1 seed SQL script. Never overwrites edited Cloudflare records.
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYAML } from 'yaml';

const root = path.resolve(import.meta.dirname, '../..');
const escapeSQL = value => "'" + String(value ?? '').replaceAll("'", "''") + "'";
function parseMarkdown(file) {
  const raw=fs.readFileSync(file,'utf8');
  const match=/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if(!match)throw new Error('No frontmatter: '+file);
  const metadata=parseYAML(match[1])||{};
  return {metadata,body:raw.slice(match[0].length).trimStart()};
}
function asDate(value) {
  if(!value)return new Date().toISOString();
  const d=value instanceof Date?value:new Date(value);
  if(Number.isNaN(d.getTime()))throw new Error('Bad date in Markdown: '+value);
  return d.toISOString();
}
const lines=['-- D1 import generated from existing Astro Markdown. Uses INSERT OR IGNORE to preserve later edits.'];
for(const [kind,dir] of [['post','src/content/blog'],['work','src/content/works']]){
 for(const name of fs.readdirSync(path.join(root,dir)).filter(x=>x.endsWith('.md')).sort()){
  const {metadata:m,body}=parseMarkdown(path.join(root,dir,name));
  const slug=path.basename(name,'.md');
  const date=asDate(m.date);
  const updated=m.updated?asDate(m.updated):date;
  const cats=Array.isArray(m.categories)?m.categories:[];
  const tags=Array.isArray(m.tags)?m.tags:[];
  const values=[kind,slug,m.title,m.description||'',body,JSON.stringify(cats),JSON.stringify(tags),date,updated,m.draft===true?1:0,m.pinned===true?1:0];
  lines.push('INSERT OR IGNORE INTO documents(kind,slug,title,description,body_markdown,categories_json,tags_json,date,updated,draft,pinned) VALUES('+values.map(escapeSQL).join(',')+');');
 }
}
const home=JSON.parse(fs.readFileSync(path.join(root,'src/data/homepage.json'),'utf8'));
const about=parseMarkdown(path.join(root,'src/content/about.md'));
lines.push('INSERT OR IGNORE INTO settings(key,value_json,updated) VALUES('+['homepage',JSON.stringify(home),new Date().toISOString()].map(escapeSQL).join(',')+');');
lines.push('INSERT OR IGNORE INTO settings(key,value_json,updated) VALUES('+['about',JSON.stringify({...about.metadata,body_markdown:about.body}),new Date().toISOString()].map(escapeSQL).join(',')+');');
process.stdout.write(lines.join('\n')+'\n');
