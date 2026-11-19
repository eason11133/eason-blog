const SLUG_RE = /^[a-zA-Z0-9\p{L}\p{N}_-]{1,120}$/u;
export const validSlug = (value) => typeof value === 'string' && SLUG_RE.test(value) && !['.', '..'].includes(value);
export const asArray = (value) => Array.isArray(value) ? value.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean).slice(0,20) : [];
export const safeText = (v, max=200) => typeof v === 'string' ? v.trim().slice(0,max) : '';
export const safeJsonParse = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };
export function normalizeDocument(input) {
  if (!input || typeof input !== 'object' || !['post','work'].includes(input.kind) || !validSlug(input.slug)) return null;
  const title = safeText(input.title,200);
  const date = safeText(input.date,60) || new Date().toISOString();
  if (!title || !Number.isFinite(Date.parse(date))) return null;
  const cats = asArray(input.categories).slice(0,1);
  const tags = asArray(input.tags);
  const draft = input.draft !== false;
  if (!draft && input.kind === 'post' && (!cats.length || !tags.length)) return null;
  const body = typeof input.body_markdown === 'string' ? input.body_markdown : '';
  if (body.length > 250000) return null;
  return {
    kind:input.kind, slug:input.slug, title, date,
    description:safeText(input.description,1200), body_markdown:body,
    categories_json:JSON.stringify(cats), tags_json:JSON.stringify(tags),
    draft:draft ? 1 : 0, pinned:input.pinned === true ? 1 : 0,
    updated:new Date().toISOString(),
  };
}
export function publicDocument(row) {
  if (!row) return null;
  return {
    kind:row.kind, slug:row.slug, title:row.title,
    description:row.description, body_markdown:row.body_markdown,
    categories:safeJsonParse(row.categories_json, []), tags:safeJsonParse(row.tags_json, []),
    date:row.date, updated:row.updated,
    draft:Boolean(row.draft), pinned:Boolean(row.pinned),
  };
}
