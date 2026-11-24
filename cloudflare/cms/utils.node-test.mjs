import test from 'node:test';
import assert from 'node:assert/strict';
import { validSlug,normalizeDocument,publicDocument } from './utils.mjs';
test('safe unicode slugs and path traversal',()=>{
 assert.equal(validSlug('116-特選心得'),true);
 for(const bad of ['../admin','/','hello world','a/b','.', '..','']) assert.equal(validSlug(bad),false);
});
test('published posts can be saved without category and tag',()=>{
 const raw={kind:'post',slug:'test',title:'Post'};
 assert.equal(normalizeDocument(raw).draft,1);
 const published=normalizeDocument({...raw,draft:false});
 assert.equal(published.draft,0);
 assert.equal(published.categories_json,'[]');
 assert.equal(published.tags_json,'[]');
 const tagged=normalizeDocument({...raw,draft:false,categories:['心得'],tags:['特選']});
 assert.deepEqual(JSON.parse(tagged.categories_json),['心得']);
 assert.deepEqual(JSON.parse(tagged.tags_json),['特選']);
 assert.equal(normalizeDocument({...raw,title:'',draft:false}),null);
});
test('preview material only includes normalized content',()=>{
 const d=normalizeDocument({kind:'work',slug:'xyz',title:' Work ',body_markdown:'# Hi',tags:['team']});
 assert.equal(publicDocument(d).title,'Work');
 assert.deepEqual(publicDocument(d).tags,['team']);
});
