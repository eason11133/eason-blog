import test from 'node:test';
import assert from 'node:assert/strict';
import { handleViews } from './views.mjs';

function db(){
  const rows=new Map(),sessions=new Set();
  return {rows,sessions,prepare(sql){
    let args=[];
    return {bind(...items){args=items;return this;},
      async first(){
        if(sql.startsWith('SELECT slug FROM documents WHERE'))return args[0]==='post'&&args[1]==='live'?{slug:'live'}:null;
        if(sql.startsWith('SELECT views FROM page_views WHERE'))return rows.has(args.join(':'))?{views:rows.get(args.join(':'))}:null;
        throw Error('Unexpected first SQL: '+sql);
      },
      async run(){
        if(sql.startsWith('INSERT INTO rate_limits(')){
          const key=args[0]+':'+args[1];
          if(sessions.has(key))return {meta:{changes:0}};
          sessions.add(key);return {meta:{changes:1}};
        }
        if(sql.startsWith('INSERT INTO page_views(')){
          const key=args[0]+':'+args[1];rows.set(key,(rows.get(key)||0)+1);
          return {meta:{changes:1}};
        }
        throw Error('Unexpected run SQL: '+sql);
      }};
  }};
}
const origin='https://cms.example';
const secret='only-for-tests';
async function request(database, method, {kind='post',slug='live',visitor='00000000-0000-4000-8000-000000000001'}={}, requestOrigin=origin) {
  const url=new URL(origin+'/api/views');
  if(method==='GET'){url.searchParams.set('kind',kind);url.searchParams.set('slug',slug)}
  const options={method,headers:{Origin:requestOrigin,'Content-Type':'application/json'}};
  if(method==='POST')options.body=JSON.stringify({kind,slug,visitor});
  const response=await handleViews(new Request(url,options),{DB:database,CMS_SESSION_SECRET:secret},url);
  return {status:response.status,body:await response.json()};
}
test('only public documents can expose counts',async()=>{
  const database=db();
  const existing=await request(database,'GET');
  assert.deepEqual(existing,{status:200,body:{views:0,counted:false}});
  assert.equal((await request(database,'POST',{kind:'post',slug:'draft'})).status,404);
  assert.equal((await request(database,'GET',{kind:'work',slug:'live'})).status,404);
});
test('count one view per session and article, without inflating on repeat',async()=>{
  const database=db();
  const first=await request(database,'POST');
  assert.equal(first.status,200);
  assert.deepEqual(first.body,{views:1,counted:true});
  const repeated=await request(database,'POST');
  assert.deepEqual(repeated.body,{views:1,counted:false});
  const second=await request(database,'POST',{visitor:'00000000-0000-4000-8000-000000000002'});
  assert.deepEqual(second.body,{views:2,counted:true});
  const get=await request(database,'GET');
  assert.equal(get.body.views,2);
});
test('reject cross-origin writes and malformed requests',async()=>{
  const database=db();
  assert.equal((await request(database,'POST',{},'https://attacker.example')).status,403);
  assert.equal((await request(database,'POST',{visitor:'not-a-uuid'})).status,400);
  assert.equal((await request(database,'GET',{slug:'../admin'})).status,400);
  assert.equal(database.rows.size,0);
});
