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
  for (const token of ['renderAboutForm', 'readAboutForm()', '新增標題區塊', '新增項目', 'sidebar_sections', '新增興趣', '新增時間軸區塊', '新增經歷', 'about-avatar-file', 'body_text']) assert.ok(adminHtml.includes(token), token);
  assert.ok(!adminHtml.includes('about-json'));
});

test('CMS date input and save use Taipei time independently of browser timezone', () => {
  const start=adminHtml.indexOf('const taipeiDateFormatter=');
  const end=adminHtml.indexOf('let originalDocDate=',start);
  assert.ok(start>=0&&end>start);
  const source=adminHtml.slice(start,end);
  const result=vm.runInNewContext(source+String.fromCharCode(10)+
    '({beforeMidnight:dateInput("2026-11-24T15:59:00Z"), midnight:dateInput("2026-11-24T16:00:00Z"), saved:dateForSave("2026-11-25T00:00",""), unchanged:dateForSave("2026-11-25T00:00","2026-11-24T16:00:53.123Z")})');
  assert.equal(result.beforeMidnight,'2026-11-24T23:59');
  assert.equal(result.midnight,'2026-11-25T00:00');
  assert.equal(result.saved,'2026-11-24T16:00:00.000Z');
  assert.equal(result.unchanged,'2026-11-24T16:00:53.123Z');
  assert.ok(adminHtml.includes('date:dateForSave(normalizeDateFields('));
});

test('CMS date fields accept direct typing, compact dates and 24-hour time', () => {
 const start=adminHtml.indexOf('const taipeiDateFormatter=');
 const end=adminHtml.indexOf('let originalDocDate=',start);
 const source=adminHtml.slice(start,end);
 const run=expression=>vm.runInNewContext(source+String.fromCharCode(10)+expression);
 assert.equal(run('normalizeDateFields("2026/11/5","9:05")'),'2026-11-05T09:05');
 assert.equal(run('normalizeDateFields("20261125","0134")'),'2026-11-25T01:34');
 assert.equal(run('dateForSave(normalizeDateFields("2026/11/25","00:00"),"")'),'2026-11-24T16:00:00.000Z');
 assert.throws(()=>run('dateForSave(normalizeDateFields("2026/02/30","12:00"),"")'),/日期格式/);
 assert.throws(()=>run('dateForSave(normalizeDateFields("2026/11/25","25:00"),"")'),/日期格式/);
 assert.ok(adminHtml.includes('id="doc-date-today"'));
 assert.ok(adminHtml.includes('id="doc-date-now"'));
 assert.ok(!adminHtml.includes('type="datetime-local"'));
});
