import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from './worker.mjs';
import { sendCommentNotification, checkLineRecipient } from './comment-management.mjs';
import { adminHtml } from './admin.mjs';
const origin='https://cms.test',secret='test-only-cms-secret';
function dbFixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const name of ['0001_initial.sql','0002_comment_oauth.sql','0003_page_views.sql','0007_comment_management.sql'])sqlite.exec(readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8'));
 sqlite.prepare("INSERT INTO documents(kind,slug,title,date,updated,draft) VALUES('post','demo','Demo title','now','now',0)").run();
 const db={prepare(sql){let params=[];return{bind(...v){params=v;return this;},async first(){return sqlite.prepare(sql).get(...params)||null;},async all(){return{results:sqlite.prepare(sql).all(...params)};},async run(){return{meta:{changes:Number(sqlite.prepare(sql).run(...params).changes)}};},execute(){return sqlite.prepare(sql).run(...params);}};},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(stmt=>({meta:{changes:Number(stmt.execute().changes)}}));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 return {sqlite,db};
}
async function session(id='owner'){
 const payload=Buffer.from(JSON.stringify({type:'session',provider:'github',id,name:'Owner',avatar:'',exp:Date.now()+60000})).toString('base64url');
 const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return 'eason_comment_session='+payload+'.'+Buffer.from(await crypto.subtle.sign('HMAC',key,enc.encode('blog-comment:'+payload))).toString('base64url');
}
function req(path,method='GET',body,cookie=''){
 return new Request(origin+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
}
test('owner pairing requires admin initiation and visitor OAuth, is one-time, and replies use verified identity',async()=>{
 const {sqlite,db}=dbFixture(),env={DB:db,CMS_SESSION_SECRET:secret,CMS_ADMIN_PASSWORD:'test-password'};
 const call=(...args)=>worker.fetch(req(...args),env);
 const visitor=await session('visitor');
 assert.equal((await call('/api/admin/comment-owner','POST',{},visitor)).status,401);
 const login=await call('/api/admin/login','POST',{password:'test-password'});const admin=login.headers.get('Set-Cookie').split(';')[0];
 const pair=await call('/api/admin/comment-owner','POST',{},admin);assert.equal(pair.status,200);
 const code=new URL((await pair.json()).url).hash.slice(1);
 assert.equal((await call('/api/comment-owner/link','POST',{code})).status,401);
 assert.equal((await call('/api/comment-owner/link','POST',{code},await session())).status,200);
 assert.equal((await call('/api/comment-owner/link','POST',{code},visitor)).status,409);
 const post=await call('/api/comments','POST',{kind:'post',slug:'demo',body:'Visitor text'},visitor);assert.equal(post.status,201);
 const parent=sqlite.prepare('SELECT id FROM comments').get().id;
 const reply=await call('/api/admin/comment-inbox','POST',{kind:'post',slug:'demo',body:'Owner reply',parent_id:parent,nickname:'spoof'},admin);
 assert.equal(reply.status,201);assert.equal(sqlite.prepare('SELECT auth_user_id FROM comments WHERE parent_id=?').get(parent).auth_user_id,'owner');
 assert.ok(sqlite.prepare('SELECT read_at FROM comments WHERE id=?').get(parent).read_at);
 const inbox=await call('/api/admin/comment-inbox','GET',undefined,admin);assert.equal(inbox.status,200);assert.equal((await inbox.json()).comments.length,2);
 const publicList=await call('/api/comments?kind=post&slug=demo');assert.equal((await publicList.json()).comments.length,2);
 assert.equal((await call('/api/admin/comment-inbox','POST',{kind:'post',slug:'demo',body:'forged'},visitor)).status,401);
 assert.ok(adminHtml.includes('inbox-compose-form'));sqlite.close();
});
test('notifications only use approved provider destinations and disable Discord mentions',async()=>{
 const prev=globalThis.fetch,calls=[];globalThis.fetch=async(url,init)=>{calls.push({url,init});return new Response(null,{status:204});};
 try{
  await sendCommentNotification({COMMENT_DISCORD_WEBHOOK:'https://discord.com/api/webhooks/123/test-token'},'discord','test');
  assert.equal(JSON.parse(calls[0].init.body).allowed_mentions.parse.length,0);
  await assert.rejects(()=>sendCommentNotification({COMMENT_DISCORD_WEBHOOK:'https://evil.test/api/webhooks/123/test-token'},'discord','test'));
  await sendCommentNotification({COMMENT_LINE_ACCESS_TOKEN:'test',COMMENT_LINE_USER_ID:'U'+'a'.repeat(32)},'line','test');
  assert.equal(calls[1].url,'https://api.line.me/v2/bot/message/push');assert.equal(JSON.parse(calls[1].init.body).to,'U'+'a'.repeat(32));
 }finally{globalThis.fetch=prev;}
});

test('LINE diagnostics distinguish invalid user IDs, token failures, and recipient lookup failures without revealing credentials',async()=>{
 const prev=globalThis.fetch,calls=[];
 const env={COMMENT_LINE_ACCESS_TOKEN:' private-token ',COMMENT_LINE_USER_ID:' U'+'a'.repeat(32)+' '};
 try{
  globalThis.fetch=async(url,init)=>{calls.push({url,init});return new Response(null,{status:401});};
  await assert.rejects(()=>checkLineRecipient(env),/官方帳號驗證（HTTP 401）/);
  assert.equal(calls.length,1);
  assert.equal(calls[0].init.headers.Authorization,'Bearer private-token');
  calls.length=0;
  await assert.rejects(()=>checkLineRecipient({...env,COMMENT_LINE_USER_ID:'@wrong'}),/User ID 格式錯誤/);
  assert.equal(calls.length,0);
  globalThis.fetch=async(url)=>new Response(null,{status:String(url).endsWith('/info')?200:404});
  await assert.rejects(()=>checkLineRecipient(env),/接收者檢查（HTTP 404）/);
 }finally{globalThis.fetch=prev;}
});

test('notification requests use Workers-compatible manual redirects and never follow redirect responses',async()=>{
 const prev=globalThis.fetch,calls=[];
 const env={COMMENT_LINE_ACCESS_TOKEN:'test-token',COMMENT_LINE_USER_ID:'U'+'a'.repeat(32)};
 try{
  globalThis.fetch=async(url,init)=>{
   if(init.redirect==='error')throw new TypeError('Unsupported redirect mode: error');
   assert.equal(init.redirect,'manual');
   calls.push(String(url));
   return new Response(null,{status:String(url).endsWith('/push')?204:200});
  };
  await checkLineRecipient(env);
  await sendCommentNotification(env,'line','test');
  assert.deepEqual(calls,[
   'https://api.line.me/v2/bot/info',
   'https://api.line.me/v2/bot/profile/'+env.COMMENT_LINE_USER_ID,
   'https://api.line.me/v2/bot/message/push'
  ]);
  calls.length=0;
  globalThis.fetch=async(url,init)=>{
   assert.equal(init.redirect,'manual');calls.push(String(url));
   return new Response(null,{status:302,headers:{Location:'https://evil.test/'}});
  };
  await assert.rejects(()=>checkLineRecipient(env),/重新導向（HTTP 302）/);
  assert.equal(calls.length,1);
 }finally{globalThis.fetch=prev;}
});

test('admin deletion preserves unrelated documents and replies, rejects unauthorized requests, and cleans associated records',async()=>{
 const {sqlite,db}=dbFixture(),env={DB:db,CMS_SESSION_SECRET:secret,CMS_ADMIN_PASSWORD:'test-password'};
 const call=(...args)=>worker.fetch(req(...args),env);
 sqlite.exec("INSERT INTO documents(kind,slug,title,date,updated,draft) VALUES('work','demo','Work','now','now',0)");
 const add=sqlite.prepare("INSERT INTO comments(id,kind,slug,parent_id,nickname,body,status,created) VALUES(?,?,'demo',?,'Visitor','hello','approved','now')");
 add.run('parent','post',null);add.run('child','post','parent');add.run('grandchild','post','child');add.run('other','work',null);
 sqlite.exec("INSERT INTO page_views VALUES('post','demo',12),('work','demo',7)");
 sqlite.exec("INSERT INTO rate_limits VALUES('a','view:post:demo',1,0),('a','view:work:demo',1,0)");
 assert.equal((await call('/api/admin/content','DELETE',{kind:'post',slug:'demo'})).status,401);
 assert.equal((await call('/api/admin/comment-inbox','DELETE',{id:'child'})).status,401);
 const login=await call('/api/admin/login','POST',{password:'test-password'});
 const admin=login.headers.get('Set-Cookie').split(';')[0];
 assert.equal((await worker.fetch(new Request(origin+'/api/admin/content',{method:'DELETE',headers:{Origin:'https://other.test',Cookie:admin,'Content-Type':'application/json'},body:JSON.stringify({kind:'post',slug:'demo'})}),env)).status,403);
 assert.equal((await call('/api/admin/comment-inbox','DELETE',{id:'child'},admin)).status,200);
 assert.equal(sqlite.prepare("SELECT parent_id FROM comments WHERE id='grandchild'").get().parent_id,'parent');
 assert.equal((await call('/api/admin/comment-inbox','DELETE',{id:'parent'},admin)).status,200);
 assert.equal(sqlite.prepare("SELECT parent_id FROM comments WHERE id='grandchild'").get().parent_id,null);
 assert.equal((await call('/api/admin/comment-inbox','DELETE',{id:'parent'},admin)).status,404);
 assert.equal((await call('/api/admin/content','DELETE',{kind:'post',slug:'demo'},admin)).status,200);
 assert.equal((await call('/api/posts/demo')).status,404);
 assert.equal((await call('/api/works/demo')).status,200);
 assert.equal(sqlite.prepare("SELECT count(*) AS n FROM comments WHERE kind='post'").get().n,0);
 assert.equal(sqlite.prepare("SELECT count(*) AS n FROM comments WHERE kind='work'").get().n,1);
 assert.equal(sqlite.prepare("SELECT count(*) AS n FROM page_views WHERE kind='post'").get().n,0);
 assert.equal(sqlite.prepare("SELECT views FROM page_views WHERE kind='work'").get().views,7);
 assert.equal(sqlite.prepare("SELECT count(*) AS n FROM rate_limits WHERE action='view:post:demo'").get().n,0);
 assert.equal((await call('/api/admin/content','DELETE',{kind:'post',slug:'demo'},admin)).status,404);
 assert.ok(adminHtml.includes('id="delete-doc"'));
 assert.ok(adminHtml.includes("'/api/admin/comment-inbox','DELETE'"));
 sqlite.close();
});
