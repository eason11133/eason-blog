import { COMMENT_PUBLIC_SITE_ORIGIN } from '../site-config.mjs';
const asOwner=row=>row?.provider&&row?.user_id?{provider:row.provider,id:row.user_id,name:row.name,avatar:row.avatar||''}:null;
const now=()=>new Date().toISOString();
const configured=env=>({line:!!(env.COMMENT_LINE_ACCESS_TOKEN&&env.COMMENT_LINE_USER_ID),discord:!!env.COMMENT_DISCORD_WEBHOOK});
async function notificationChannel(env){
  const row=await env.DB.prepare('SELECT channel FROM comment_notification_settings WHERE singleton=1').first();
  const channel=row?.channel||'off';
  return configured(env)[channel]?channel:'off';
}
class NotificationError extends Error {}
function lineCredentials(env){
  const token=String(env.COMMENT_LINE_ACCESS_TOKEN||'').trim();
  const userId=String(env.COMMENT_LINE_USER_ID||'').trim();
  if(!token||!userId)throw new NotificationError('LINE 憑證尚未完整設定');
  if(!/^U[0-9a-f]{32}$/i.test(userId)||!userId.startsWith('U'))throw new NotificationError('LINE User ID 格式錯誤：須為 U 開頭加 32 個十六進位字元，請複製 Basic settings 的 Your user ID，而非 LINE ID 或 Channel ID');
  return {token,userId};
}
function notificationError(channel,stage,status){
  const prefix=(channel==='line'?'LINE':'Discord')+' '+stage+'（HTTP '+status+'）：';
  if(channel==='line'){
    if(status===401)return new NotificationError(prefix+'Channel access token 無效或已失效，請確認不是 Channel secret，並確認是 Eason Blog 的 token。');
    if(status===403)return new NotificationError(prefix+'官方帳號或 token 沒有執行此操作的權限。');
    if(status===404&&stage==='接收者檢查')return new NotificationError(prefix+'找不到接收者。確認 Your user ID 來自同一個 Provider，且已加入此官方帳號好友、沒有封鎖，並允許個人資料存取。');
    if(status===400)return new NotificationError(prefix+'LINE 拒絕了請求，請確認接收者 ID 與官方帳號設定。');
    if(status===429)return new NotificationError(prefix+'已達發送額度或頻率限制，請檢查官方帳號的訊息用量。');
  }
  return new NotificationError(prefix+'服務拒絕請求，請檢查通知服務設定。');
}
async function notificationFetch(target,init,channel,stage){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    // workerd rejects redirect:'error' at request construction.
    // Manual mode prevents bearer credentials from following any redirect.
    const res=await fetch(target,{...init,redirect:'manual',signal:controller.signal});
    if(res.status>=300&&res.status<400)throw new NotificationError((channel==='line'?'LINE':'Discord')+' '+stage+'：服務回傳重新導向（HTTP '+res.status+'），已停止請求以保護憑證。');
    if(!res.ok)throw notificationError(channel,stage,res.status);
    return res;
  }catch(error){
    if(error instanceof NotificationError)throw error;
    throw new NotificationError((channel==='line'?'LINE':'Discord')+' '+stage+'：'+(controller.signal.aborted?'請求逾時':'連線失敗，未取得 HTTP 回應')+'。');
  }finally{clearTimeout(timer);}
}
export async function checkLineRecipient(env){
  const {token,userId}=lineCredentials(env);
  const headers={Authorization:'Bearer '+token};
  await notificationFetch('https://api.line.me/v2/bot/info',{method:'GET',headers},'line','官方帳號驗證');
  await notificationFetch('https://api.line.me/v2/bot/profile/'+encodeURIComponent(userId),{method:'GET',headers},'line','接收者檢查');
}
export async function sendCommentNotification(env,channel,message){
  let target,headers={'Content-Type':'application/json'},body;
  if(channel==='line'&&configured(env).line){
    target='https://api.line.me/v2/bot/message/push';
    const {token,userId}=lineCredentials(env);
    headers.Authorization='Bearer '+token;
    body={to:userId,messages:[{type:'text',text:message}]};
  }else if(channel==='discord'&&configured(env).discord){
    const url=new URL(env.COMMENT_DISCORD_WEBHOOK);
    if(url.protocol!=='https:'||url.hostname!=='discord.com'||url.username||url.password||!/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname))throw Error('Invalid Discord webhook');
    url.search='?wait=true';url.hash='';target=url.href;
    body={content:message,allowed_mentions:{parse:[]},flags:4};
  }else throw Error('Notification not configured');
  await notificationFetch(target,{method:'POST',headers,body:JSON.stringify(body)},channel,'推播');
}
async function setNotification(env,id,status){
  await env.DB.prepare('UPDATE comments SET notification_status=? WHERE id=?').bind(status,id).run();
}
async function deliver(env,comment,channel){
  const article=COMMENT_PUBLIC_SITE_ORIGIN+(comment.kind==='work'?'/experience/':'/blog/')+encodeURIComponent(comment.slug)+'/';
  // Only send the article title and link to the selected private notification channel.
  // Visitor names, account identifiers and message contents stay in D1.
  const message='Eason Blog 有新留言'+String.fromCharCode(10)+String(comment.title||comment.slug).slice(0,200)+String.fromCharCode(10)+article;
  try{await sendCommentNotification(env,channel,message);await setNotification(env,comment.id,'sent');return true;}
  catch{await setNotification(env,comment.id,'failed');return false;}
}
export async function notifyVisitorComment(env,comment){
  try{
    const owner=asOwner(await env.DB.prepare('SELECT provider,user_id,name,avatar FROM comment_owner WHERE singleton=1').first());
    if(owner&&owner.provider===comment.user.provider&&owner.id===comment.user.id){await setNotification(env,comment.id,'owner');return;}
    const channel=await notificationChannel(env);if(channel==='off')return;
    await setNotification(env,comment.id,'pending');
    await deliver(env,comment,channel);
  }catch{try{await setNotification(env,comment.id,'failed');}catch{}}
}
export async function handleCommentManagement(req,env,url,path,method,h){
 const {json,fail,jsonBody,signToken,commentUser,safeText,validSlug}=h;
 const db=env.DB;
 const owner=async()=>asOwner(await db.prepare('SELECT provider,user_id,name,avatar FROM comment_owner WHERE singleton=1').first());
 if(path==='/api/comment-owner/link'&&method==='POST'){
   const user=await commentUser(req,env);if(!user)return fail('請先登入 Google 或 GitHub',401);
   const input=await jsonBody(req,2000);
   if(typeof input?.code!=='string'||!/^[a-f0-9-]{36}$/.test(input.code))return fail('連結已失效');
   const hash=await signToken('comment-owner-pair:'+input.code,env.CMS_SESSION_SECRET);
   const result=await db.prepare('UPDATE comment_owner SET provider=?,user_id=?,name=?,avatar=?,paired_at=?,pair_hash=NULL,pair_expires=NULL WHERE singleton=1 AND pair_hash=? AND pair_expires>?')
     .bind(user.provider,user.id,user.name,user.avatar,now(),hash,Date.now()).run();
   if(!result.meta?.changes)return fail('連結已使用或過期，請回後台重新產生',409);
   return json({ok:true});
 }
 if(path==='/api/admin/comment-owner'&&method==='GET')return json({owner:await owner()});
 if(path==='/api/admin/comment-owner'&&method==='POST'){
   const code=crypto.randomUUID(),hash=await signToken('comment-owner-pair:'+code,env.CMS_SESSION_SECRET);
   await db.prepare('UPDATE comment_owner SET pair_hash=?,pair_expires=? WHERE singleton=1').bind(hash,Date.now()+600000).run();
   return json({url:COMMENT_PUBLIC_SITE_ORIGIN+'/comment-account/#'+code});
 }
 if(path==='/api/admin/comment-owner'&&method==='DELETE'){
   await db.prepare('UPDATE comment_owner SET provider=NULL,user_id=NULL,name=NULL,avatar=NULL,paired_at=NULL,pair_hash=NULL,pair_expires=NULL WHERE singleton=1').run();
   return json({ok:true});
 }
 if(path==='/api/admin/comment-inbox'&&method==='GET'){
   const docs=await db.prepare("SELECT d.kind,d.slug,d.title,d.draft,COUNT(c.id) AS total,SUM(CASE WHEN c.id IS NOT NULL AND c.read_at IS NULL THEN 1 ELSE 0 END) AS unread FROM documents d LEFT JOIN comments c ON d.kind=c.kind AND d.slug=c.slug WHERE d.draft=0 OR c.id IS NOT NULL GROUP BY d.kind,d.slug,d.title,d.draft ORDER BY unread DESC,d.date DESC").all();
   const conditions=[],params=[];
   const kind=url.searchParams.get('kind'),slug=url.searchParams.get('slug'),status=url.searchParams.get('status'),q=(url.searchParams.get('q')||'').trim().slice(0,120);
   if(kind&&slug){if(!['post','work'].includes(kind)||!validSlug(slug))return fail('Invalid article');conditions.push('c.kind=? AND c.slug=?');params.push(kind,slug);}
   if(status==='unread')conditions.push('c.read_at IS NULL');
   else if(status==='unanswered')conditions.push("c.status='approved' AND NOT EXISTS(SELECT 1 FROM comments r JOIN comment_owner o ON o.provider=r.auth_provider AND o.user_id=r.auth_user_id WHERE r.parent_id=c.id AND r.status='approved') AND NOT EXISTS(SELECT 1 FROM comment_owner o WHERE o.provider=c.auth_provider AND o.user_id=c.auth_user_id)");
   else if(['approved','hidden','pending'].includes(status)) {conditions.push('c.status=?');params.push(status);}
   if(q){conditions.push("(instr(lower(c.nickname),lower(?))>0 OR instr(lower(c.body),lower(?))>0 OR instr(lower(COALESCE(d.title,'')),lower(?))>0)");params.push(q,q,q);}
   const offset=Math.min(100000,Math.max(0,parseInt(url.searchParams.get('offset')||'0',10)||0));
   const result=await db.prepare("SELECT c.*,d.title AS article_title,p.nickname AS parent_name,p.body AS parent_body,EXISTS(SELECT 1 FROM comments r JOIN comment_owner o ON o.provider=r.auth_provider AND o.user_id=r.auth_user_id WHERE r.parent_id=c.id AND r.status='approved') AS answered FROM comments c LEFT JOIN documents d ON d.kind=c.kind AND d.slug=c.slug LEFT JOIN comments p ON p.id=c.parent_id"+(conditions.length?' WHERE '+conditions.join(' AND '):'')+' ORDER BY c.created DESC,c.id DESC LIMIT 51 OFFSET ?').bind(...params,offset).all();
   const comments=result.results||[];
   return json({documents:docs.results||[],comments:comments.slice(0,50),hasMore:comments.length>50,owner:await owner(),notifications:{configured:configured(env),channel:(await db.prepare('SELECT channel FROM comment_notification_settings WHERE singleton=1').first())?.channel||'off'}});
 }
 if(path==='/api/admin/comment-inbox'&&method==='PUT'){
   const input=await jsonBody(req,2000);
   if(typeof input?.id!=='string'||!['read','unread','approved','hidden'].includes(input.action))return fail('無效操作');
   const isRead=['read','unread'].includes(input.action);
   const result=await db.prepare(isRead?'UPDATE comments SET read_at=? WHERE id=?':'UPDATE comments SET status=?,read_at=? WHERE id=?')
     .bind(...(isRead?[input.action==='read'?now():null,input.id]:[input.action,now(),input.id])).run();
   if(!result.meta?.changes)return fail('找不到留言',404);
   return json({ok:true});
 }
 if(path==='/api/admin/comment-inbox'&&method==='POST'){
   const author=await owner();if(!author)return fail('請先連結你的留言帳號',409);
   const input=await jsonBody(req,7000),kind=input?.kind,slug=input?.slug,body=safeText(input?.body,1600);
   if(!['post','work'].includes(kind)||!validSlug(slug)||body.length<2)return fail('請確認文章與留言內容');
   const doc=await db.prepare('SELECT slug FROM documents WHERE kind=? AND slug=? AND draft=0').bind(kind,slug).first();
   if(!doc)return fail('文章尚未公開或不存在',404);
   const parent=typeof input.parent_id==='string'&&input.parent_id?input.parent_id:null;
   if(parent&&!await db.prepare("SELECT id FROM comments WHERE id=? AND kind=? AND slug=? AND status='approved'").bind(parent,kind,slug).first())return fail('只能回覆公開的留言');
   const statements=[db.prepare("INSERT INTO comments(id,kind,slug,parent_id,nickname,body,status,created,auth_provider,auth_user_id,avatar_url,read_at,notification_status) VALUES(?,?,?,?,?,?,'approved',?,?,?,?,?,'owner')").bind(crypto.randomUUID(),kind,slug,parent,author.name,body,now(),author.provider,author.id,author.avatar,now())];
   if(parent)statements.push(db.prepare('UPDATE comments SET read_at=? WHERE id=?').bind(now(),parent));
   await db.batch(statements);return json({ok:true},201);
 }
 if(path==='/api/admin/comment-notifications'&&method==='PUT'){
   const input=await jsonBody(req,1000),channel=input?.channel;
   if(!['off','line','discord'].includes(channel)||channel!=='off'&&!configured(env)[channel])return fail('請先設定該通知服務的 Cloudflare Secrets');
   await db.prepare('UPDATE comment_notification_settings SET channel=? WHERE singleton=1').bind(channel).run();return json({ok:true});
 }
 if(path==='/api/admin/comment-notifications'&&method==='POST'){
   const channel=await notificationChannel(env);if(channel==='off')return fail('通知尚未啟用',409);
   const input=await jsonBody(req,1000);
   if(input?.id){
     const comment=await db.prepare('SELECT c.id,c.kind,c.slug,c.notification_status,d.title FROM comments c LEFT JOIN documents d ON d.kind=c.kind AND d.slug=c.slug WHERE c.id=?').bind(input.id).first();
     if(!comment||!['failed','pending'].includes(comment.notification_status))return fail('此留言無需重送',409);
     return await deliver(env,comment,channel)?json({ok:true}):fail('通知傳送失敗，請確認憑證與接收端',502);
   }
   try{
     if(channel==='line')await checkLineRecipient(env);
     await sendCommentNotification(env,channel,'Eason Blog 留言通知測試成功');return json({ok:true});
   }catch(error){return fail(error instanceof NotificationError?error.message:'通知傳送失敗，請確認憑證與接收端',502);}
 }
 return null;
}
