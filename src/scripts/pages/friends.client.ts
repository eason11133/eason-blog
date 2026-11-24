export function initFriendsPage() {
  const form=document.querySelector<HTMLFormElement>('#friend-request-form');
  if(!form||form.dataset.ready==='true')return;
  form.dataset.ready='true';
  const status=form.querySelector<HTMLElement>('.friend-form-status')!;
  const button=form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(button.disabled)return;
    button.disabled=true;status.textContent='送出中…';
    try{
      const response=await fetch('/api/friend-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'申請失敗');
      form.reset();status.textContent='申請已送出，等我審核後就會出現在友站列表。';
    }catch(error){status.textContent=error instanceof Error?error.message:'申請失敗，請稍後再試';}
    finally{button.disabled=false;}
  });
}
