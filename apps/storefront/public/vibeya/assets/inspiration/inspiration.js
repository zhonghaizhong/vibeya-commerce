document.addEventListener('DOMContentLoaded',()=>{
  const catalog=Array.isArray(window.VIBEYA_INSPIRATION_CATALOG)?window.VIBEYA_INSPIRATION_CATALOG:[];
  const articleId=document.body.dataset.inspirationId||'funny-skeleton';
  const current=catalog.find(x=>x.id===articleId)||catalog[0];
  const storyLabels={
    product:{'long-sleeve':'Custom Long Sleeve Tee',hoodie:'Washed Vintage Hoodie',tumbler:'20 oz Stainless Steel Tumbler','bath-mat':'Custom 3D Bath Mat',beanie:'Custom Knitted Beanie'},
    pattern:{skeleton:'Humorous Skeleton','botanical-celestial':'Botanical & Celestial',animal:'Midnight Cat Café','rubber-duck':'Duck Bubble Trouble',typography:'Sleepy Cat & Bold Typography'},
    style:{'street-graffiti':'Street Graffiti / Chill Mood','nature-streetwear':'Nature-Inspired Streetwear','retro-whimsical':'Retro Whimsical','playful-whimsy':'Playful Bathroom Decor',streetwear:'Retro Varsity Streetwear'}
  };
  const storyMeta=document.querySelector('.story-meta');
  if(storyMeta&&current){
    ['product','pattern','style'].forEach(key=>{const value=storyMeta.querySelector(`[data-story-value="${key}"]`);if(value)value.textContent=storyLabels[key]?.[current[key]]||current[key]||'';});
    storyMeta.hidden=false;
  }
  const moreSection=document.getElementById('moreInspirationSection');
  const moreCards=document.getElementById('moreInspirationCards');
  const isInspirationListing=!!document.getElementById('inspirationFilters');
  const safe=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  fetch('/api/vibeya/session',{credentials:'same-origin',cache:'no-store'}).then(response=>response.ok?response.json():null).then(session=>{
    const authenticated=!!session?.authenticated;
    document.body.dataset.vibeyaAuth=authenticated?'authenticated':'guest';
    const label=authenticated?'Account':'Sign in';
    document.querySelectorAll('.account-link,.account-menu-link').forEach(link=>{link.textContent=label;link.setAttribute('aria-label',session?.authenticated?'Account':'Sign in or register');});
  }).catch(()=>{document.body.dataset.vibeyaAuth='guest';document.querySelectorAll('.account-link,.account-menu-link').forEach(link=>{link.textContent='Sign in';link.setAttribute('aria-label','Sign in or register');});});
  if(moreSection&&moreCards&&current&&!isInspirationListing){
    const related=catalog.filter(x=>x.published&&x.id!==current.id&&x.slug&&x.image).map(x=>({x,score:Number(x.product===current.product)*4+Number(x.pattern===current.pattern)*3+Number(x.style===current.style)*2+(x.tags||[]).filter(tag=>(current.tags||[]).includes(tag)).length})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
    moreCards.innerHTML=related.map(({x})=>`<a class="related-card home-featured-inspo" data-inspiration="${safe(x.id)}" data-product="${safe(x.product)}" data-pattern="${safe(x.pattern)}" data-style="${safe(x.style)}" href="${encodeURIComponent(x.slug)}" aria-label="Open ${safe(x.title)}"><img loading="lazy" src="../assets/inspiration/${encodeURIComponent(x.cardImage||x.image)}" alt="${safe(x.title)}"></a>`).join('');
    moreSection.hidden=related.length===0;
  }
  const countBadge=document.getElementById('marketCartCount');
  const refreshCartCount=async()=>{
    if(!countBadge)return;
    try{
      let migrated=[];
      try{migrated=JSON.parse(localStorage.getItem('vibeyaMedusaMigratedItems')||'[]');if(!Array.isArray(migrated))migrated=[];}catch{}
      let saved=[];
      try{saved=JSON.parse(localStorage.getItem('vibeyaSaved')||'[]');if(!Array.isArray(saved))saved=[];}catch{}
      const legacy=saved.filter(item=>item.type==='inspiration'&&['sds-167256','vibeya-washed-hoodie'].includes(item.product)&&item.size&&item.size!=='Not selected'&&['front','back','both'].includes(item.print));
      for(const item of legacy){
        const id=String(item.id);
        if(migrated.includes(id))continue;
        const response=await fetch('/api/vibeya/cart',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:item.product,color:item.color,size:item.size,print:item.print,quantity:Math.max(1,Math.min(20,Number(item.quantity)||1)),designName:item.name||'Saved VIBEYA inspiration',prompt:item.prompt||'',inspirationId:item.inspirationId||''})});
        if(!response.ok)continue;
        migrated.push(id);
        try{localStorage.setItem('vibeyaMedusaMigratedItems',JSON.stringify(migrated));}catch{}
      }
      const response=await fetch('/api/vibeya/cart',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)return;
      const data=await response.json();
      const count=(data.cart?.items||[]).reduce((sum,item)=>sum+(Number(item.quantity)||0),0);
      countBadge.textContent=String(count);
    }catch{}
  };
  refreshCartCount();
  const mobileButton=document.getElementById('marketMenuBtn')||document.getElementById('menuBtn');
  if(mobileButton)mobileButton.addEventListener('click',()=>{const nav=document.getElementById('marketNavigation')||document.getElementById('nav');if(!nav)return;const open=nav.classList.toggle('open');mobileButton.setAttribute('aria-expanded',String(open));mobileButton.setAttribute('aria-label',open?'Close menu':'Open menu');const glyph=mobileButton.querySelector('.mobile-menu-glyph');if(glyph)glyph.textContent=open?'×':'☰';});
  document.querySelectorAll('header nav a').forEach(link=>link.addEventListener('click',()=>{const nav=link.closest('nav');nav?.classList.remove('open');if(mobileButton){mobileButton.setAttribute('aria-expanded','false');mobileButton.setAttribute('aria-label','Open menu');const glyph=mobileButton.querySelector('.mobile-menu-glyph');if(glyph)glyph.textContent='☰';}}));

  const customizeOverlay=document.getElementById('customizeOverlay');
  const customizeDialog=customizeOverlay?.querySelector('.customize-dialog');
  const customizeFrame=document.getElementById('customizeFrame');
  let customizeOpener=null;
  let customizeAllowed=false;
  const closeCustomize=()=>{
    if(!customizeOverlay||customizeOverlay.hidden)return;
    customizeOverlay.hidden=true;document.body.classList.remove('customize-open');
    if(customizeFrame)customizeFrame.removeAttribute('src');
    customizeDialog?.classList.remove('is-loaded');
    customizeOpener?.focus({preventScroll:true});customizeOpener=null;
  };
  const openCustomize=async button=>{
    if(!customizeOverlay||!customizeFrame)return;
    const session=await fetch('/api/vibeya/session',{credentials:'same-origin',cache:'no-store'}).then(response=>response.ok?response.json():null).catch(()=>null);
    if(!session?.authenticated){
      const studioUrl=new URL(window.VIBEYA_CUSTOMIZE_URL||'../index.html?inspiration=funny-skeleton&embeddedStudio=1',location.href);
      const params=studioUrl.searchParams;
      params.delete('embeddedStudio');
      params.set('openStudio','1');
      window.location.assign(`/us?${params.toString()}#top`);
      return;
    }
    customizeAllowed=true;
    customizeOpener=button;customizeDialog?.classList.remove('is-loaded');
    customizeOverlay.hidden=false;document.body.classList.add('customize-open');
    customizeFrame.src=window.VIBEYA_CUSTOMIZE_URL||'../index.html?inspiration=funny-skeleton&embeddedStudio=1';
  };
  document.querySelectorAll('[data-open-customize]').forEach(button=>button.addEventListener('click',()=>openCustomize(button)));
  customizeFrame?.addEventListener('load',()=>customizeDialog?.classList.add('is-loaded'));
  customizeOverlay?.addEventListener('click',e=>{if(e.target===customizeOverlay)closeCustomize();});
  window.addEventListener('message',e=>{
    if(e.source!==customizeFrame?.contentWindow)return;
    if(/^https?:$/.test(location.protocol)&&e.origin!==location.origin)return;
    if(e.data?.type==='vibeya:request-studio'&&customizeAllowed){
      customizeFrame.contentWindow?.postMessage({type:'vibeya:open-studio',product:e.data.product,color:e.data.color,size:e.data.size,print:e.data.print,prompt:e.data.prompt},location.origin);
      return;
    }
    if(e.data?.type==='vibeya:close-embedded-studio')closeCustomize();
  });

  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCustomize();});

  const form=document.getElementById('inspirationFilters');
  if(form){
    const fieldIds=['productFilter','patternFilter','styleFilter'];
    const matches=(item,p,pat,s)=>!!item&&(p==='all'||item.product===p)&&(pat==='all'||item.pattern===pat)&&(s==='all'||item.style===s);
    const filter=()=>{
      const [p,pat,s]=fieldIds.map(id=>document.getElementById(id).value);
      const featuredCards=[...document.querySelectorAll('[data-inspiration-feature]')];
      featuredCards.forEach(card=>card.hidden=!matches({product:card.dataset.product,pattern:card.dataset.pattern,style:card.dataset.style},p,pat,s));
      const featuredMatches=featuredCards.some(card=>!card.hidden);
      const cards=[...document.querySelectorAll('#moreInspirationCards .related-card')];
      cards.forEach(card=>card.hidden=!matches({product:card.dataset.product,pattern:card.dataset.pattern,style:card.dataset.style},p,pat,s));
      const relatedMatches=cards.some(card=>!card.hidden);
      if(moreSection)moreSection.hidden=!relatedMatches;
      const noResults=document.getElementById('noResults');if(noResults)noResults.hidden=featuredMatches||relatedMatches;
    };
    form.addEventListener('change',filter);
    document.getElementById('resetFilters')?.addEventListener('click',()=>{fieldIds.forEach(id=>document.getElementById(id).value='all');filter();});
    filter();
  }
  const copyButton=document.getElementById('copyPrompt');
  if(copyButton)copyButton.addEventListener('click',async()=>{
    const text=document.getElementById('copySource')?.textContent||'';const status=document.getElementById('copyStatus');
    try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);}else{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}if(status)status.textContent='Copied';}
    catch{if(status)status.textContent='Select and copy the prompt above.';}
  });
});
