import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFooterLinks } from './utils.mjs';
import { adminHtml } from './admin.mjs';
import worker from './worker.mjs';

const empty = {github:'', email:'', instagram:'', discord:''};
test('footer links allow empty values, mail addresses and web URLs; reject unsafe protocols', () => {
  assert.deepEqual(normalizeFooterLinks(empty), empty);
  assert.deepEqual(normalizeFooterLinks({...empty,email:'mailto:hello@example.org',github:'https://github.com/test'}), {...empty,email:'hello@example.org',github:'https://github.com/test'});
  for (const github of ['javascript:alert(1)','data:text/html,test','https://a:b@example.org','not a url']) {
    assert.equal(normalizeFooterLinks({...empty,github}), null);
  }
  assert.equal(normalizeFooterLinks({...empty,email:'a@example.org?subject=bad'}),null);
  assert.equal(normalizeFooterLinks({github:'https://github.com/test'}),null);
});
test('footer settings admin form exposes four separate inputs', () => {
  for (const key of Object.keys(empty)) assert.ok(adminHtml.includes('id="footer-'+key+'"'));
  assert.ok(adminHtml.includes('data-tab="footer"'));
});
test('public footer reads are available; unauthorized and cross-origin writes are rejected', async () => {
  let stored;
  const DB = {prepare(sql){return {async first(){assert.match(sql,/SELECT links_json FROM footer_links/);return stored?{links_json:stored}:null;},bind(value){return {async run(){stored=value;}};}};}};
  const secret='test-footer-secret';
  const env={DB,CMS_SESSION_SECRET:secret};
  const origin='https://cms.test';
  const request=(path,method='GET',body,cookie='',requestOrigin=origin)=>new Request(origin+path,{method,headers:{Origin:requestOrigin,Cookie:cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const read=async()=> (await worker.fetch(request('/api/footer-links'),env)).json();
  assert.deepEqual(await read(),empty);
  assert.equal((await worker.fetch(request('/api/admin/footer-links','PUT',empty),env)).status,401);
  const payload=String(Date.now()+60000)+'.test';
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload))).toString('base64url');
  const cookie='eason_cms='+payload+'.'+signature;
  const value={...empty,github:'https://github.com/test',email:'hello@example.org'};
  assert.equal((await worker.fetch(request('/api/admin/footer-links','PUT',value,cookie,'https://evil.test'),env)).status,403);
  assert.equal((await worker.fetch(request('/api/admin/footer-links','PUT',{...empty,github:'javascript:alert(1)'},cookie),env)).status,400);
  assert.equal((await worker.fetch(request('/api/admin/footer-links','PUT',value,cookie),env)).status,200);
  assert.deepEqual(await read(),value);
  assert.equal((await worker.fetch(request('/api/admin/footer-links','PUT',empty,cookie),env)).status,200);
  assert.deepEqual(await read(),empty);
});
