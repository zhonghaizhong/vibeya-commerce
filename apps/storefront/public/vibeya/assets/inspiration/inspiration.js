const bindHowItWorksDialog=(locale)=>{
  const copy={
    'en-US':{title:'How It Works',intro:'Turn your ideas into one-of-a-kind things. Just describe it, get creative, and make it yours.',steps:[['Describe your idea','Tell us what you imagine.'],['Preview & customize','See it on your favorite product.'],['Make it yours','Approve it, then we make it.']],close:'Close'},
    'en-CA':{title:'How It Works',intro:'Turn your ideas into one-of-a-kind things. Just describe it, get creative, and make it yours.',steps:[['Describe your idea','Tell us what you imagine.'],['Preview & customize','See it on your favourite product.'],['Make it yours','Approve it, then we make it.']],close:'Close'},
    'ja-JP':{title:'ご利用方法',intro:'アイデアを、あなただけのアイテムに。デザインを説明して、プレビューで確認しましょう。',steps:[['アイデアを伝える','作りたいデザインを入力します。'],['プレビューして調整','商品に反映されたデザインを確認します。'],['注文する','仕上がりを確認して注文します。']],close:'閉じる'},
    'es-MX':{title:'Cómo funciona',intro:'Convierte tus ideas en algo único. Describe tu diseño, personalízalo y hazlo tuyo.',steps:[['Describe tu idea','Cuéntanos qué diseño imaginas.'],['Previsualiza y personaliza','Mira cómo queda en tu producto favorito.'],['Hazlo tuyo','Confirma el diseño y nosotros lo fabricamos.']],close:'Cerrar'}
  }[locale]||{
    title:'How It Works',intro:'Turn your ideas into one-of-a-kind things. Just describe it, get creative, and make it yours.',steps:[['Describe your idea','Tell us what you imagine.'],['Preview & customize','See it on your favorite product.'],['Make it yours','Approve it, then we make it.']],close:'Close'
  };
  const cssId='vibeya-how-it-works-style';
  if(!document.getElementById(cssId)){
    const style=document.createElement('style');style.id=cssId;
    style.textContent='.vibeya-how-overlay{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:20px;background:#160d24aa;backdrop-filter:blur(5px)}.vibeya-how-overlay.open{display:flex}.vibeya-how-dialog{width:min(100%,820px);max-height:calc(100vh - 40px);overflow:auto;padding:clamp(22px,4vw,42px);border:1px solid #e8d7fa;border-radius:28px;background:#fffdfa;color:#160d24;box-shadow:0 28px 90px #160d2445;font-family:inherit}.vibeya-how-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:28px}.vibeya-how-head h2{margin:0;font-family:Outfit,"Arial Black",system-ui,sans-serif;font-size:clamp(30px,5vw,48px);font-weight:900;letter-spacing:-.055em;line-height:.98}.vibeya-how-head p{max-width:590px;margin:13px 0 0;color:#655a70;font-size:15px;line-height:1.65}.vibeya-how-close{display:grid;width:42px;height:42px;flex:0 0 auto;place-items:center;border:1px solid #e9e3ea;border-radius:50%;background:#fff;color:#160d24;font-size:25px;line-height:1;cursor:pointer}.vibeya-how-close:hover{background:#f1e5ff}.vibeya-how-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.vibeya-how-step{min-width:0;padding:20px 18px;border:1px solid #e9d9fa;border-radius:19px;background:linear-gradient(145deg,#fff,#faf5ff)}.vibeya-how-number{display:grid;width:38px;height:38px;place-items:center;margin-bottom:18px;border-radius:50%;background:#dcfc60;font-weight:900}.vibeya-how-step h3{margin:0 0 8px;font-size:17px;letter-spacing:-.02em;line-height:1.25}.vibeya-how-step p{margin:0;color:#655a70;font-size:13px;line-height:1.55}.vibeya-how-footer{display:flex;justify-content:flex-end;margin-top:23px}.vibeya-how-done{min-height:45px;padding:0 23px;border:0;border-radius:999px;background:#dcfc60;color:#160d24;font:inherit;font-size:13px;font-weight:900;cursor:pointer}@media(max-width:650px){.vibeya-how-steps{grid-template-columns:1fr;gap:10px}.vibeya-how-step{display:grid;grid-template-columns:38px 1fr;column-gap:14px;padding:15px}.vibeya-how-number{grid-row:span 2;margin:0}.vibeya-how-step h3{align-self:end;margin-bottom:4px}.vibeya-how-step p{align-self:start}}';
    document.head.append(style);
  }
  let overlay=document.getElementById('vibeyaHowItWorksOverlay');
  if(!overlay){
    overlay=document.createElement('div');overlay.id='vibeyaHowItWorksOverlay';overlay.className='vibeya-how-overlay';overlay.setAttribute('role','presentation');
    overlay.innerHTML=`<section class="vibeya-how-dialog" role="dialog" aria-modal="true" aria-labelledby="vibeyaHowTitle" aria-describedby="vibeyaHowIntro" tabindex="-1"><div class="vibeya-how-head"><div><h2 id="vibeyaHowTitle"></h2><p id="vibeyaHowIntro"></p></div><button class="vibeya-how-close" type="button" data-how-close aria-label="${copy.close}">×</button></div><div class="vibeya-how-steps"></div><div class="vibeya-how-footer"><button class="vibeya-how-done" type="button" data-how-close></button></div></section>`;
    document.body.append(overlay);
  }
  const dialog=overlay.querySelector('.vibeya-how-dialog');
  overlay.querySelector('#vibeyaHowTitle').textContent=copy.title;
  overlay.querySelector('#vibeyaHowIntro').textContent=copy.intro;
  overlay.querySelector('.vibeya-how-steps').replaceChildren(...copy.steps.map(([title,description],index)=>{const article=document.createElement('article');article.className='vibeya-how-step';article.innerHTML=`<span class="vibeya-how-number" aria-hidden="true">0${index+1}</span><h3></h3><p></p>`;article.querySelector('h3').textContent=`${index+1}. ${title}`;article.querySelector('p').textContent=description;return article;}));
  overlay.querySelector('.vibeya-how-done').textContent=copy.close;
  let previousFocus=null;let previousOverflow='';
  const close=()=>{if(!overlay.classList.contains('open'))return;overlay.classList.remove('open');document.body.style.overflow=previousOverflow;if(previousFocus?.isConnected)previousFocus.focus();};
  const open=trigger=>{previousFocus=trigger;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';overlay.classList.add('open');overlay.querySelector('.vibeya-how-close').focus();};
  overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-how-close]'))close();});
  document.addEventListener('keydown',event=>{
    if(!overlay.classList.contains('open'))return;
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key!=='Tab'||!dialog)return;
    const focusable=Array.from(dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')).filter(element=>element.offsetParent!==null);
    if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('a[href*="#how-it-works"]');
    if(!trigger)return;event.preventDefault();open(trigger);
  });
};

