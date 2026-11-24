import type { APIRoute } from 'astro';
import { BLOG_CMS_ORIGIN } from '../../../cloudflare/site-config.mjs';

export const prerender = import.meta.env.PUBLIC_EASON_LIVE !== 'true';
const live = import.meta.env.PUBLIC_EASON_LIVE === 'true';
const json = (value:unknown,status=200) => new Response(JSON.stringify(value),{
  status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
});
function valid(kind:string|null,slug:string|null){
  return (kind==='post'||kind==='work') && !!slug && /^[a-zA-Z0-9\p{L}\p{N}_-]{1,120}$/u.test(slug);
}
export const GET:APIRoute = async ({url}) => {
  const kind=url.searchParams.get('kind'),slug=url.searchParams.get('slug');
  if(!valid(kind,slug))return json({error:'Invalid article'},400);
  if(!live)return json({views:0,counted:false});
  const upstream=new URL('/api/views',BLOG_CMS_ORIGIN);
  upstream.searchParams.set('kind',kind!);upstream.searchParams.set('slug',slug!);
  const response=await fetch(upstream,{headers:{Accept:'application/json'},cache:'no-store'});
  return new Response(response.body,{
    status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
  });
};
export const POST:APIRoute = async ({request,url}) => {
  if(!live)return json({error:'Unavailable'},405);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
  if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))return json({error:'Invalid content type'},415);
  if(Number(request.headers.get('Content-Length')||0)>1200)return json({error:'Body too long'},413);
  const body=await request.text();
  if(body.length>1200)return json({error:'Body too long'},413);
  let input:any;
  try{input=JSON.parse(body)}catch{return json({error:'Invalid JSON'},400)}
  if(!valid(input?.kind,input?.slug)||typeof input?.visitor!=='string'||!/^[a-f0-9-]{36}$/i.test(input.visitor))
    return json({error:'Invalid view data'},400);
  const response=await fetch(new URL('/api/views',BLOG_CMS_ORIGIN),{
    method:'POST',
    headers:{Origin:BLOG_CMS_ORIGIN,'Content-Type':'application/json'},
    body:JSON.stringify({kind:input.kind,slug:input.slug,visitor:input.visitor}),
    cache:'no-store',
  });
  return new Response(response.body,{
    status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
  });
};
