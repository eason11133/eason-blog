import type { APIRoute } from 'astro';
import { BLOG_CMS_ORIGIN } from '../../../cloudflare/site-config.mjs';
export const prerender = import.meta.env.PUBLIC_EASON_LIVE !== 'true';
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export const POST:APIRoute=async({request,url})=>{
  if(import.meta.env.PUBLIC_EASON_LIVE!=='true')return json({error:'Unavailable'},405);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
  if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))return json({error:'Invalid content type'},415);
  if(Number(request.headers.get('Content-Length')||0)>6000)return json({error:'申請資料過長'},413);
  const body=await request.text();
  if(body.length>6000)return json({error:'申請資料過長'},413);
  try{
    const response=await fetch(BLOG_CMS_ORIGIN+'/api/friend-requests',{method:'POST',headers:{Origin:BLOG_CMS_ORIGIN,'Content-Type':'application/json'},body,cache:'no-store'});
    return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  }catch{return json({error:'暫時無法送出，請稍後再試'},503);}
};
