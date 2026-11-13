document.addEventListener('DOMContentLoaded',async()=>{
  const safe=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bundledCatalog=Array.isArray(window.VIBEYA_INSPIRATION_CATALOG)?window.VIBEYA_INSPIRATION_CATALOG:[];
  let catalog=[...bundledCatalog];
  try{const response=await fetch('/api/vibeya/inspirations',{credentials:'same-origin',cache:'no-store'});if(response.ok){const data=await response.json();if(Array.isArray(data.inspirations)){const managed=data.inspirations;catalog=[...bundledCatalog.map(item=>managed.find(entry=>entry.id===item.id)||item),...managed.filter(entry=>!bundledCatalog.some(item=>item.id===entry.id))];}}}catch(error){console.warn('Using bundled inspiration catalog',error);}
  document.querySelectorAll('[data-inspiration-feature]').forEach(section=>{
    const link=section.querySelector('.actions a[href]');
    if(!link)return;
    const slug=new URL(link.href,location.href).pathname.split('/').pop();
    const entry=catalog.find(item=>item.slug===slug);
    if(!entry)return;
    if(entry.summary){const description=section.querySelector('.featured-text > p');if(description)description.textContent=entry.summary;}
    if(entry.useManagedImage&&entry.image){const image=section.querySelector('.art-card img');if(image){image.src=/^(https?:)?\//.test(entry.image)?new URL(entry.image,location.origin).href:`../assets/inspiration/${encodeURIComponent(entry.image)}`;image.alt=`${entry.title} inspiration`;}}
  });
  const isGenericStory=document.body.dataset.inspirationTemplate==='true';
  const articleId=new URLSearchParams(location.search).get('inspiration')||document.body.dataset.inspirationId||'funny-skeleton';
  const current=catalog.find(x=>x.id===articleId)||(isGenericStory?undefined:catalog[0]);
  const storyLabels={
    product:{'long-sleeve':'Custom Long Sleeve Tee',hoodie:'Washed Vintage Hoodie',tumbler:'20 oz Stainless Steel Tumbler','bath-mat':'Custom 3D Bath Mat',beanie:'Custom Knitted Beanie','shower-curtain':'Custom Shower Curtain'},
    pattern:{skeleton:'Humorous Skeleton','botanical-celestial':'Botanical & Celestial',animal:'Midnight Cat Café',cat:'Cats, Bathtub & Bubbles','rubber-duck':'Duck Bubble Trouble',typography:'Sleepy Cat & Bold Typography'},
    style:{'street-graffiti':'Street Graffiti / Chill Mood','nature-streetwear':'Nature-Inspired Streetwear','retro-whimsical':'Retro Whimsical','playful-whimsy':'Playful Bathroom Decor','cozy-cute':'Cozy, Cute & Playful',streetwear:'Retro Varsity Streetwear'}
  };
  const storyMeta=document.querySelector('.story-meta');
  if(isGenericStory&&current){
    document.title=`${current.title} | VIBEYA Design Story`;
    const title=document.getElementById('storyTitle');if(title)title.textContent=current.title;
    const summary=document.getElementById('storySummary');if(summary)summary.textContent=current.summary||'Explore the idea behind this design, then make a version that feels like you.';
    const image=document.getElementById('storyHeroImage');
    if(image){const source=current.image||current.cardImage||'';image.src=/^(https?:)?\//.test(source)?new URL(source,location.origin).href:`../assets/inspiration/${encodeURIComponent(source)}`;image.alt=`${current.title} design inspiration`;}
    const tags=document.getElementById('storyTags');if(tags)tags.innerHTML=(current.tags||[]).map(tag=>`<span class="chip">${safe(tag)}</span>`).join('');
    for(const [key,id] of [['product','storyProduct'],['pattern','storyPattern'],['style','storyStyle']]){const node=document.getElementById(id);if(node)node.textContent=storyLabels[key]?.[current[key]]||current[key]||'';}
    const body=document.getElementById('storyBody');if(body){body.replaceChildren(...String(current.articleBody||'').split(/\n\s*\n/).map(text=>text.trim()).filter(Boolean).map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));body.hidden=!current.articleBody;}
    window.VIBEYA_CUSTOMIZE_URL=`../index.html?openStudio=1&embeddedStudio=1&inspiration=${encodeURIComponent(current.id)}`;
  }else if(isGenericStory){
    document.title='Design story unavailable | VIBEYA';
    const spotlight=document.querySelector('.story-spotlight');if(spotlight)spotlight.hidden=true;
    const body=document.getElementById('storyBody');if(body){body.hidden=false;const message=document.createElement('p');message.textContent='This design story is not available right now.';body.replaceChildren(message);}
  }
  if(storyMeta&&current){
    ['product','pattern','style'].forEach(key=>{const value=storyMeta.querySelector(`[data-story-value="${key}"]`);if(value)value.textContent=storyLabels[key]?.[current[key]]||current[key]||'';});
    storyMeta.hidden=false;
  }
  const moreSection=document.getElementById('moreInspirationSection');
  const moreCards=document.getElementById('moreInspirationCards');
  const isInspirationListing=!!document.getElementById('inspirationFilters');
  fetch('/api/vibeya/session',{credentials:'same-origin',cache:'no-store'}).then(response=>response.ok?response.json():null).then(session=>{
    const authenticated=!!session?.authenticated;
    document.body.dataset.vibeyaAuth=authenticated?'authenticated':'guest';
    const label=authenticated?'Account':'Sign in';
    document.querySelectorAll('.account-link,.account-menu-link').forEach(link=>{link.textContent=label;link.setAttribute('aria-label',session?.authenticated?'Account':'Sign in or register');});
  }).catch(()=>{document.body.dataset.vibeyaAuth='guest';document.querySelectorAll('.account-link,.account-menu-link').forEach(link=>{link.textContent='Sign in';link.setAttribute('aria-label','Sign in or register');});});
  if(moreSection&&moreCards&&current&&!isInspirationListing){
    let related=[];
    try{
      const inspirationUrl=new URL('/vibeya/inspiration/index.html',location.origin);
      const response=await fetch(inspirationUrl,{credentials:'same-origin',cache:'no-store'});
      if(response.ok){
        const page=new DOMParser().parseFromString(await response.text(),'text/html');
        related=Array.from(page.querySelectorAll('[data-inspiration-feature]')).flatMap(section=>{
          const image=section.querySelector('.art-card img');
          const link=section.querySelector('.actions a[href]');
          if(!image||!link)return [];
          const href=new URL(link.getAttribute('href'),inspirationUrl);
          const slug=href.pathname.split('/').pop()||'';
          const entry=catalog.find(item=>item.slug===slug);
          if((entry&&!entry.published)||entry?.id===current.id)return [];
          return [{id:entry?.id||slug.replace(/\.html$/,''),title:entry?.title||section.querySelector('.featured-text h2')?.textContent?.replace(/\s+/g,' ').trim()||'VIBEYA inspiration',product:entry?.product,pattern:entry?.pattern,style:entry?.style,slug:href.href,image:new URL(image.getAttribute('src')||'',inspirationUrl).href,alt:image.getAttribute('alt')||entry?.title||'VIBEYA inspiration'}];
        });
      }
    }catch(error){console.warn('Could not load inspiration-list feature cards',error);}
    for(let i=related.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[related[i],related[j]]=[related[j],related[i]];}
    const selected=related.slice(0,4);
    moreCards.innerHTML=selected.map(x=>`<a class="related-card home-featured-inspo" data-inspiration="${safe(x.id)}" data-product="${safe(x.product)}" data-pattern="${safe(x.pattern)}" data-style="${safe(x.style)}" href="${safe(x.slug)}" aria-label="Open ${safe(x.title)}"><img loading="lazy" src="${safe(x.image)}" alt="${safe(x.alt)}"></a>`).join('');
    moreSection.hidden=selected.length===0;
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
