document.addEventListener('DOMContentLoaded',async()=>{
  const safe=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const translations=window.VIBEYA_MARKET_TRANSLATIONS;
  const bundledCatalog=Array.isArray(window.VIBEYA_INSPIRATION_CATALOG)?window.VIBEYA_INSPIRATION_CATALOG:[];
  const marketParams=new URLSearchParams(location.search);
  const marketCountry=(marketParams.get('country')||'us').toLowerCase();
  const marketDefaults=Object.fromEntries(Object.entries(translations.markets).map(([market,config])=>[market,config.defaultLocale]));
  const marketLocales=Object.fromEntries(Object.entries(translations.markets).map(([market,config])=>[market,config.locales]));
  const requestedLocale=marketParams.get('locale');
  const marketLocale=(marketLocales[marketCountry]||marketLocales.us).includes(requestedLocale)?requestedLocale:marketDefaults[marketCountry]||'en-US';
  const localizedMarket=marketLocale==='ja-JP'||marketLocale==='es-MX';
  const navLabels=translations.navigation[marketLocale]||translations.navigation['en-US'];
  const storyLabels=translations.inspirationTerms?.[marketLocale]||{};
  const marketPhrase=source=>translations.phrases?.[marketLocale]?.[source]||source;
  document.documentElement.lang=marketLocale;
  document.querySelectorAll('header nav a[data-menu-target]').forEach(link=>{
    const key=link.dataset.menuTarget==='how-it-works'?'how':link.dataset.menuTarget;
    if(!navLabels[key])return;
    link.textContent=key==='create'?`✦  ${navLabels[key]}`:navLabels[key];
  });
  document.querySelectorAll('header .account-menu-link,header .account-link').forEach(link=>link.textContent=navLabels.account);
  document.querySelector('header .sign-in-link')?.setAttribute('aria-label',navLabels.signIn);
  document.querySelector('header a[aria-label="Search"]')?.setAttribute('aria-label',navLabels.search);
  document.querySelector('header a[aria-label="Open shopping bag"]')?.setAttribute('aria-label',navLabels.openBag);
  const marketContext=href=>{const url=new URL(href,location.href);url.searchParams.set('country',marketCountry);url.searchParams.set('locale',marketLocale);return url.href;};
  let catalog=[];let excludedIds=new Set();let marketCatalogLoaded=false;
  try{const response=await fetch(`/api/vibeya/inspirations?country_code=${encodeURIComponent(marketCountry)}`,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('Destination inspiration catalog unavailable');const data=await response.json();if(Array.isArray(data.inspirations)){const managed=data.inspirations;excludedIds=new Set(Array.isArray(data.excluded_ids)?data.excluded_ids:[]);catalog=[...managed.map(entry=>({...(bundledCatalog.find(item=>item.id===entry.id)||{}),...entry})),...managed.filter(entry=>!bundledCatalog.some(item=>item.id===entry.id))];if(marketLocale==='ja-JP'||marketLocale==='es-MX')catalog=catalog.filter(entry=>{const localized=entry.translations?.[marketLocale];return localized?.title&&localized?.summary&&localized?.articleBody&&localized?.tags?.length&&localized?.image&&localized?.cardImage;}).map(entry=>({...entry,...entry.translations[marketLocale]}));marketCatalogLoaded=true;}}catch(error){console.warn('Could not load destination inspirations',error);}
  const restrictMarketFilter=(fieldId,key)=>{
    const select=document.getElementById(fieldId);if(!select)return;
    const originalOptions=new Map(Array.from(select.options).map(option=>[option.value,option.cloneNode(true)]));
    const allOption=originalOptions.get('all');
    const available=new Set(catalog.map(entry=>entry[key]).filter(value=>typeof value==='string'&&value));
    select.replaceChildren();if(allOption)select.append(allOption);
    const ordered=[...Array.from(originalOptions.keys()).filter(value=>available.has(value)),...Array.from(available).filter(value=>!originalOptions.has(value)).sort()];
    ordered.forEach(value=>{
      const option=originalOptions.get(value)||new Option(value.replace(/-/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase()),value);
      select.append(option);
    });
  };
  restrictMarketFilter('productFilter','product');
  restrictMarketFilter('patternFilter','pattern');
  restrictMarketFilter('styleFilter','style');
  document.querySelectorAll('[data-inspiration-feature]').forEach(section=>{
    const link=section.querySelector('.actions a[href]');
    if(!link)return;
    const slug=new URL(link.href,location.href).pathname.split('/').pop();
    const entry=catalog.find(item=>item.slug===slug);
    if(!marketCatalogLoaded||!entry||excludedIds.has(entry.id)||entry.published===false){section.hidden=true;section.dataset.destinationUnavailable='true';return;}
    if(entry.summary){const description=section.querySelector('.featured-text > p');if(description)description.textContent=entry.summary;}
    if(localizedMarket&&entry.title){const heading=section.querySelector('.featured-text h2');if(heading)heading.textContent=entry.title;const chips=section.querySelector('.featured-text .chips');if(chips)chips.replaceChildren(...(entry.tags||[]).map(tag=>{const chip=document.createElement('span');chip.className='chip';chip.textContent=tag;return chip;}));const rows=section.querySelectorAll('.featured-text .detail-row');for(const [index,key] of ['product','pattern','style'].entries()){const row=rows[index];if(!row)continue;const strong=row.querySelector('strong');const value=row.querySelector('span');if(strong)strong.textContent=marketPhrase(key[0].toUpperCase()+key.slice(1));if(value)value.textContent=storyLabels[key]?.[entry[key]]||entry[key]||'';}const spotlight=section.querySelector('.featured-text .pill-label');if(spotlight)spotlight.textContent=marketPhrase('DESIGN SPOTLIGHT');const action=section.querySelector('.featured-text .actions a');if(action){action.textContent=marketPhrase('Read the Design Story →');action.href=marketContext(`/vibeya/inspiration/story.html?inspiration=${encodeURIComponent(entry.id)}`);}}
    if(link&&entry.marketUrls?.[marketCountry])link.href=entry.marketUrls[marketCountry];
    if((localizedMarket||entry.useManagedImage)&&entry.image){const image=section.querySelector('.art-card img');if(image){image.src=/^(https?:)?\//.test(entry.image)?new URL(entry.image,location.origin).href:`../assets/inspiration/${encodeURIComponent(entry.image)}`;image.alt=`${entry.title} inspiration`;}}
  });
  document.querySelectorAll('.inspiration-feature-grid .art-card-full img').forEach(image=>{
    const panel=image.parentElement;
    const syncImage=()=>{const width=image.naturalWidth||Number(image.getAttribute('width'));const height=image.naturalHeight||Number(image.getAttribute('height'));if(width&&height)panel.style.setProperty('--artwork-ratio',`${width} / ${height}`);const source=image.currentSrc||image.src;if(source)panel.style.setProperty('--artwork-extension',`url("${source.replace(/"/g,'%22')}")`);};
    if(image.complete)syncImage();else image.addEventListener('load',syncImage,{once:true});
  });
  const isGenericStory=document.body.dataset.inspirationTemplate==='true';
  const articleId=new URLSearchParams(location.search).get('inspiration')||document.body.dataset.inspirationId||'funny-skeleton';
  const hasExplicitStory=!!(new URLSearchParams(location.search).get('inspiration')||document.body.dataset.inspirationId);
  const current=catalog.find(x=>x.id===articleId)||(isGenericStory||hasExplicitStory?undefined:catalog[0]);
  const isInspirationListingPage=!!document.getElementById('inspirationFilters');
  if(!isInspirationListingPage&&!current){location.replace(marketContext('/vibeya/inspiration/index.html'));return;}
  if(localizedMarket&&current&&!isGenericStory&&!isInspirationListingPage){location.replace(marketContext(`/vibeya/inspiration/story.html?inspiration=${encodeURIComponent(current.id)}`));return;}
  document.querySelectorAll('a[href]').forEach(link=>{
    const url=new URL(link.href,location.href);
    if(localizedMarket&&url.pathname.includes('/vibeya/inspiration/')){
      const slug=url.pathname.split('/').pop()||'';
      const target=slug==='story.html'?catalog.find(entry=>entry.id===url.searchParams.get('inspiration')):catalog.find(entry=>entry.slug===slug);
      if(target?.translations?.[marketLocale]?.title&&target.translations[marketLocale].summary&&target.translations[marketLocale].articleBody&&target.translations[marketLocale].image&&target.translations[marketLocale].cardImage){url.pathname='/vibeya/inspiration/story.html';url.searchParams.set('inspiration',target.id);}
    }
    if(/^\/(us|ca|jp|mx)(\/|$)/.test(url.pathname)){
      url.pathname=url.pathname.replace(/^\/(us|ca|jp|mx)(?=\/|$)/,`/${marketCountry}`);
      url.searchParams.set('locale',marketLocale);
    }
    if(url.pathname.includes('/vibeya/inspiration/')||url.pathname.endsWith('/index.html')){
      url.searchParams.set('country',marketCountry);
      url.searchParams.set('locale',marketLocale);
    }
    link.href=url.href;
  });
  const storyLabelsEnglish={
    product:{'long-sleeve':'Custom Long Sleeve Tee',hoodie:'Washed Vintage Hoodie',tumbler:'20 oz Stainless Steel Tumbler','bath-mat':'Custom 3D Bath Mat',beanie:'Custom Knitted Beanie','shower-curtain':'Custom Shower Curtain',tankini:"Custom Women's Tankini Swimsuit Set"},
    pattern:{skeleton:'Humorous Skeleton','botanical-celestial':'Botanical & Celestial',animal:'Animal Print',penguin:'Deadpan Penguin Face',cat:'Cats, Bathtub & Bubbles','rubber-duck':'Duck Bubble Trouble',typography:'Sleepy Cat & Bold Typography'},
    style:{'street-graffiti':'Street Graffiti / Chill Mood','nature-streetwear':'Nature-Inspired Streetwear','retro-whimsical':'Retro Whimsical','playful-whimsy':'Playful Bathroom Decor','cozy-cute':'Cozy, Cute & Playful',streetwear:'Retro Varsity Streetwear',funny:'Funny Graphic Swimwear'}
  };
  const activeStoryLabels=Object.keys(storyLabels).length?storyLabels:storyLabelsEnglish;
  const storyMeta=document.querySelector('.story-meta');
  if(isGenericStory&&current){
    document.title=`${current.title} | VIBEYA Design Story`;
    const title=document.getElementById('storyTitle');if(title)title.textContent=current.title;
    const summary=document.getElementById('storySummary');if(summary)summary.textContent=current.summary||'Explore the idea behind this design, then make a version that feels like you.';
    const image=document.getElementById('storyHeroImage');
    if(image){const source=current.image||current.cardImage||'';image.src=/^(https?:)?\//.test(source)?new URL(source,location.origin).href:`../assets/inspiration/${encodeURIComponent(source)}`;image.alt=`${current.title} design inspiration`;}
    const tags=document.getElementById('storyTags');if(tags)tags.innerHTML=(current.tags||[]).map(tag=>`<span class="chip">${safe(tag)}</span>`).join('');
    for(const [key,id] of [['product','storyProduct'],['pattern','storyPattern'],['style','storyStyle']]){const node=document.getElementById(id);if(node)node.textContent=activeStoryLabels[key]?.[current[key]]||current[key]||'';}
    const body=document.getElementById('storyBody');if(body){body.replaceChildren(...String(current.articleBody||'').split(/\n\s*\n/).map(text=>text.trim()).filter(Boolean).map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));body.hidden=!current.articleBody;}
    window.VIBEYA_CUSTOMIZE_URL=`../index.html?openStudio=1&embeddedStudio=1&inspiration=${encodeURIComponent(current.id)}`;
  }else if(isGenericStory){
    document.title='Design story unavailable | VIBEYA';
    const spotlight=document.querySelector('.story-spotlight');if(spotlight)spotlight.hidden=true;
    const body=document.getElementById('storyBody');if(body){body.hidden=false;const message=document.createElement('p');message.textContent='This design story is not available right now.';body.replaceChildren(message);}
  }
  if(storyMeta&&current){
    ['product','pattern','style'].forEach(key=>{const value=storyMeta.querySelector(`[data-story-value="${key}"]`);if(value)value.textContent=activeStoryLabels[key]?.[current[key]]||current[key]||'';});
    storyMeta.hidden=false;
  }
  const moreSection=document.getElementById('moreInspirationSection');
  const moreCards=document.getElementById('moreInspirationCards');
  const isInspirationListing=!!document.getElementById('inspirationFilters');
  if(isInspirationListing&&(marketLocale==='ja-JP'||marketLocale==='es-MX')&&!catalog.length){
    document.querySelectorAll('[data-inspiration-feature]').forEach(section=>section.hidden=true);
    const filters=document.getElementById('inspirationFilters');if(filters)filters.hidden=true;
    const noResults=document.getElementById('noResults');if(noResults){noResults.hidden=false;const heading=noResults.querySelector('strong');const detail=noResults.querySelector('p');const reset=noResults.querySelector('button');const localizedUi=translations.ui[marketCountry];if(heading)heading.textContent=marketCatalogLoaded?localizedUi.noInspirationsYet:localizedUi.inspirationLoadErrorTitle;if(detail)detail.textContent=marketCatalogLoaded?localizedUi.inspirationEmptyDescription:localizedUi.inspirationLoadErrorDescription;if(reset)reset.hidden=true;}
  }
  if(marketLocale==='ja-JP'||marketLocale==='es-MX')document.documentElement.style.visibility='visible';
  fetch('/api/vibeya/session',{credentials:'same-origin',cache:'no-store'}).then(response=>response.ok?response.json():null).then(session=>{
    const authenticated=!!session?.authenticated;
    document.body.dataset.vibeyaAuth=authenticated?'authenticated':'guest';
    const label=authenticated?navLabels.account:navLabels.signIn;
    document.querySelectorAll('.account-link,.account-menu-link,.sign-in-link').forEach(link=>{const text=link.classList.contains('sign-in-link')&&!authenticated?navLabels.signIn:navLabels.account;link.textContent=text;link.setAttribute('aria-label',text);});
  }).catch(()=>{document.body.dataset.vibeyaAuth='guest';document.querySelectorAll('.account-link,.account-menu-link,.sign-in-link').forEach(link=>{link.textContent=link.classList.contains('sign-in-link')?navLabels.signIn:navLabels.account;link.setAttribute('aria-label',navLabels.signIn);});});
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
          if(!entry||entry.published===false||entry.id===current.id)return [];
          href.searchParams.set('country',marketCountry);
          href.searchParams.set('locale',marketLocale);
          if(localizedMarket)href.pathname='/vibeya/inspiration/story.html';
          if(localizedMarket)href.searchParams.set('inspiration',entry.id);
          return [{id:entry.id,title:entry.title||section.querySelector('.featured-text h2')?.textContent?.replace(/\s+/g,' ').trim()||'VIBEYA inspiration',product:entry.product,pattern:entry.pattern,style:entry.style,slug:href.href,image:new URL(image.getAttribute('src')||'',inspirationUrl).href,alt:image.getAttribute('alt')||entry.title||'VIBEYA inspiration'}];
        });
      }
    }catch(error){console.warn('Could not load inspiration-list feature cards',error);}
    for(let i=related.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[related[i],related[j]]=[related[j],related[i]];}
    const selected=related.slice(0,4);
    moreCards.innerHTML=selected.map(x=>`<a class="related-card home-featured-inspo" data-inspiration="${safe(x.id)}" data-product="${safe(x.product)}" data-pattern="${safe(x.pattern)}" data-style="${safe(x.style)}" style="--artwork-extension:url('${safe(x.image)}')" href="${safe(x.slug)}" aria-label="Open ${safe(x.title)}"><img loading="lazy" src="${safe(x.image)}" alt="${safe(x.alt)}"></a>`).join('');
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
      params.set('locale',marketLocale);
      window.location.assign(`/${marketCountry}?${params.toString()}#top`);
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
      featuredCards.forEach(card=>card.hidden=card.dataset.destinationUnavailable==='true'||!matches({product:card.dataset.product,pattern:card.dataset.pattern,style:card.dataset.style},p,pat,s));
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
