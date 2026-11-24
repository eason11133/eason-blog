// Publish one checked-in article to the existing Cloudflare D1 CMS without
// modifying existing CMS-authored documents. Runs only in GitHub Actions.
import { readFileSync, existsSync } from 'node:fs';
import { normalizeDocument } from '../cms/utils.mjs';

const slug = 'ncu-im-116';
const asset = 'public/images/ncu-im-interview-seating.webp';
if (!existsSync(asset)) throw new Error('Seat image is missing: ' + asset);
const meta=JSON.parse(readFileSync('cloudflare/content/posts/'+slug+'.json','utf8'));
const body_markdown=readFileSync('cloudflare/content/posts/'+slug+'.md','utf8');
const normalized=normalizeDocument({...meta,body_markdown,draft:false});
if(!normalized || normalized.slug!==slug || !body_markdown.includes('/images/ncu-im-interview-seating.webp')) {
  throw new Error('The article metadata or image reference is invalid');
}
const {CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_API_TOKEN:token}=process.env;
if(!account||!token)throw new Error('Cloudflare deployment credentials are missing');
const db='0bee7890-ba82-44f3-8d09-c9becdd7d250';
const endpoint='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account)+'/d1/database/'+db+'/query';
async function query(sql,params) {
  const r=await fetch(endpoint,{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({sql,params}),
  });
  const data=await r.json();
  if(!r.ok||data.success!==true||data.result?.[0]?.success===false){
    throw new Error('D1 publish failed: HTTP '+r.status+' '+JSON.stringify(data.errors||data.result?.[0]?.error||[]));
  }
  return data.result?.[0]||{};
}
const sql='INSERT OR IGNORE INTO documents(kind,slug,title,description,body_markdown,categories_json,tags_json,date,updated,draft,pinned) VALUES(?,?,?,?,?,?,?,?,?,?,?)';
const params=[normalized.kind,normalized.slug,normalized.title,normalized.description,normalized.body_markdown,normalized.categories_json,normalized.tags_json,normalized.date,normalized.updated,0,0];
const result=await query(sql,params);
console.log((result.meta?.changes ? 'Published' : 'Already exists') + ': '+slug);

// Update only our previously published version that split the transcript into
// separate headings. Keep any independently edited article untouched.
const before=await query('SELECT body_markdown FROM documents WHERE kind=? AND slug=?',['post',slug]);
const previous=before.results?.[0]?.body_markdown;
if(typeof previous!=='string')throw new Error('D1 article missing');
if(previous.includes('### 30 秒自我介紹') && previous.includes('### AI 到底幫我做多少？')) {
  const update=await query('UPDATE documents SET body_markdown=?, updated=? WHERE kind=? AND slug=? AND body_markdown=?',[
    normalized.body_markdown,normalized.updated,'post',slug,previous
  ]);
  if(update.meta?.changes!==1)throw new Error('Concurrent edit detected; refusing overwrite');
  console.log('Replaced original split transcript with a single collapsible transcript');
} else if (previous!==normalized.body_markdown) {
  console.log('Preserved newer CMS edit to this article');
}
const verified=await query('SELECT title,draft,body_markdown FROM documents WHERE kind=? AND slug=?',['post',slug]);
const row=verified.results?.[0];
if(!row||row.draft!==0||row.body_markdown?.length<1000)throw new Error('Published article verification failed');
if(row.body_markdown===normalized.body_markdown)console.log('Verified new complete transcript and native details markup');
console.log('Verified D1: '+row.title+' ('+row.body_markdown.length+' chars)');
