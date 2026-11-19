import test from 'node:test';
import assert from 'node:assert/strict';
import { validSlug,normalizeDocument,publicDocument } from './utils.mjs';
test('safe unicode slugs and path traversal',()=>{
 assert.equal(validSlug('116-特選心得'),true);
 for(const bad of ['../admin','/','hello world','a/b','.', '..','']) assert.equal(validSlug(bad),false);
});
test('drafts can be empty but published posts need a category and tag',()=>{
 const raw={kind:'post',slug:'test',title:'Post'};
 assert.equal(normalizeDocument(raw).draft,1);
 assert.equal(normalizeDocument({...raw,draft:false}),null);
 assert.equal(normalizeDocument({...raw,draft:false,categories:['心得'],tags:['特選']}).draft,0);
});
test('preview material only includes normalized content',()=>{
 const d=normalizeDocument({kind:'work',slug:'xyz',title:' Work ',body_markdown:'# Hi',tags:['team']});
 assert.equal(publicDocument(d).title,'Work');
 assert.deepEqual(publicDocument(d).tags,['team']);
});
