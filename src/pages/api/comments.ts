import type { APIRoute } from 'astro';

export const prerender = import.meta.env.PUBLIC_EASON_LIVE !== 'true';
const CMS_ORIGIN = 'https://eason-blog.eason456h.workers.dev';
const json = (data: unknown, status=200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ url }) => {
  if (import.meta.env.PUBLIC_EASON_LIVE !== 'true') return json({ comments: [] });
  const kind=url.searchParams.get('kind') || 'post', slug=url.searchParams.get('slug')||'';
  if (!['post','work'].includes(kind) || !/^[a-zA-Z0-9\p{L}\p{N}_-]{1,120}$/u.test(slug)) return json({ error:'無效的文章網址' },400);
  const upstream=new URL('/api/comments',CMS_ORIGIN);
  upstream.searchParams.set('kind',kind);
  upstream.searchParams.set('slug',slug);
  const response=await fetch(upstream.toString(), {headers:{Accept:'application/json'},cache:'no-store'});
  return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
};

export const POST: APIRoute = async ({ request, url }) => {
  if (import.meta.env.PUBLIC_EASON_LIVE !== 'true') return json({error:'Unavailable'},405);
  if (request.headers.get('Origin')!==url.origin) return json({error:'Invalid origin'},403);
  if (!(request.headers.get('Content-Type')||'').startsWith('application/json')) return json({error:'Unsupported content type'},415);
  const size = Number(request.headers.get('Content-Length')||0);
  if(size>7000) return json({error:'留言太長'},413);
  const body=await request.text();
  if(body.length>7000) return json({error:'留言太長'},413);
  const response=await fetch(CMS_ORIGIN+'/api/comments',{
    method:'POST',
    headers:{Origin:CMS_ORIGIN,'Content-Type':'application/json'},
    body
  });
  return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
};
