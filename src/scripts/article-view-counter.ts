// One counted view per browser tab/session per article; reads always show the live total.
// Astro ClientRouter can navigate between articles without reloading this script.
export function setupArticleViewCounter() {
  const el=document.querySelector<HTMLElement>('[data-article-views]');
  if(!el||el.dataset.viewsInitialized==='1')return;
  const kind=el.dataset.kind,slug=el.dataset.slug;
  if(!['post','work'].includes(kind||'')||!slug)return;
  el.dataset.viewsInitialized='1';

  const key='eason-read:'+kind+':'+slug;
  let seen=false,visitor='';
  try{
    seen=sessionStorage.getItem(key)==='1';
    visitor=sessionStorage.getItem('eason-visit-session')||'';
    if(!visitor) {
      visitor=crypto.randomUUID();
      sessionStorage.setItem('eason-visit-session',visitor);
    }
  }catch{
    // Private browsing may block storage. The API still accepts an ephemeral token.
    visitor=crypto.randomUUID();
  }
  const url='/api/views?kind='+encodeURIComponent(kind!)+'&slug='+encodeURIComponent(slug);
  const request=seen
    ? fetch(url,{headers:{Accept:'application/json'},cache:'no-store'})
    : fetch('/api/views',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({kind,slug,visitor}),
        cache:'no-store',
      });
  request.then(async response=>{
    if(!response.ok)throw new Error('Failed to load view count');
    const data=await response.json();
    if(typeof data.views!=='number'||!Number.isFinite(data.views))return;
    if(!el.isConnected)return;
    el.textContent=new Intl.NumberFormat('zh-TW').format(Math.max(0,data.views));
    if(!seen)try{sessionStorage.setItem(key,'1')}catch{}
  }).catch(async()=>{
    try{
      const response=await fetch(url,{cache:'no-store'});
      const data=await response.json();
      if(el.isConnected&&Number.isFinite(data?.views))el.textContent=new Intl.NumberFormat('zh-TW').format(Math.max(0,data.views));
    }catch{ /* Do not alter the article layout when the counter is offline. */ }
  });
}
