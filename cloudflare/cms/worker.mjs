import { adminHtml } from './admin.mjs';
import { commentUser, handleCommentAuth } from './comment-auth.mjs';
import { handleViews } from './views.mjs';
import { handleCommentManagement, notifyVisitorComment } from './comment-management.mjs';
import { normalizeDocument, publicDocument, validSlug, safeText, safeJsonParse, normalizeFooterLinks } from './utils.mjs';

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
// Friend links are stored separately from posts, homepage and about.
function normalizeFriendAvatar(value, allowLocal=true) {
  if(value==null||value==='')return '';
  if(typeof value!=='string'||value.length>1500)return null;
  value=value.trim();
  if(!value)return '';
  if(allowLocal&&/^\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))return value;
  try{
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||/\.(localhost|local|internal|test)$/i.test(u.hostname)&&!u.hostname.endsWith('.test'))return null;
    return u.href.length<=1500?u.href:null;
  }catch{return null;}
}
function normalizeFriendSites(items) {
  if (!Array.isArray(items) || items.length > 60) return null;
  const normalized = [];
  const seen = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    if (typeof item.name !== 'string' || typeof item.url !== 'string') return null;
    if (item.description != null && typeof item.description !== 'string') return null;
    const name = item.name.trim();
    const rawUrl = item.url.trim();
    const description = (item.description || '').trim();
    if (!name || name.length > 100 || !rawUrl || rawUrl.length > 1500 || description.length > 300) return null;
    let parsed;
    try { parsed = new URL(rawUrl); } catch { return null; }
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return null;
    const url = parsed.toString();
    if (seen.has(url)) return null;
    seen.add(url);
    const avatar = normalizeFriendAvatar(item.avatar);
    if (avatar===null) return null;
    normalized.push({ name, url, description, ...(avatar ? { avatar } : {}) });
  }
  return normalized;
}
async function listFriendSites(db) {
  const row = await db.prepare('SELECT links_json FROM friend_sites WHERE singleton=1').first();
  return normalizeFriendSites(safeJsonParse(row?.links_json || '[]', [])) || [];
}
async function getFooterLinks(db) {
  const row = await db.prepare('SELECT links_json FROM footer_links WHERE singleton=1').first();
  return normalizeFooterLinks(safeJsonParse(row?.links_json || '{}', {})) ||
    { github:'', email:'', instagram:'', discord:'' };
}
async function listDocs(db, kind, admin) {
  const sql = admin ?
    'SELECT * FROM documents WHERE kind=? ORDER BY pinned DESC,date DESC LIMIT 200' :
    'SELECT * FROM documents WHERE kind=? AND draft=0 ORDER BY pinned DESC,date DESC LIMIT 200';
  const out = await db.prepare(sql).bind(kind).all();
  return (out.results || []).map(publicDocument);
}
async function handle(req,env,ctx) {
  const url=new URL(req.url), path=url.pathname, method=req.method.toUpperCase();
  if (method==='GET' && path==='/health') return json({ok:true,service:'eason-blog-cms',storage:'D1'});
  if (method==='GET' && (path==='/admin' || path==='/admin/')) return new Response(adminHtml,{
    headers:{'Content-Type':'text/html; charset=utf-8',...noStore,
      'X-Frame-Options':'DENY', 'Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'none'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' data:; img-src 'self' https: data: blob:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"},
  });
  if (!env.DB) return fail('Database not configured',503);
  if (path.startsWith('/api/auth/')) {
    if (method==='POST' && !sameOriginWrite(req,url)) return fail('Invalid request origin',403);
    const auth=await handleCommentAuth(req,env,url,path,method);
    if(auth)return auth;
  }
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

  if (path==='/api/views') return handleViews(req,env,url);

  if(path==='/api/comment-owner/link'){
    const result=await handleCommentManagement(req,env,url,path,method,{json,fail,jsonBody,signToken,commentUser,safeText,validSlug});
    if(result)return result;
  }
  if (method==='GET' && path==='/api/comments') {
    const kind=url.searchParams.get('kind') || 'post', slug=url.searchParams.get('slug');
    if (!['post','work'].includes(kind) || !validSlug(slug)) return fail('Invalid article');
    const rows=await env.DB.prepare('SELECT id,parent_id,nickname,body,created,avatar_url,auth_provider FROM comments WHERE kind=? AND slug=? AND status=? ORDER BY created ASC LIMIT 250').bind(kind,slug,'approved').all();
    return json({comments:rows.results||[]});
  }
  if (method==='POST' && path==='/api/comments') {
    const form=await jsonBody(req,7000);
    const kind=form?.kind,slug=form?.slug;
    const user=await commentUser(req,env);
    if(!user)return fail('請先使用 GitHub 或 Google 登入',401);
    const nickname=user.name,body=safeText(form?.body,1600);
    if (!['post','work'].includes(kind)||!validSlug(slug)||body.length<2) return fail('Invalid comment');
    const exists=await env.DB.prepare('SELECT slug FROM documents WHERE kind=? AND slug=? AND draft=0').bind(kind,slug).first();
    if (!exists) return fail('Article not found',404);
    const actor=await actorHash(req,env);
    if (!await quota(env.DB,actor,'comment',5,15*60000)) return fail('Please try again later',429);
    const parent=typeof form.parent_id==='string' && form.parent_id ? form.parent_id : null;
    if (parent) {
      const parentRow=await env.DB.prepare('SELECT id FROM comments WHERE id=? AND kind=? AND slug=? AND status=?').bind(parent,kind,slug,'approved').first();
      if(!parentRow) return fail('Invalid parent comment');
    }
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO comments(id,kind,slug,parent_id,nickname,body,status,created,auth_provider,auth_user_id,avatar_url) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id,kind,slug,parent,nickname,body,'approved',new Date().toISOString(),user.provider,user.id,user.avatar).run();
    if(env.COMMENT_DISCORD_WEBHOOK || (env.COMMENT_LINE_ACCESS_TOKEN && env.COMMENT_LINE_USER_ID)){
      const task=(async()=>{const doc=await env.DB.prepare('SELECT title FROM documents WHERE kind=? AND slug=?').bind(kind,slug).first();await notifyVisitorComment(env,{id,kind,slug,user,title:doc?.title||slug});})().catch(()=>{});
      if(ctx?.waitUntil)ctx.waitUntil(task);else await task;
    }
    return json({ok:true,status:'approved'},201);
  }

  if (method==='GET' && path==='/api/footer-links') return json(await getFooterLinks(env.DB));
  if (method==='GET' && path==='/api/friends') return json({sites:await listFriendSites(env.DB)});
  if (method==='POST' && path==='/api/friend-requests') {
    if(!env.CMS_SESSION_SECRET)return fail('申請功能暫時無法使用',503);
    const actor=await actorHash(req,env);
    if(!await quota(env.DB,actor,'friend-request',5,15*60000))return fail('送出次數太多，請稍後再試',429);
    const input=await jsonBody(req,6000);
    if(!input||typeof input!=='object'||Array.isArray(input))return fail('申請資料不正確');
    if(input.website_check)return fail('申請資料不正確');
    const avatar=normalizeFriendAvatar(input.avatar,false);
    if(avatar===null)return fail('圖片網址須為有效的 HTTPS 網址');
    const site=normalizeFriendSites([{name:input.name,url:input.url,description:input.description,avatar}])?.[0];
    const contact=typeof input.contact==='string'?input.contact.trim():'';
    if(!site||!site.description||contact.length>300)return fail('請填寫網站名稱、完整網址及介紹');
    const existing=await listFriendSites(env.DB);
    if(existing.some(item=>item.url===site.url))return fail('這個網站已經在友站列表中',409);
    const pending=await env.DB.prepare("SELECT id FROM friend_requests WHERE url=? AND status='pending'").bind(site.url).first();
    if(pending)return fail('這個網站已有待審核的申請',409);
    const count=await env.DB.prepare("SELECT COUNT(*) AS total FROM friend_requests WHERE status='pending'").first();
    if(Number(count?.total)>=100)return fail('目前待審核申請較多，請稍後再試',429);
    try {
      await env.DB.prepare("INSERT INTO friend_requests(id,name,url,description,contact,avatar,status,created) SELECT ?,?,?,?,?,?,'pending',? WHERE (SELECT COUNT(*) FROM friend_requests WHERE status='pending')<100 AND NOT EXISTS(SELECT 1 FROM friend_sites,json_each(links_json) WHERE singleton=1 AND json_extract(json_each.value,'$.url')=?)")
        .bind(crypto.randomUUID(),site.name,site.url,site.description,contact,avatar,new Date().toISOString(),site.url).run().then(result=>{if(result.meta?.changes===0)throw new Error('request_not_inserted');});
    }catch(error){
      if(/UNIQUE constraint failed/i.test(String(error)))return fail('這個網站已有待審核的申請',409);
      if(String(error).includes('request_not_inserted'))return fail('暫時無法新增申請，請重新整理後再試',409);
      throw error;
    }
    return json({ok:true},201);
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
  if(path.startsWith('/api/admin/comment-')){
    const result=await handleCommentManagement(req,env,url,path,method,{json,fail,jsonBody,signToken,commentUser,safeText,validSlug});
    if(result)return result;
  }
  if (method==='GET' && path==='/api/admin/footer-links') return json(await getFooterLinks(env.DB));
  if (method==='PUT' && path==='/api/admin/footer-links') {
    const links = normalizeFooterLinks(await jsonBody(req,10000));
    if (!links) return fail('連結格式不正確，請填寫完整的 HTTP/HTTPS 網址或有效的 Email 地址。');
    await env.DB.prepare(
      'INSERT INTO footer_links(singleton,links_json,updated) VALUES(1,?,?) '+
      'ON CONFLICT(singleton) DO UPDATE SET links_json=excluded.links_json,updated=excluded.updated'
    ).bind(JSON.stringify(links),new Date().toISOString()).run();
    return json({ok:true});
  }
  if(method==='GET' && path==='/api/admin/friend-requests') {
    const result=await env.DB.prepare("SELECT id,name,url,description,contact,avatar,status,created,reviewed FROM friend_requests WHERE status='pending' ORDER BY created ASC LIMIT 100").all();
    return json({requests:result.results||[]});
  }
  if(method==='PUT' && path==='/api/admin/friend-requests') {
    const input=await jsonBody(req,2000);
    if(typeof input?.id!=='string'||!['approved','rejected'].includes(input.status))return fail('無效的審核操作');
    try{
      const result=await env.DB.prepare("UPDATE friend_requests SET status=?,reviewed=? WHERE id=? AND status='pending'")
        .bind(input.status,new Date().toISOString(),input.id).run();
      if(!result.meta?.changes)return fail('這筆申請已處理或不存在',409);
      return json({ok:true});
    }catch(error){
      if(String(error).includes('friend_already_exists'))return fail('這個網址已在友站列表，請拒絕重複申請',409);
      if(String(error).includes('friend_list_full'))return fail('友站已達60筆，請先移除一筆',409);
      throw error;
    }
  }
  if(method==='PUT' && path==='/api/admin/friends') {
    const input=await jsonBody(req,280000);
    const sites=normalizeFriendSites(input?.sites);
    if(!sites)return fail('友站資料有誤：請確認名稱、網址及是否重複（最多 60 筆）');
    await env.DB.prepare(
      'INSERT INTO friend_sites(singleton,links_json,updated) VALUES(1,?,?) '+
      'ON CONFLICT(singleton) DO UPDATE SET links_json=excluded.links_json,updated=excluded.updated'
    ).bind(JSON.stringify(sites),new Date().toISOString()).run();
    return json({ok:true,sites});
  }
  if(method==='GET' && path==='/api/admin/content') {
    const kind=url.searchParams.get('kind');
    if(!['post','work'].includes(kind))return fail('Invalid kind');
    return json({items:await listDocs(env.DB,kind,true)});
  }
  if(method==='DELETE'&&path==='/api/admin/content') {
    const input=await jsonBody(req,2000),kind=input?.kind,slug=input?.slug;
    if(!['post','work'].includes(kind)||!validSlug(slug))return fail('無效的文章或作品');
    const doc=await env.DB.prepare('SELECT slug FROM documents WHERE kind=? AND slug=?').bind(kind,slug).first();
    if(!doc)return fail('找不到文章或作品',404);
    // D1 batch is transactional. Remove only the selected document and related records.
    const results=await env.DB.batch([
      env.DB.prepare('DELETE FROM documents WHERE kind=? AND slug=?').bind(kind,slug),
      env.DB.prepare('UPDATE comments SET parent_id=NULL WHERE parent_id IN (SELECT id FROM comments WHERE kind=? AND slug=?)').bind(kind,slug),
      env.DB.prepare('DELETE FROM comments WHERE kind=? AND slug=?').bind(kind,slug),
      env.DB.prepare('DELETE FROM page_views WHERE kind=? AND slug=?').bind(kind,slug),
      env.DB.prepare('DELETE FROM rate_limits WHERE action=?').bind('view:'+kind+':'+slug)
    ]);
    if(!results[0]?.meta?.changes)return fail('找不到文章或作品',404);
    return json({ok:true});
  }
  if(method==='PUT'&&path==='/api/admin/content') {
    const normalized=normalizeDocument(await jsonBody(req));
    if(!normalized)return fail('文章資料不正確，請檢查標題、網址代碼及日期。');
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
  async fetch(request,env,ctx) {
    try { return await handle(request,env,ctx); }
    catch(err) { console.error('CMS request failed',err instanceof Error ? err.name : 'unknown'); return fail('Server error',500); }
  },
};
