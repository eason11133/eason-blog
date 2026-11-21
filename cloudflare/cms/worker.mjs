import { adminHtml } from './admin.mjs';
import { normalizeDocument, publicDocument, validSlug, safeText, safeJsonParse } from './utils.mjs';

const encoder = new TextEncoder();
const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...noStore, ...extra },
});
const fail = (message, status = 400) => json({ error: message }, status);
function b64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function unbase64url(data) {
  const str = data.replaceAll('-', '+').replaceAll('_', '/');
  return Uint8Array.from(atob(str.padEnd(Math.ceil(str.length / 4) * 4, '=')), c => c.charCodeAt(0));
}
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign','verify']);
}
async function signToken(payload, secret) {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload));
  return b64url(new Uint8Array(signature));
}
async function authenticate(req, env) {
  if (!env.CMS_SESSION_SECRET) return false;
  const cookies = req.headers.get('Cookie') || '';
  const match = /(?:^|;\s*)eason_cms=([^;]+)/.exec(cookies);
  if (!match) return false;
  const parts = match[1].split('.');
  if (parts.length !== 3 || !/^\d{10,14}$/.test(parts[0]) || Number(parts[0]) <= Date.now()) return false;
  const payload = parts[0] + '.' + parts[1];
  try {
    return crypto.subtle.verify('HMAC', await hmacKey(env.CMS_SESSION_SECRET), unbase64url(parts[2]), encoder.encode(payload));
  } catch { return false; }
}
async function issueCookie(env) {
  const expiry = Date.now() + 7 * 86400000;
  const random = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = String(expiry) + '.' + random;
  return 'eason_cms=' + payload + '.' + await signToken(payload, env.CMS_SESSION_SECRET)
    + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800';
}
async function equalSecrets(given, expected) {
  const [a,b] = await Promise.all([
    crypto.subtle.digest('SHA-256',encoder.encode(given)),
    crypto.subtle.digest('SHA-256',encoder.encode(expected)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for(let i=0;i<x.length;i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
async function actorHash(req, env) {
  const ip = req.headers.get('CF-Connecting-IP') || 'local-or-unknown';
  return signToken('actor:' + ip, env.CMS_SESSION_SECRET);
}
// Rolling-window D1 throttle. Fail closed if the DB write does not succeed.
async function quota(db, actor, action, limit, windowMs) {
  const now = Date.now();
  const found = await db.prepare('SELECT count,window_start FROM rate_limits WHERE actor_hash=? AND action=?').bind(actor,action).first();
  if (found && Number(found.window_start) + windowMs > now && Number(found.count) >= limit) return false;
  if (!found || Number(found.window_start) + windowMs <= now) {
    await db.prepare('INSERT INTO rate_limits(actor_hash,action,count,window_start) VALUES(?,?,1,?) ON CONFLICT(actor_hash,action) DO UPDATE SET count=1,window_start=excluded.window_start').bind(actor,action,now).run();
  } else {
    await db.prepare('UPDATE rate_limits SET count=count+1 WHERE actor_hash=? AND action=?').bind(actor,action).run();
  }
  return true;
}
async function jsonBody(req, sizeLimit = 280000) {
  if (!(req.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return null;
  if (Number(req.headers.get('Content-Length') || 0) > sizeLimit) return null;
  const raw = await req.text();
  if (raw.length > sizeLimit) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function sameOriginWrite(req, url) {
  return req.headers.get('Origin') === url.origin;
}
async function listDocs(db, kind, admin) {
  const sql = admin ?
    'SELECT * FROM documents WHERE kind=? ORDER BY pinned DESC,date DESC LIMIT 200' :
    'SELECT * FROM documents WHERE kind=? AND draft=0 ORDER BY pinned DESC,date DESC LIMIT 200';
  const out = await db.prepare(sql).bind(kind).all();
  return (out.results || []).map(publicDocument);
}
async function handle(req,env) {
  const url=new URL(req.url), path=url.pathname, method=req.method.toUpperCase();
  if (method==='GET' && path==='/health') return json({ok:true,service:'eason-blog-cms',storage:'D1'});
  if (method==='GET' && (path==='/admin' || path==='/admin/')) return new Response(adminHtml,{
    headers:{'Content-Type':'text/html; charset=utf-8',...noStore,
      'X-Frame-Options':'DENY', 'Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'none'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' data:; img-src 'self' https: data: blob:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"},
  });
  if (!env.DB) return fail('Database not configured',503);
  if (method!=='GET' && method!=='HEAD' && !sameOriginWrite(req,url)) return fail('Invalid request origin',403);

  if (method==='POST' && path==='/api/admin/login') {
    if (!env.CMS_ADMIN_PASSWORD || !env.CMS_SESSION_SECRET) return fail('Authentication not configured',503);
    const actor=await actorHash(req,env);
    if (!await quota(env.DB,actor,'login',8,15*60000)) return fail('Too many login attempts',429);
    const form=await jsonBody(req,4000);
    if (!form || typeof form.password!=='string') return fail('Invalid request');
    if (!await equalSecrets(form.password,env.CMS_ADMIN_PASSWORD)) return fail('Incorrect password',401);
    await env.DB.prepare('DELETE FROM rate_limits WHERE actor_hash=? AND action=?').bind(actor,'login').run();
    return json({ok:true},200,{'Set-Cookie':await issueCookie(env)});
  }
  if (method==='POST' && path==='/api/admin/logout') return json({ok:true},200,{'Set-Cookie':'eason_cms=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});

  if (method==='GET' && path==='/api/comments') {
    const kind=url.searchParams.get('kind') || 'post', slug=url.searchParams.get('slug');
    if (!['post','work'].includes(kind) || !validSlug(slug)) return fail('Invalid article');
    const rows=await env.DB.prepare('SELECT id,parent_id,nickname,body,created FROM comments WHERE kind=? AND slug=? AND status=? ORDER BY created ASC LIMIT 250').bind(kind,slug,'approved').all();
    return json({comments:rows.results||[]});
  }
  if (method==='POST' && path==='/api/comments') {
    const form=await jsonBody(req,7000);
    const kind=form?.kind,slug=form?.slug;
    const nickname=safeText(form?.nickname,60),body=safeText(form?.body,1600);
    if (!['post','work'].includes(kind)||!validSlug(slug)||nickname.length<1||body.length<2) return fail('Invalid comment');
    const exists=await env.DB.prepare('SELECT slug FROM documents WHERE kind=? AND slug=? AND draft=0').bind(kind,slug).first();
    if (!exists) return fail('Article not found',404);
    const actor=await actorHash(req,env);
    if (!await quota(env.DB,actor,'comment',3,15*60000)) return fail('Please try again later',429);
    const parent=typeof form.parent_id==='string' && form.parent_id ? form.parent_id : null;
    if (parent) {
      const parentRow=await env.DB.prepare('SELECT id FROM comments WHERE id=? AND kind=? AND slug=? AND status=?').bind(parent,kind,slug,'approved').first();
      if(!parentRow) return fail('Invalid parent comment');
    }
    await env.DB.prepare('INSERT INTO comments(id,kind,slug,parent_id,nickname,body,status,created) VALUES(?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(),kind,slug,parent,nickname,body,'pending',new Date().toISOString()).run();
    return json({ok:true,status:'pending'},201);
  }

  if (method==='GET' && /^\/api\/(posts|works)$/.test(path)) {
    const kind=path==='/api/posts'?'post':'work';
    return json({items:await listDocs(env.DB,kind,false)});
  }
  const article=/^\/api\/(posts|works)\/([^/]+)$/.exec(path);
  if (method==='GET'&&article) {
    const kind=article[1]==='posts'?'post':'work',slug=decodeURIComponent(article[2]);
    if(!validSlug(slug))return fail('Invalid slug');
    const row=await env.DB.prepare('SELECT * FROM documents WHERE kind=? AND slug=? AND draft=0').bind(kind,slug).first();
    return row?json(publicDocument(row)):fail('Not found',404);
  }
  const page=/^\/api\/(homepage|about)$/.exec(path);
  if(method==='GET'&&page) {
    const row=await env.DB.prepare('SELECT value_json FROM settings WHERE key=?').bind(page[1]).first();
    return row?json(safeJsonParse(row.value_json,{})):fail('Content not yet imported',404);
  }
  const media=/^\/media\/([a-f\d-]{36})$/.exec(path);
  if (method==='GET'&&media) {
    if(!env.MEDIA)return fail('Media storage not configured',503);
    const asset=await env.MEDIA.get(media[1],'arrayBuffer');
    if(!asset)return fail('Image not found',404);
    // KV meta is only needed for MIME; store an adjacent type key.
    const mime=await env.MEDIA.get(media[1]+':type');
    return new Response(asset,{headers:{'Content-Type':mime||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=31536000,immutable'}});
  }

  if(!path.startsWith('/api/admin/'))return fail('Not found',404);
  if(!env.CMS_SESSION_SECRET)return fail('Auth not configured',503);
  if(!await authenticate(req,env))return fail('Login required',401);
  if(method==='GET' && path==='/api/admin/me')return json({authenticated:true});
  if(method==='GET' && path==='/api/admin/content') {
    const kind=url.searchParams.get('kind');
    if(!['post','work'].includes(kind))return fail('Invalid kind');
    return json({items:await listDocs(env.DB,kind,true)});
  }
  if(method==='PUT'&&path==='/api/admin/content') {
    const normalized=normalizeDocument(await jsonBody(req));
    if(!normalized)return fail('Invalid document. Published blog posts require a category and tag.');
    await env.DB.prepare(
      'INSERT INTO documents(kind,slug,title,description,body_markdown,categories_json,tags_json,date,updated,draft,pinned) VALUES(?,?,?,?,?,?,?,?,?,?,?) '+
      'ON CONFLICT(kind,slug) DO UPDATE SET title=excluded.title,description=excluded.description,body_markdown=excluded.body_markdown,categories_json=excluded.categories_json,tags_json=excluded.tags_json,date=excluded.date,updated=excluded.updated,draft=excluded.draft,pinned=excluded.pinned'
    ).bind(normalized.kind,normalized.slug,normalized.title,normalized.description,normalized.body_markdown,normalized.categories_json,normalized.tags_json,normalized.date,normalized.updated,normalized.draft,normalized.pinned).run();
    return json({ok:true,slug:normalized.slug});
  }
  const settings=/^\/api\/admin\/settings\/(homepage|about)$/.exec(path);
  if(method==='GET'&&settings) {
    const row=await env.DB.prepare('SELECT value_json FROM settings WHERE key=?').bind(settings[1]).first();
    return json(row?safeJsonParse(row.value_json,{}):{});
  }
  if(method==='PUT'&&settings) {
    const data=await jsonBody(req,100000);
    if(!data||typeof data!=='object'||Array.isArray(data))return fail('Invalid settings');
    const content=JSON.stringify(data);
    await env.DB.prepare('INSERT INTO settings(key,value_json,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated=excluded.updated').bind(settings[1],content,new Date().toISOString()).run();
    return json({ok:true});
  }
  if(method==='GET'&&path==='/api/admin/comments') {
    const rows=await env.DB.prepare('SELECT * FROM comments ORDER BY created DESC LIMIT 250').all();
    return json({comments:rows.results||[]});
  }
  if(method==='PUT'&&path==='/api/admin/comments') {
    const form=await jsonBody(req,1000);
    if(typeof form?.id!=='string'||!['approved','hidden','pending'].includes(form?.status))return fail('Invalid moderation');
    await env.DB.prepare('UPDATE comments SET status=? WHERE id=?').bind(form.status,form.id).run();
    return json({ok:true});
  }
  if(method==='POST'&&path==='/api/admin/media') {
    if(!env.MEDIA)return fail('Media storage not configured',503);
    const type=(req.headers.get('Content-Type')||'').split(';')[0].toLowerCase();
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(type))return fail('Only PNG/JPEG/WebP/GIF images',415);
    if(Number(req.headers.get('Content-Length')||0)>4500000)return fail('Image too large',413);
    const binary=await req.arrayBuffer();
    if(!binary.byteLength||binary.byteLength>4500000)return fail('Image too large',413);
    const key=crypto.randomUUID();
    await env.MEDIA.put(key,binary);
    await env.MEDIA.put(key+':type',type);
    return json({url:new URL('/media/'+key,url).toString()},201);
  }
  return fail('Not found',404);
}
export default {
  async fetch(request,env) {
    try { return await handle(request,env); }
    catch(err) { console.error('CMS request failed',err instanceof Error ? err.name : 'unknown'); return fail('Server error',500); }
  },
};
