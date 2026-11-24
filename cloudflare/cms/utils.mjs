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

export function normalizeFooterLinks(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const links = {};
  for (const key of ['github','email','instagram','discord']) {
    if (typeof input[key] !== 'string') return null;
    const value = input[key].trim();
    if (!value) { links[key] = ''; continue; }
    if (key === 'email') {
      const email = value.replace(/^mailto:/i,'');
      if (email.length > 254 || !/^[A-Z0-9.!#$%&'*+/=_~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i.test(email)) return null;
      links[key] = email;
      continue;
    }
    if (value.length > 1500) return null;
    try {
      const url = new URL(value);
      if (!['http:','https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
      links[key] = url.toString();
    } catch { return null; }
  }
  return links;
}
