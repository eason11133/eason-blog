// Public visitor OAuth for comments. This is separate from the CMS admin login.
const enc = new TextEncoder();
const dec = new TextDecoder();
const publicOrigin = 'https://eason-blog-web-live.eason456h.workers.dev';
const json = (data,status=200,headers={}) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
function siteOrigin(env) {
  const origin=env.COMMENT_SITE_ORIGIN || publicOrigin;
  try { const u=new URL(origin); return u.protocol==='https:' && u.origin===origin.replace(/\/$/,'') ? u.origin : publicOrigin; }
  catch { return publicOrigin; }
}
function b64(bytes) { return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''); }
function unb64(s) { const t=s.replaceAll('-','+').replaceAll('_','/'); return Uint8Array.from(atob(t.padEnd(Math.ceil(t.length/4)*4,'=')),c=>c.charCodeAt(0)); }
async function key(secret) { return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']); }
async function signed(env,object) {
  const payload=b64(enc.encode(JSON.stringify(object)));
  const signature=await crypto.subtle.sign('HMAC',await key(env.CMS_SESSION_SECRET),enc.encode('blog-comment:'+payload));
  return payload+'.'+b64(new Uint8Array(signature));
}
async function verified(env,value) {
  if (!env.CMS_SESSION_SECRET || typeof value!=='string' || value.length>2400) return null;
  const parts=value.split('.');
  if(parts.length!==2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  try {
    const good=await crypto.subtle.verify('HMAC',await key(env.CMS_SESSION_SECRET),unb64(parts[1]),enc.encode('blog-comment:'+parts[0]));
    if(!good)return null;
    const payload=JSON.parse(dec.decode(unb64(parts[0])));
    if(!payload || !Number.isFinite(payload.exp) || payload.exp<Date.now())return null;
    return payload;
  } catch { return null; }
}
function cookie(req,name) {
  const raw=req.headers.get('Cookie') || '';
  return raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1) || '';
}
function safeReturn(path) {
  return typeof path==='string' && path.length<260 && /^\/(blog|experience)\/[^\s?#]+$/.test(path) && !path.includes('//')
    ? path : '/blog/';
}
function providerConfig(env,provider) {
  const id=provider==='github'?env.GITHUB_OAUTH_CLIENT_ID:env.GOOGLE_OAUTH_CLIENT_ID;
  const secret=provider==='github'?env.GITHUB_OAUTH_CLIENT_SECRET:env.GOOGLE_OAUTH_CLIENT_SECRET;
  return id && secret ? {id,secret} : null;
}
function safeAvatar(value) {
  if(typeof value!=='string' || value.length>500)return '';
  try {
    const url=new URL(value);
    return url.protocol==='https:' && ['avatars.githubusercontent.com','lh3.googleusercontent.com','lh4.googleusercontent.com','lh5.googleusercontent.com','lh6.googleusercontent.com'].includes(url.hostname) ? url.href : '';
  } catch { return ''; }
}
export async function commentUser(req,env) {
  const data=await verified(env,cookie(req,'eason_comment_session'));
  if(data?.type!=='session'||!['github','google'].includes(data.provider)||typeof data.id!=='string'||!data.id || typeof data.name!=='string')return null;
  return {provider:data.provider,id:data.id,name:data.name.slice(0,60),avatar:safeAvatar(data.avatar)};
}
function oauthRedirect(to,headers={}) { return new Response(null,{status:302,headers:{Location:to,'Cache-Control':'no-store',...headers}}); }
const stateCookie='; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=600';
const sessionCookie='; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1209600';
async function begin(req,env,url,provider) {
  const cfg=providerConfig(env,provider);
  if(!cfg || !env.CMS_SESSION_SECRET)return json({error:'此登入方式尚未設定'},503);
  const nonce=b64(crypto.getRandomValues(new Uint8Array(24)));
  const back=safeReturn(url.searchParams.get('return') || '');
  const state=await signed(env,{type:'state',provider,nonce,back,exp:Date.now()+600000});
  const redirectUri=siteOrigin(env)+'/api/auth/'+provider+'/callback';
  const target=new URL(provider==='github'?'https://github.com/login/oauth/authorize':'https://accounts.google.com/o/oauth2/v2/auth');
  target.searchParams.set('client_id',cfg.id);
  target.searchParams.set('redirect_uri',redirectUri);
  target.searchParams.set('state',nonce);
  if(provider==='google') {
    target.searchParams.set('response_type','code');
    target.searchParams.set('scope','openid profile');
  }
  return oauthRedirect(target.toString(),{'Set-Cookie':'eason_comment_state='+state+stateCookie});
}
async function exchange(provider,cfg,code,redirectUri) {
  const tokenUrl=provider==='github'?'https://github.com/login/oauth/access_token':'https://oauth2.googleapis.com/token';
  const requestData=new URLSearchParams({client_id:cfg.id,client_secret:cfg.secret,code,redirect_uri:redirectUri});
  if(provider==='google')requestData.set('grant_type','authorization_code');
  const response=await fetch(tokenUrl,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded'},body:requestData.toString()});
  if(!response.ok)throw new Error('OAuth token exchange failed');
  const data=await response.json();
  if(!data.access_token || data.error)throw new Error('OAuth token missing');
  const userUrl=provider==='github'?'https://api.github.com/user':'https://openidconnect.googleapis.com/v1/userinfo';
  const userResponse=await fetch(userUrl,{headers:{Authorization:'Bearer '+data.access_token,Accept:'application/json',...(provider==='github'?{'User-Agent':'eason-blog-comments'}:{})}});
  if(!userResponse.ok)throw new Error('OAuth user lookup failed');
  const user=await userResponse.json();
  const id=provider==='github'?user.id:user.sub;
  if((typeof id!=='number' && typeof id!=='string') || !String(id).trim())throw new Error('OAuth identity unavailable');
  const name=String((provider==='github'?(user.login||user.name):(user.name||user.given_name)) || (provider==='github'?'GitHub 使用者':'Google 使用者')).trim().slice(0,60);
  return {provider,id:String(id),name,avatar:safeAvatar(provider==='github'?user.avatar_url:user.picture)};
}
async function callback(req,env,url,provider) {
  const state=await verified(env,cookie(req,'eason_comment_state'));
  if(state?.type!=='state'||state.provider!==provider||url.searchParams.get('state')!==state.nonce)return json({error:'登入驗證已過期，請重新登入'},400);
  const back=siteOrigin(env)+safeReturn(state.back);
  if(url.searchParams.has('error'))return oauthRedirect(back+'?comment_auth=cancelled');
  const code=url.searchParams.get('code') || '';
  if(!code || code.length>2048)return json({error:'登入回傳內容無效'},400);
  const cfg=providerConfig(env,provider);
  if(!cfg)return json({error:'此登入方式尚未設定'},503);
  let user;
  try { user=await exchange(provider,cfg,code,siteOrigin(env)+'/api/auth/'+provider+'/callback'); }
  catch(error) { console.error('Public comment OAuth failed',error instanceof Error?error.message:'unknown'); return oauthRedirect(back+'?comment_auth=failed'); }
  const session=await signed(env,{type:'session',...user,exp:Date.now()+14*86400000});
  const headers=new Headers({Location:back,'Cache-Control':'no-store'});
  headers.append('Set-Cookie','eason_comment_session='+session+sessionCookie);
  headers.append('Set-Cookie','eason_comment_state=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=0');
  return new Response(null,{status:302,headers});
}
export async function handleCommentAuth(req,env,url,path,method) {
  if(method==='GET' && path==='/api/auth/me')return json({
    user:await commentUser(req,env),
    providers:{github:!!providerConfig(env,'github'),google:!!providerConfig(env,'google')},
  });
  const start=/^\/api\/auth\/(github|google)$/.exec(path);
  if(method==='GET' && start)return begin(req,env,url,start[1]);
  const done=/^\/api\/auth\/(github|google)\/callback$/.exec(path);
  if(method==='GET' && done)return callback(req,env,url,done[1]);
  if(method==='POST' && path==='/api/auth/logout')return json({ok:true},200,{'Set-Cookie':'eason_comment_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'});
  return null;
}
