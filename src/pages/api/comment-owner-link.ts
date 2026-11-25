import type { APIRoute } from 'astro';
import { BLOG_CMS_ORIGIN } from '../../../cloudflare/site-config.mjs';
export const prerender=import.meta.env.PUBLIC_EASON_LIVE!=='true';
const json=(data:unknown,status:number)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export const POST:APIRoute=async({request,url})=>{
 if(import.meta.env.PUBLIC_EASON_LIVE!=='true')return json({error:'Unavailable'},405);
 if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
 if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'Invalid content type'},415);
 if(Number(request.headers.get('Content-Length')||0)>2000)return json({error:'Body too long'},413);
 const body=await request.text();if(body.length>2000)return json({error:'Body too long'},413);
 try{
  const r=await fetch(BLOG_CMS_ORIGIN+'/api/comment-owner/link',{method:'POST',headers:{Origin:BLOG_CMS_ORIGIN,'Content-Type':'application/json',Cookie:request.headers.get('Cookie')||''},body,cache:'no-store'});
  return new Response(r.body,{status:r.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
 }catch{return json({error:'暫時無法連結帳號'},503);}
};
