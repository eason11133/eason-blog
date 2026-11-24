import { validSlug } from './utils.mjs';

const json = (body,status=200) => new Response(JSON.stringify(body),{
  status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});
export async function handleViews(request,env,url){
  const method=request.method.toUpperCase();
  if(method!=='GET' && method!=='POST')return json({error:'Method not allowed'},405);
  if(method==='POST' && request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
  let kind,slug,visitor;
  if(method==='GET'){
    kind=url.searchParams.get('kind');
    slug=url.searchParams.get('slug');
  } else {
    if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))return json({error:'Unsupported content type'},415);
    if(Number(request.headers.get('Content-Length')||0)>1200)return json({error:'Body too long'},413);
    const raw=await request.text();
    if(raw.length>1200)return json({error:'Body too long'},413);
    let body;
    try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
    kind=body?.kind;slug=body?.slug;visitor=body?.visitor;
  }
  if(!['post','work'].includes(kind)||!validSlug(slug))return json({error:'Invalid article'},400);
  const document=await env.DB.prepare('SELECT slug FROM documents WHERE kind=? AND slug=? AND draft=0').bind(kind,slug).first();
  if(!document)return json({error:'Not found'},404);
  let counted=false;
  if(method==='POST'){
    if(typeof visitor!=='string'||!/^[a-f0-9-]{36}$/i.test(visitor))return json({error:'Invalid visitor session'},400);
    if(!env.CMS_SESSION_SECRET)return json({error:'View counting not configured'},503);
    // Only hash an ephemeral, per-tab session UUID. No raw IP, email or cookie is stored.
    const encoded=new TextEncoder().encode('view-session-v1:'+env.CMS_SESSION_SECRET+':'+visitor);
    const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',encoded));
    const actor=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    const action='view:'+kind+':'+slug;
    const now=Date.now();
    const recorded=await env.DB.prepare(
      'INSERT INTO rate_limits(actor_hash,action,count,window_start) VALUES(?,?,1,?) ON CONFLICT(actor_hash,action) DO NOTHING'
    ).bind(actor,action,now).run();
    counted=Number(recorded.meta?.changes||0)>0;
    if(counted)await env.DB.prepare(
      'INSERT INTO page_views(kind,slug,views) VALUES(?,?,1) ON CONFLICT(kind,slug) DO UPDATE SET views=views+1'
    ).bind(kind,slug).run();
  }
  const row=await env.DB.prepare('SELECT views FROM page_views WHERE kind=? AND slug=?').bind(kind,slug).first();
  return json({views:Math.max(0,Number(row?.views||0)),counted});
}
