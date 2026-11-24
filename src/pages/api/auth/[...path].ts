// Same-origin visitor OAuth proxy. Cookies are set on the public site, never CMS origin.
// CMS owns secrets, code exchange, and session HMAC verification.
import type { APIRoute } from 'astro';
export const prerender = import.meta.env.PUBLIC_EASON_LIVE !== 'true';
// The non-Cloudflare static build needs concrete paths for this catch-all route.
export function getStaticPaths() {
  return ['me','logout','github','google','github/callback','google/callback'].map(path=>({params:{path}}));
}
const CMS = 'https://eason-blog.eason456h.workers.dev';
const unavailable = () => new Response(JSON.stringify({error:'訪客登入目前只開放在 Cloudflare 動態網站'}),{status:503,headers:{'Content-Type':'application/json; charset=utf-8'}});
async function forward(request:Request, params:Record<string,string|undefined>, method:'GET'|'POST') {
  if (import.meta.env.PUBLIC_EASON_LIVE !== 'true') return unavailable();
  const suffix=params.path || '';
  if (!/^(me|logout|github(?:\/callback)?|google(?:\/callback)?)$/.test(suffix)) return new Response('Not found',{status:404});
  const url=new URL(request.url);
  const upstream=new URL('/api/auth/'+suffix,CMS);
  upstream.search=url.search;
  const headers=new Headers({Accept:'application/json',Cookie:request.headers.get('Cookie')||''});
  if(method==='POST'){
    if (request.headers.get('Origin')!==url.origin) return new Response('Invalid origin',{status:403});
    headers.set('Origin',CMS);
  }
  const response=await fetch(upstream.toString(),{method,headers,redirect:'manual',cache:'no-store'});
  const responseHeaders=new Headers({'Cache-Control':'no-store'});
  for(const name of ['Content-Type','Location']) {
    const value=response.headers.get(name);
    if(value)responseHeaders.set(name,value);
  }
  // Preserve separate state/session Set-Cookie headers across the Worker proxy.
  for(const value of response.headers.getSetCookie?.() || [])responseHeaders.append('Set-Cookie',value);
  if(!responseHeaders.has('Set-Cookie')) {
    const value=response.headers.get('Set-Cookie');
    if(value)responseHeaders.set('Set-Cookie',value);
  }
  // Only the public origin is allowed for redirects in this flow.
  const location=responseHeaders.get('Location');
  if(location && !(location.startsWith('https://github.com/') || location.startsWith('https://accounts.google.com/') || location.startsWith(url.origin+'/'))) {
    return new Response('Invalid redirect',{status:502});
  }
  return new Response(response.body,{status:response.status,headers:responseHeaders});
}
export const GET:APIRoute = ({request,params})=>forward(request,params,'GET');
export const POST:APIRoute = ({request,params})=>forward(request,params,'POST');
