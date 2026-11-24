// One-time, guarded content import for an ALREADY CREATED CMS article.
// Does not change its title, publish date, tags, draft status, or other documents.
// Source is a verbatim user transcription stored outside automatic publishing paths.
// Once the article is nonempty, repeated runs can never overwrite it.
import {readFileSync} from 'node:fs';
import {createMarkdownProcessor} from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const source = readFileSync('content/manual-backups/中央資管.user-original.txt','utf8').replace(/\n$/,'');
const fields = source.match(/^([\s\S]*?)\n{2,}(面試當天：)\n{2,}(面試圖：)\(圖\)\n{2,}(面試逐字稿：)\n([\s\S]*?)\n{2,}(心得：)([\s\S]*?)\n{2,}(結果 備取6\(備取最後一個果然菜逼一個\)：)\n{2,}([\s\S]*?)$/);
if(!fields)throw Error('The user-supplied source markers changed; refusing publication');
const [,intro,interviewDay,imageLabel,transcriptTitle,transcript,reflectionLabel,reflection,resultTitle,resultText]=fields;
const sameText=[intro,interviewDay,imageLabel+'(圖)',transcriptTitle,transcript,reflectionLabel+reflection,resultTitle,resultText].join('').replace(/\s/g,'');
if(sameText!==source.replace(/\s/g,''))throw Error('Words/characters changed unexpectedly');
const markdown=[
  intro,
  '',
  '## '+interviewDay,
  '',
  imageLabel,
  '',
  '![中央資管面試座位圖](/images/ncu-im-interview-seating.webp)',
  '',
  '## '+transcriptTitle,
  '',
  '<details class="interview-transcript">',
  '<summary>展開／收起完整逐字稿</summary>',
  '<div class="interview-transcript-text">',
  transcript,
  '</div>',
  '</details>',
  '',
  '## '+reflectionLabel,
  '',
  reflection.replace(/\n/g,'\n\n'),
  '',
  '## '+resultTitle,
  '',
  resultText,
  '',
].join('\n');
const processor=await createMarkdownProcessor({
  syntaxHighlight:false,
  remarkPlugins:[remarkGfm,remarkMath],
  rehypePlugins:[rehypeKatex]
});
const preview=await processor.render(markdown);
const headings=preview.metadata.headings?.map(h=>h.text)||[];
if(headings.length!==4 || headings.join('|')!==[interviewDay,transcriptTitle,reflectionLabel,resultTitle].join('|'))
  throw Error('Unexpected table-of-contents headings: '+JSON.stringify(headings));
if(!preview.code.includes('<details class="interview-transcript">')||
   !preview.code.includes('</details>')||
   !preview.code.includes('ncu-im-interview-seating.webp'))
  throw Error('Markdown renderer did not preserve transcript fold or seating image');
console.log('Markdown passed: 4 TOC headings, 1 native collapsible transcript, all original wording preserved.');

const picture='https://eason-blog-web-live.eason456h.workers.dev/images/ncu-im-interview-seating.webp';
const imageResponse=await fetch(picture,{headers:{'User-Agent':'Mozilla/5.0','Accept':'image/webp,*/*'}});
if(!imageResponse.ok)throw Error('Original seating image is not live yet: HTTP '+imageResponse.status);
const imageBody=await imageResponse.arrayBuffer();
if(imageBody.byteLength<5000)throw Error('Seating image incomplete');
console.log('Original seating image is live ('+imageBody.byteLength+' bytes)');

const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw Error('Missing Cloudflare D1 credentials');
const endpoint='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account)+
  '/d1/database/0bee7890-ba82-44f3-8d09-c9becdd7d250/query';
async function query(sql,params){
  const response=await fetch(endpoint,{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({sql,params}),
  });
  const payload=await response.json();
  if(!response.ok || payload.success!==true || payload.result?.[0]?.success===false)
    throw Error('D1 query failed: HTTP '+response.status+' '+JSON.stringify(payload.errors||[]));
  return payload.result?.[0]||{};
}
const [kind,slug]=['post','中央資管'];
const existing=(await query('SELECT title,date,updated,draft,body_markdown FROM documents WHERE kind=? AND slug=?',[kind,slug])).results?.[0];
if(!existing)throw Error('The CMS article does not exist. Refusing to create a new one.');
if(existing.draft!==0)throw Error('This is not the intended published article. Refusing to change it.');
if(existing.body_markdown===markdown){
  console.log('Already published exactly once. Existing CMS article was not changed.');
  process.exit(0);
}
if(typeof existing.body_markdown!=='string'||existing.body_markdown.trim()!=='')
  throw Error('The CMS article already contains text. Refusing to overwrite a backend edit.');
const published=await query(
  "UPDATE documents SET body_markdown=?,updated=? WHERE kind=? AND slug=? AND trim(body_markdown)=''",
  [markdown,new Date().toISOString(),kind,slug]
);
if(Number(published.meta?.changes)!==1)
  throw Error('CMS article was changed concurrently. No overwrite performed.');
const readBack=(await query('SELECT title,date,draft,body_markdown FROM documents WHERE kind=? AND slug=?',[kind,slug])).results?.[0];
if(!readBack || readBack.body_markdown!==markdown ||
   readBack.title!==existing.title || readBack.date!==existing.date || readBack.draft!==existing.draft)
  throw Error('Published document did not preserve the original title/date/settings');
console.log('Published once to the EXISTING article: '+readBack.title+' ('+markdown.length+' Markdown chars)');
console.log('Future GitHub deploys do not import this file; future CMS edits remain authoritative.');
