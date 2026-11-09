document.addEventListener('DOMContentLoaded',()=>{
 const files=Array.isArray(window.VIBEYA_GALLERY_IMAGES)?window.VIBEYA_GALLERY_IMAGES:[
  {src:'gallery-01-front-street.webp',alt:'Seated model with the front skeleton print'},
  {src:'gallery-02-front-standing.webp',alt:'Model standing in the funny skeleton long sleeve'},
  {src:'gallery-03-back-concept.webp',alt:'Back-view concept with coordinated lime and purple crown print'},
  {src:'gallery-04-side-street.webp',alt:'Relaxed seated model wearing the skeleton front graphic'}
 ];
 const stage=document.getElementById('galleryMainImage');
 const thumbs=[...document.querySelectorAll('[data-gallery-index]')];
 let active=0;
 function select(index){
  if(!files.length)return;
  active=(index+files.length)%files.length;
  if(stage){stage.src='../assets/inspiration/'+files[active].src;stage.alt=files[active].alt;}
  const count=document.getElementById('galleryCounter');
  if(count)count.textContent=String(active+1).padStart(2,'0')+' / '+String(files.length).padStart(2,'0');
  thumbs.forEach((b,i)=>{b.classList.toggle('is-active',i===active);b.setAttribute('aria-pressed',i===active?'true':'false')});
 }
 thumbs.forEach(b=>b.addEventListener('click',()=>select(Number(b.dataset.galleryIndex))));
 document.querySelectorAll('[data-gallery-dir]').forEach(b=>b.addEventListener('click',()=>select(active+(b.dataset.galleryDir==='next'?1:-1))));
 document.getElementById('articleGallery')?.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();select(active+1)}if(e.key==='ArrowLeft'){e.preventDefault();select(active-1)}});
 const config=window.VIBEYA_PURCHASE_CONFIG||{};
 const img=document.getElementById('purchaseMainImage');
 const purchaseNote=document.querySelector('.purchase-photo p');
 const colorField=document.getElementById('purchaseColor');
 const label=document.getElementById('purchaseColorLabel');
 const syncCustomizeUrl=(color,placement)=>{
  if(!window.VIBEYA_CUSTOMIZE_URL)return;
  const target=new URL(window.VIBEYA_CUSTOMIZE_URL,location.href);
  target.searchParams.set('color',color||'Purple');
  target.searchParams.set('print',placement||'front');
  window.VIBEYA_CUSTOMIZE_URL=target.pathname+target.search;
 };
 document.querySelectorAll('[data-color]').forEach(btn=>btn.addEventListener('click',()=>{
  const code=btn.dataset.color;const name=btn.getAttribute('aria-label')||btn.title||code;
  if(colorField)colorField.value=code;
  syncCustomizeUrl(code,document.getElementById('purchasePrint')?.value||'front');
  if(label)label.textContent=name;
  const image=config.colorImages?.[code]||'color-'+code+'.webp';
  const imageSrc=image.startsWith('../')?image:'../assets/inspiration/'+image;
  if(img){img.src=imageSrc;img.alt=(config.colorDesignNames?.[code]||'Orbit Bloom')+' print on a '+name+' hoodie';}
  const intro=document.getElementById('purchaseIntro');
  if(intro)intro.textContent='Orbit Bloom · same original print on the '+name+' hoodie. Choose a size, print placement, and quantity.';
  if(purchaseNote)purchaseNote.textContent=(config.colorNotes?.[code]||name+' · design preview, not a production photograph');
  document.querySelectorAll('[data-color]').forEach(b=>{b.classList.toggle('selected',b===btn);b.setAttribute('aria-pressed',b===btn?'true':'false')});
 }));
 const printField=document.getElementById('purchasePrint');
 const printLabel=document.getElementById('purchasePrintLabel');
 const placementNames={front:'Front Only',back:'Back Only',both:'Front + Back'};
 document.querySelectorAll('[data-print]').forEach(btn=>btn.addEventListener('click',()=>{
  const placement=btn.dataset.print;
  if(printField)printField.value=placement;
  syncCustomizeUrl(colorField?.value||'Purple',placement);
  if(printLabel)printLabel.textContent=placementNames[placement]||placement;
  document.querySelectorAll('[data-print]').forEach(b=>{b.classList.toggle('selected',b===btn);b.setAttribute('aria-pressed',b===btn?'true':'false')});
  if(purchaseNote)purchaseNote.textContent='Shown image is the front-artwork reference; '+(placementNames[placement]||placement)+' must be confirmed in the production preview.';
 }));
 const sizeField=document.getElementById('purchaseSize');
 document.querySelectorAll('[data-size]').forEach(btn=>btn.addEventListener('click',()=>{
  if(sizeField)sizeField.value=btn.dataset.size;
  document.querySelector('.purchase-size-row')?.classList.remove('is-invalid');
  document.querySelectorAll('[data-size]').forEach(b=>{b.classList.toggle('selected',b===btn);b.setAttribute('aria-pressed',b===btn?'true':'false')});
 }));
});
