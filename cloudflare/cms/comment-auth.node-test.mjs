import test from 'node:test';
import assert from 'node:assert/strict';
import { commentUser, handleCommentAuth } from './comment-auth.mjs';
import { COMMENT_PUBLIC_SITE_ORIGIN } from '../site-config.mjs';

const cms = 'https://eason-blog.eason456h.workers.dev';
const env={
  CMS_SESSION_SECRET:'test-only-secret-at-least-32-characters',
  GITHUB_OAUTH_CLIENT_ID:'test-github-id',
  GITHUB_OAUTH_CLIENT_SECRET:'test-github-secret',
  GOOGLE_OAUTH_CLIENT_ID:'test-google-id',
  GOOGLE_OAUTH_CLIENT_SECRET:'test-google-secret',
};
const dispatch=(path,opts={},bindings=env)=> {
  const request=new Request(cms+path,opts);
  return handleCommentAuth(request,bindings,new URL(request.url),new URL(request.url).pathname,request.method);
};
const cookieValue=(response,name)=>{
  const cookie=response.headers.getSetCookie().find(c=>c.startsWith(name+'='));
  assert.ok(cookie, 'Expected '+name+' cookie');
  return cookie.split(';')[0];
};
function fakeAuthProvider(provider) {
  const calls=[];
  const fetcher=async (input,init={})=>{
    const url=String(input);
    calls.push({url,init});
    if(url.includes('oauth/access_token') || url.includes('oauth2.googleapis.com/token')){
      const params=new URLSearchParams(init.body);
      assert.equal(params.get('code'),'test-code');
      assert.equal(params.get('redirect_uri'),COMMENT_PUBLIC_SITE_ORIGIN+'/api/auth/'+provider+'/callback');
      return Response.json({access_token:'test-access-token'});
    }
    if(url.includes('api.github.com/user')){
      assert.equal(init.headers.Authorization,'Bearer test-access-token');
      return Response.json({id:123,login:'visitor-name',avatar_url:'https://avatars.githubusercontent.com/u/123'});
    }
    if(url.includes('openidconnect.googleapis.com/v1/userinfo')){
      return Response.json({sub:'google-sub-123',name:'Google Visitor',picture:'https://lh3.googleusercontent.com/photo'});
    }
    throw new Error('Unexpected request '+url);
  };
  return {fetcher,calls};
}

test('unconfigured providers stay disabled and no session leaks',async()=>{
  const basic={CMS_SESSION_SECRET:env.CMS_SESSION_SECRET};
  const response=await dispatch('/api/auth/me',{},basic);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{user:null,providers:{github:false,google:false}});
  const start=await dispatch('/api/auth/github',{},basic);
  assert.equal(start.status,503);
});

test('GitHub OAuth keeps safe return URL, verifies state, and creates a signed comment session',async()=>{
  const start=await dispatch('/api/auth/github?return=%2Fblog%2Farticle-one%2F');
  assert.equal(start.status,302);
  const github=new URL(start.headers.get('Location'));
  assert.equal(github.origin,'https://github.com');
  assert.equal(github.searchParams.get('redirect_uri'),COMMENT_PUBLIC_SITE_ORIGIN+'/api/auth/github/callback');
  assert.equal(github.searchParams.get('client_id'),env.GITHUB_OAUTH_CLIENT_ID);
  const state=cookieValue(start,'eason_comment_state');
  const {fetcher,calls}=fakeAuthProvider('github');
  const previous=globalThis.fetch;
  globalThis.fetch=fetcher;
  try{
    const invalid=await dispatch('/api/auth/github/callback?state=incorrect&code=test-code',{headers:{Cookie:state}});
    assert.equal(invalid.status,400);
    assert.equal(calls.length,0);
    const finish=await dispatch('/api/auth/github/callback?state='+encodeURIComponent(github.searchParams.get('state'))+'&code=test-code',{headers:{Cookie:state}});
    assert.equal(finish.status,302);
    assert.equal(finish.headers.get('Location'),COMMENT_PUBLIC_SITE_ORIGIN+'/blog/article-one/');
    const cookies=finish.headers.getSetCookie();
    assert.equal(cookies.length,2);
    const session=cookieValue(finish,'eason_comment_session');
    const request=new Request(cms+'/api/comments',{headers:{Cookie:session}});
    assert.deepEqual(await commentUser(request,env),{
      provider:'github',id:'123',name:'visitor-name',avatar:'https://avatars.githubusercontent.com/u/123'
    });
    const tampered=session.slice(0,-3)+'abc';
    assert.equal(await commentUser(new Request(cms+'/api/comments',{headers:{Cookie:tampered}}),env),null);
    assert.equal(calls.length,2);
  } finally{globalThis.fetch=previous;}
});

test('Google OAuth uses only profile scope and creates a session',async()=>{
  const start=await dispatch('/api/auth/google?return=%2Fexperience%2Fapp%2F');
  const google=new URL(start.headers.get('Location'));
  assert.equal(google.origin,'https://accounts.google.com');
  assert.equal(google.searchParams.get('scope'),'openid profile');
  assert.equal(google.searchParams.get('redirect_uri'),COMMENT_PUBLIC_SITE_ORIGIN+'/api/auth/google/callback');
  const cookie=cookieValue(start,'eason_comment_state');
  const {fetcher}=fakeAuthProvider('google');
  const previous=globalThis.fetch;
  globalThis.fetch=fetcher;
  try{
    const finish=await dispatch('/api/auth/google/callback?state='+encodeURIComponent(google.searchParams.get('state'))+'&code=test-code',{headers:{Cookie:cookie}});
    assert.equal(finish.status,302);
    assert.equal(finish.headers.get('Location'),COMMENT_PUBLIC_SITE_ORIGIN+'/experience/app/');
    const session=cookieValue(finish,'eason_comment_session');
    const user=await commentUser(new Request(cms+'/api/comments',{headers:{Cookie:session}}),env);
    assert.deepEqual(user,{provider:'google',id:'google-sub-123',name:'Google Visitor',avatar:'https://lh3.googleusercontent.com/photo'});
  }finally{globalThis.fetch=previous;}
});

test('OAuth redirect never accepts third-party return URLs',async()=>{
  const start=await dispatch('/api/auth/github?return=https%3A%2F%2Fevil.example%2F');
  const state=cookieValue(start,'eason_comment_state');
  const authorize=new URL(start.headers.get('Location'));
  const response=await dispatch('/api/auth/github/callback?state='+encodeURIComponent(authorize.searchParams.get('state'))+'&error=access_denied',{headers:{Cookie:state}});
  assert.equal(response.status,302);
  assert.equal(response.headers.get('Location'),COMMENT_PUBLIC_SITE_ORIGIN+'/blog/?comment_auth=cancelled');
});
