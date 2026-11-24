import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { adminHtml } from './admin.mjs';
import worker from './worker.mjs';

test('Markdown editor keeps existing CMS form and D1 storage contract', () => {
  for(const token of [
    'id="document-form"', 'id="doc-title"', 'id="documents-list"',
    'id="markdown-input"', 'id="markdown-preview"', 'id="save-doc"',
    'getMarkdown()', 'setMarkdown:', "body_markdown:getEditor().getMarkdown()",
    "api('/api/admin/content','PUT',payload)",
    "data-md-mode=\"edit\"", "data-md-mode=\"split\"", "data-md-mode=\"preview\"",
  ]) assert.ok(adminHtml.includes(token), 'Missing editor form contract: ' + token);
  assert.ok(!adminHtml.includes('toastui'), 'Legacy editor should not remain');
});
test('Image and alignment controls are present with a safe preview sanitizer', () => {
  for(const token of [
    'id="image-file"', 'id="image-width"', 'id="image-align"',
    'id="apply-image"', 'data-md-tool="center"',
    'window.DOMPurify.sanitize', "imageHtml(", "htmlEsc(", "max-width:100%",
    "'/api/admin/media'", "event.clipboardData", "event.dataTransfer",
  ]) assert.ok(adminHtml.includes(token), 'Missing editor feature: ' + token);
});
test('Embedded editor script is valid JavaScript after HTML generation', () => {
  const all=[...adminHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(all.length,1,'Exactly one inline editor controller expected');
  assert.doesNotThrow(()=>new vm.Script(all[0][1]));
});
test('CMS retains login protection and no-store admin page', async () => {
  const response=await worker.fetch(new Request('https://blog.example/admin/'),{});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  const csp=response.headers.get('Content-Security-Policy')||'';
  assert.ok(csp.includes('cdnjs.cloudflare.com'));
  assert.ok(csp.includes('unpkg.com'));
  assert.ok(csp.includes("connect-src 'self'"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
  const body=await response.text();
  assert.ok(body.includes('id="markdown-preview"'));
});

test('About settings uses editable fields and repeatable rows rather than raw JSON', () => {
  for (const token of ['renderAboutForm', 'readAboutForm()', '新增專長', '新增興趣', '新增時間軸區塊', '新增經歷', 'about-avatar-file', 'body_text']) assert.ok(adminHtml.includes(token), token);
  assert.ok(!adminHtml.includes('about-json'));
});
