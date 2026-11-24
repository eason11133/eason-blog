import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

// In-memory D1 contract fake: verifies that public writes and admin moderation use
// the real prepared SQL statements without modifying the deployed database.
function fakeD1() {
  const comments=[];
  const limits=new Map();
  function limitKey(actor,action){return actor+':'+action;}
  return {
    comments,
    prepare(sql){
      let params=[];
      return {
        bind(...values){params=values;return this;},
        async first(){
          if(sql.startsWith('SELECT slug FROM documents WHERE kind='))return params[0]==='post'&&params[1]==='demo'?{slug:'demo'}:null;
          if(sql.startsWith('SELECT count,window_start FROM rate_limits')){
            return limits.get(limitKey(...params))||null;
          }
          if(sql.startsWith('SELECT id FROM comments WHERE id=')){
            const row=comments.find(c=>c.id===params[0]&&c.kind===params[1]&&c.slug===params[2]&&c.status===params[3]);
            return row?{id:row.id}:null;
          }
          throw new Error('Unexpected D1 first SQL: '+sql);
        },
        async run(){
          if(sql.startsWith('INSERT INTO rate_limits')){
            limits.set(limitKey(params[0],params[1]),{count:1,window_start:params[2]});return {};
          }
          if(sql.startsWith('UPDATE rate_limits SET count=count+1')){
            const row=limits.get(limitKey(...params));row.count++;return {};
          }
          if(sql.startsWith('DELETE FROM rate_limits')){
            limits.delete(limitKey(...params));return {};
          }
          if(sql.startsWith('INSERT INTO comments(')){
            const fields=['id','kind','slug','parent_id','nickname','body','status','created','auth_provider','auth_user_id','avatar_url'];
            comments.push(Object.fromEntries(fields.map((key,i)=>[key,params[i]])));
            return {};
          }
          if(sql.startsWith('UPDATE comments SET status=')){
            const row=comments.find(c=>c.id===params[1]);if(row)row.status=params[0];
            return {};
          }
          throw new Error('Unexpected D1 run SQL: '+sql);
        },
        async all(){
          if(sql.startsWith('SELECT id,parent_id,nickname,body,created,avatar_url,auth_provider FROM comments')){
            const [kind,slug,status]=params;
            return {results:comments.filter(c=>c.kind===kind&&c.slug===slug&&c.status===status)
              .sort((a,b)=>a.created.localeCompare(b.created))
              .map(({id,parent_id,nickname,body,created,avatar_url,auth_provider})=>({id,parent_id,nickname,body,created,avatar_url,auth_provider}))};
          }
          if(sql.startsWith('SELECT * FROM comments ORDER BY created DESC'))return {results:[...comments].reverse()};
          throw new Error('Unexpected D1 all SQL: '+sql);
        },
      };
    }
  };
}
const origin='https://cms.test';
const secret='test-only-cms-secret-not-real';
const enc=new TextEncoder();
async function signedSession({provider='github',id='111',name='Verified User'}={}) {
  const data={type:'session',provider,id,name,avatar:'https://avatars.githubusercontent.com/u/111',exp:Date.now()+60000};
  const payload=Buffer.from(JSON.stringify(data)).toString('base64url');
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,enc.encode('blog-comment:'+payload))).toString('base64url');
  return 'eason_comment_session='+payload+'.'+signature;
}
const req=(path,method='GET',body=null,cookie='',requestOrigin=origin)=>{
  const headers={Cookie:cookie};
  if(method!=='GET'){headers.Origin=requestOrigin;headers['Content-Type']='application/json';}
  return new Request(origin+path,{method,headers,body:body===null?undefined:JSON.stringify(body)});
};
async function response(req,env){const output=await worker.fetch(req,env);return {status:output.status,body:await output.json(),headers:output.headers};}

test('verified visitor comments appear immediately; reply, hide, and restore work without losing data',async()=>{
  const db=fakeD1(),env={DB:db,CMS_SESSION_SECRET:secret,CMS_ADMIN_PASSWORD:'test-password'};
  const visitor=await signedSession();
  const unknown=await response(req('/api/comments','POST',{kind:'post',slug:'demo',body:'hello'},''),env);
  assert.equal(unknown.status,401);
  const crossSite=await response(req('/api/comments','POST',{kind:'post',slug:'demo',body:'hello'},visitor,'https://evil.example'),env);
  assert.equal(crossSite.status,403);
  const posted=await response(req('/api/comments','POST',{kind:'post',slug:'demo',nickname:'spoof',body:'First comment'},visitor),env);
  assert.equal(posted.status,201);assert.equal(posted.body.status,'approved');
  assert.equal(db.comments[0].nickname,'Verified User');
  assert.equal(db.comments[0].auth_user_id,'111');
  assert.equal(db.comments[0].auth_provider,'github');
  assert.equal(db.comments[0].status,'approved');
  const firstId=db.comments[0].id;
  const reply=await response(req('/api/comments','POST',{kind:'post',slug:'demo',body:'Reply text',parent_id:firstId},visitor),env);
  assert.equal(reply.status,201);
  const shown=await response(req('/api/comments?kind=post&slug=demo'),env);
  assert.equal(shown.status,200);
  assert.deepEqual(shown.body.comments.map(c=>c.body),['First comment','Reply text']);
  assert.equal(shown.body.comments[1].parent_id,firstId);
  assert.equal(shown.body.comments[0].avatar_url,'https://avatars.githubusercontent.com/u/111');
  const adminLogin=await response(req('/api/admin/login','POST',{password:'test-password'}),env);
  assert.equal(adminLogin.status,200);
  const adminCookie=adminLogin.headers.get('Set-Cookie').split(';')[0];
  const hidden=await response(req('/api/admin/comments','PUT',{id:firstId,status:'hidden'},adminCookie),env);
  assert.equal(hidden.status,200);
  const afterHidden=await response(req('/api/comments?kind=post&slug=demo'),env);
  assert.deepEqual(afterHidden.body.comments.map(c=>c.body),['Reply text']);
  const restored=await response(req('/api/admin/comments','PUT',{id:firstId,status:'approved'},adminCookie),env);
  assert.equal(restored.status,200);
  const afterRestore=await response(req('/api/comments?kind=post&slug=demo'),env);
  assert.equal(afterRestore.body.comments.length,2);
});

test('invalid reply is rejected and posting is limited to five per IP in fifteen minutes',async()=>{
  const db=fakeD1(),env={DB:db,CMS_SESSION_SECRET:secret,CMS_ADMIN_PASSWORD:'test-password'};
  const visitor=await signedSession();
  const invalid=await response(req('/api/comments','POST',{kind:'post',slug:'demo',body:'hi',parent_id:'missing'},visitor),env);
  assert.equal(invalid.status,400);
  for(let i=0;i<4;i++){
    const r=await response(req('/api/comments','POST',{kind:'post',slug:'demo',body:'new '+i},visitor),env);
    assert.equal(r.status,201);
  }
  const denied=await response(req('/api/comments','POST',{kind:'post',slug:'demo',body:'sixth'},visitor),env);
  assert.equal(denied.status,429);
  assert.equal(db.comments.length,4);
});