document.addEventListener('DOMContentLoaded',async()=>{
  const safe=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const translations=window.VIBEYA_MARKET_TRANSLATIONS;
  const bundledCatalog=Array.isArray(window.VIBEYA_INSPIRATION_CATALOG)?window.VIBEYA_INSPIRATION_CATALOG:[];
  // Keep the U.S. inspiration facets on a stable three-part taxonomy:
  // product = the actual product type, pattern = the main artwork subject,
  // and style = the broader visual/audience direction. New catalog values
  // remain supported through the readable fallback below.
  const fallbackFacetLabels={
    product:{'long-sleeve':'VIBEYA Custom Cotton Long Sleeve Tee',hoodie:'VIBEYA Washed Vintage Hooded Sweatshirt',tumbler:'VIBEYA Custom 20 oz Stainless Steel Tumbler','bath-mat':'VIBEYA Custom 3D Optical Illusion Bath Mat',blanket:'VIBEYA Custom Flannel Throw Blanket',beanie:'VIBEYA Custom Knitted Beanie','shower-curtain':'VIBEYA Custom Shower Curtain',tankini:"VIBEYA Custom Women's Tankini Swimsuit Set",'basketball-uniform':"VIBEYA Custom Kids' Basketball Uniform",apron:'VIBEYA Custom Prompt-Designed Apron','metal-sign':'VIBEYA Custom Metal Bottle Cap Wall Sign','baseball-cap':'VIBEYA Custom Washed Denim Baseball Cap','yoga-set':"VIBEYA Custom Women's Yoga Set"},
    pattern:{skeleton:'Skeleton','botanical-celestial':'Botanical & Celestial',animal:'Animal Print',penguin:'Penguin',cat:'Cats','rubber-duck':'Rubber Duck','sleepy-sheep':'Sleep & Dream','sports-typography':'Basketball Typography','tomato-chef':'Tomato Chef',raccoon:'Raccoon',flag:'American Flag',typography:'Typography'},
    style:{'street-graffiti':'Streetwear & Graffiti','nature-streetwear':'Nature-Inspired Streetwear','retro-whimsical':'Retro Whimsical','playful-whimsy':'Playful & Whimsical','cozy-humor':'Cozy Humor','streetwear':'Streetwear','cozy-cute':'Cozy & Cute','funny':'Funny & Humorous','youth-sports':'Youth Sports','retro-bar':'Retro Bar Decor','retro-americana':'Retro Americana','playful-activewear':'Playful Activewear'}
  };
  const marketParams=new URLSearchParams(location.search);
  const pathCountry=location.pathname.match(/^\/(ca|mx|jp)\/inspiration\//i)?.[1]?.toLowerCase();
  const marketCountry=(pathCountry||marketParams.get('country')||'us').toLowerCase();
  const marketDefaults=Object.fromEntries(Object.entries(translations.markets).map(([market,config])=>[market,config.defaultLocale]));
  const marketLocales=Object.fromEntries(Object.entries(translations.markets).map(([market,config])=>[market,config.locales]));
  const requestedLocale=marketParams.get('locale');
  const marketLocale=(marketLocales[marketCountry]||marketLocales.us).includes(requestedLocale)?requestedLocale:marketDefaults[marketCountry]||'en-US';
  const localizedMarket=marketLocale==='ja-JP'||marketLocale==='es-MX';
  const navLabels=translations.navigation[marketLocale]||translations.navigation['en-US'];
  bindHowItWorksDialog(marketLocale);
  const storyLabels=translations.inspirationTerms?.[marketLocale]||{};
  const marketPhrase=source=>translations.phrases?.[marketLocale]?.[source]||source;
  const filterFieldLabels={product:'Product',pattern:'Pattern',style:'Style'};
  Object.entries(filterFieldLabels).forEach(([key,label])=>{
    const fieldLabel=document.querySelector(`#${key}Filter`)?.closest('.filter')?.querySelector('label');
    if(fieldLabel)fieldLabel.textContent=marketPhrase(label);
  });
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
  let catalog=[];let excludedIds=new Set();let marketCatalogLoaded=false;let managedTaxonomy={};
  const normalizeInspirationSlug=value=>String(value||'').split('/').pop().replace(/\.html?$/i,'').toLowerCase();
  const findInspirationBySlug=slug=>catalog.find(item=>normalizeInspirationSlug(item.slug)===normalizeInspirationSlug(slug));
  const facetLabel=(key,value)=>managedTaxonomy[key]?.find(option=>option.value===value)?.labels?.[marketLocale]||storyLabels[key]?.[value]||fallbackFacetLabels[key]?.[value]||value;
  try{const response=await fetch(`/api/vibeya/inspirations?country_code=${encodeURIComponent(marketCountry)}`,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('Destination inspiration catalog unavailable');const data=await response.json();if(Array.isArray(data.inspirations)){const managed=data.inspirations;managedTaxonomy=data.taxonomy&&typeof data.taxonomy==='object'?data.taxonomy:{};excludedIds=new Set(Array.isArray(data.excluded_ids)?data.excluded_ids:[]);catalog=[...managed.map(entry=>({...(bundledCatalog.find(item=>item.id===entry.id)||{}),...entry})),...managed.filter(entry=>!bundledCatalog.some(item=>item.id===entry.id))];if(marketLocale==='ja-JP'||marketLocale==='es-MX')catalog=catalog.filter(entry=>{const localized=entry.translations?.[marketLocale];return localized?.title&&localized?.summary&&localized?.articleBody&&localized?.tags?.length&&localized?.image&&localized?.cardImage;}).map(entry=>({...entry,...entry.translations[marketLocale]}));marketCatalogLoaded=true;}}catch(error){console.warn('Could not load destination inspirations',error);}
  const restrictMarketFilter=(fieldId,key)=>{
    const select=document.getElementById(fieldId);if(!select)return;
    const originalOptions=new Map(Array.from(select.options).map(option=>[option.value,option.cloneNode(true)]));
    const allOption=originalOptions.get('all');
    if(allOption)allOption.textContent=marketPhrase(({product:'All Products',pattern:'All Patterns',style:'All Styles'})[key]);
    const available=new Set(catalog.map(entry=>entry[key]).filter(value=>typeof value==='string'&&value));
    select.replaceChildren();if(allOption)select.append(allOption);
    const ordered=[...Array.from(originalOptions.keys()).filter(value=>available.has(value)),...Array.from(available).filter(value=>!originalOptions.has(value)).sort()];
    ordered.forEach(value=>{
      const label=facetLabel(key,value)||value.replace(/-/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
      const option=originalOptions.get(value)||new Option(label,value);
      option.textContent=label;
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
    const entry=findInspirationBySlug(slug);
    if(!marketCatalogLoaded||!entry||excludedIds.has(entry.id)||entry.published===false){section.hidden=true;section.dataset.destinationUnavailable='true';return;}
    if(entry.summary){const description=section.querySelector('.featured-text > p');if(description)description.textContent=entry.summary;}
    if(localizedMarket&&entry.title){const heading=section.querySelector('.featured-text h2');if(heading)heading.textContent=entry.title;const chips=section.querySelector('.featured-text .chips');if(chips)chips.replaceChildren(...(entry.tags||[]).map(tag=>{const chip=document.createElement('span');chip.className='chip';chip.textContent=tag;return chip;}));const rows=section.querySelectorAll('.featured-text .detail-row');for(const [index,key] of ['product','pattern','style'].entries()){const row=rows[index];if(!row)continue;const strong=row.querySelector('strong');const value=row.querySelector('span');if(strong)strong.textContent=marketPhrase(key[0].toUpperCase()+key.slice(1));if(value)value.textContent=facetLabel(key,entry[key])||entry[key]||'';}const spotlight=section.querySelector('.featured-text .pill-label');if(spotlight)spotlight.textContent=marketPhrase('DESIGN SPOTLIGHT');const action=section.querySelector('.featured-text .actions a');if(action){action.textContent=marketPhrase('Read the Design Story →');action.href=marketContext(`/vibeya/inspiration/story.html?inspiration=${encodeURIComponent(entry.id)}`);}}
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
  if(isGenericStory&&!current){location.replace(marketContext('/vibeya/inspiration/index.html'));return;}
  const marketStoryUrl=current?.marketUrls?.[marketCountry];
  if(isGenericStory&&marketStoryUrl){location.replace(marketStoryUrl);return;}
  document.querySelectorAll('a[href]').forEach(link=>{
    const url=new URL(link.href,location.href);
    if(localizedMarket&&url.pathname.includes('/vibeya/inspiration/')){
      const slug=url.pathname.split('/').pop()||'';
      const target=slug==='story.html'?catalog.find(entry=>entry.id===url.searchParams.get('inspiration')):catalog.find(entry=>entry.slug===slug);
      if(target?.marketUrls?.[marketCountry]){link.href=target.marketUrls[marketCountry];return;}
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
  const defaultStudioOptions={
    'funny-skeleton':['sds-167256','Black','front'],
    'hoodie-orbit-bloom':['vibeya-washed-hoodie','Purple','front'],
    'midnight-cat-cafe':['sds-128646','White','wrap'],
    'duck-bubble-trouble':['sds-138708','White','wrap'],
    'no-nightmares-blanket':['sds-97226','White','wrap'],
    'low-battery-club-beanie':['sds-172647','Black','front'],
    'cat-bubble-cats-shower-curtain':['vibeya-shower-curtain','White','front'],
    'deadpan-penguin-tankini':['sds-137892','Black','front'],
    'never-stop-kids-basketball':['sds-233939','Red','front'],
    'sauce-boss-apron':['sds-275844','Black','front'],
    'raccoon-bar-crew':['mg8014061','Black','front'],
    'stars-stripes-denim-cap':['mg8012002','Black','front'],
    'yoga-animals-set':['sds-63823','White','both']
  };
  const studioUrl=new URL(window.VIBEYA_CUSTOMIZE_URL||'/vibeya/index.html',location.href);
  const navStudioUrl=document.querySelector('header .nav-ai[href]');
  const navStudioParams=navStudioUrl?new URL(navStudioUrl.href,location.href).searchParams:null;
  const defaults=defaultStudioOptions[current?.id];
  if(!window.VIBEYA_CUSTOMIZE_URL&&navStudioParams){
    for(const key of ['product','color','size','print','areas','prompt'])if(navStudioParams.has(key))studioUrl.searchParams.set(key,navStudioParams.get(key));
  }
  if(defaults&&!studioUrl.searchParams.has('product')){
    studioUrl.searchParams.set('product',defaults[0]);
    studioUrl.searchParams.set('color',defaults[1]);
    studioUrl.searchParams.set('print',defaults[2]);
  }
  if(current?.id==='yoga-animals-set'&&!studioUrl.searchParams.has('size'))studioUrl.searchParams.set('size','M');
  studioUrl.pathname='/vibeya/index.html';
  studioUrl.hash='';
  studioUrl.searchParams.set('country',marketCountry);
  studioUrl.searchParams.set('locale',marketLocale);
  studioUrl.searchParams.set('openStudio','1');
  studioUrl.searchParams.set('embeddedStudio','1');
  if(current?.id)studioUrl.searchParams.set('inspiration',current.id);
  window.VIBEYA_CUSTOMIZE_URL=studioUrl.href;
  const customizeLabels={'en-US':'Customize This Product →','en-CA':'Customize This Product →','ja-JP':'この商品をカスタマイズ →','es-MX':'Personaliza este producto →','fr-CA':'Personnaliser ce produit →'};
  const asideCaptionLabels={'en-US':'The design at a glance','en-CA':'The design at a glance','ja-JP':'デザインのポイント','es-MX':'El diseño de un vistazo','fr-CA':'Aperçu du design'};
  document.querySelectorAll('[data-open-customize]').forEach(button=>{
    button.textContent=customizeLabels[marketLocale]||customizeLabels['en-US'];
    button.setAttribute('aria-label',button.textContent.replace(/\s*→$/,''));
  });
  document.querySelectorAll('.inspiration-detail-aside .aside-caption').forEach(label=>{label.textContent=asideCaptionLabels[marketLocale]||asideCaptionLabels['en-US'];});
  const storyLabelsEnglish={product:fallbackFacetLabels.product,pattern:fallbackFacetLabels.pattern,style:fallbackFacetLabels.style};
  const activeStoryLabels=Object.keys(storyLabels).length?storyLabels:storyLabelsEnglish;
  const storyMeta=document.querySelector('.story-meta');
  if(isGenericStory&&current){
    document.title=`${current.title} | VIBEYA Design Story`;
    const title=document.getElementById('storyTitle');if(title)title.textContent=current.title;
    const summary=document.getElementById('storySummary');if(summary)summary.textContent=current.summary||'Explore the idea behind this design, then make a version that feels like you.';
    const image=document.getElementById('storyHeroImage');
    if(image){const source=current.image||current.cardImage||'';image.src=/^(https?:)?\//.test(source)?new URL(source,location.origin).href:`../assets/inspiration/${encodeURIComponent(source)}`;image.alt=`${current.title} design inspiration`;}
    const printImage=document.getElementById('storyPrintImage');
    if(printImage){const source=current.printImage||current.image||current.cardImage||'';printImage.src=/^(https?:)?\//.test(source)?new URL(source,location.origin).href:`../assets/inspiration/${encodeURIComponent(source)}`;printImage.alt=`${current.title} print artwork`}
    const glance=document.getElementById('storyGlanceText');
    if(glance){glance.textContent=marketLocale==='ja-JP'?'商品に使われている印刷デザイン。色や配置をカスタマイズできます。':marketLocale==='es-MX'?'Diseño de impresión usado en el producto. Personaliza los colores y la ubicación.':'The print artwork used on this product. Customize the colors and placement to make it yours.';}
    const tags=document.getElementById('storyTags');if(tags)tags.innerHTML=(current.tags||[]).map(tag=>`<span class="chip">${safe(tag)}</span>`).join('');
    for(const [key,id] of [['product','storyProduct'],['pattern','storyPattern'],['style','storyStyle']]){const node=document.getElementById(id);if(node)node.textContent=facetLabel(key,current[key])||activeStoryLabels[key]?.[current[key]]||current[key]||'';}
    const body=document.getElementById('storyBody');if(body){body.replaceChildren(...String(current.articleBody||'').split(/\n\s*\n/).map(text=>text.trim()).filter(Boolean).map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));body.hidden=!current.articleBody;}
    window.VIBEYA_CUSTOMIZE_URL=studioUrl.href;
  }else if(isGenericStory){
    document.title='Design story unavailable | VIBEYA';
    const spotlight=document.querySelector('.story-spotlight');if(spotlight)spotlight.hidden=true;
    const body=document.getElementById('storyBody');if(body){body.hidden=false;const message=document.createElement('p');message.textContent='This design story is not available right now.';body.replaceChildren(message);}
  }
  if(storyMeta&&current){
    ['product','pattern','style'].forEach(key=>{const value=storyMeta.querySelector(`[data-story-value="${key}"]`);if(value)value.textContent=facetLabel(key,current[key])||activeStoryLabels[key]?.[current[key]]||current[key]||'';});
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
          const entry=findInspirationBySlug(slug);
          if(!entry||entry.published===false||entry.id===current.id)return [];
          const marketStoryUrl=entry.marketUrls?.[marketCountry];
          const targetUrl=marketStoryUrl?new URL(marketStoryUrl,location.origin):href;
          targetUrl.searchParams.set('country',marketCountry);
          targetUrl.searchParams.set('locale',marketLocale);
          if(!marketStoryUrl&&localizedMarket)targetUrl.searchParams.set('inspiration',entry.id);
          return [{id:entry.id,title:entry.title||section.querySelector('.featured-text h2')?.textContent?.replace(/\s+/g,' ').trim()||'VIBEYA inspiration',product:entry.product,pattern:entry.pattern,style:entry.style,slug:targetUrl.href,image:new URL(image.getAttribute('src')||'',inspirationUrl).href,alt:image.getAttribute('alt')||entry.title||'VIBEYA inspiration'}];
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
  const openCustomize=button=>{
    if(!customizeOverlay||!customizeFrame)return;
    customizeAllowed=true;
    customizeOpener=button;customizeDialog?.classList.remove('is-loaded');
    customizeOverlay.hidden=false;document.body.classList.add('customize-open');
    customizeFrame.src=window.VIBEYA_CUSTOMIZE_URL||'../index.html?inspiration=funny-skeleton&embeddedStudio=1';
  };
  document.querySelectorAll('[data-open-customize]').forEach(button=>button.addEventListener('click',()=>openCustomize(button)));
  document.querySelectorAll('[data-close-customize]').forEach(button=>button.addEventListener('click',closeCustomize));
  customizeFrame?.addEventListener('load',()=>customizeDialog?.classList.add('is-loaded'));
  customizeOverlay?.addEventListener('click',e=>{if(e.target===customizeOverlay)closeCustomize();});
  window.addEventListener('message',e=>{
    if(e.source!==customizeFrame?.contentWindow)return;
    if(/^https?:$/.test(location.protocol)&&e.origin!==location.origin)return;
    if(e.data?.type==='vibeya:request-studio'&&customizeAllowed){
      customizeFrame.contentWindow?.postMessage({type:'vibeya:open-studio',product:e.data.product,color:e.data.color,size:e.data.size,print:e.data.print,areas:e.data.areas,prompt:e.data.prompt},location.origin);
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
