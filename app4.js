/* app4: welcome, settings, parent zone, screen time, start-up */
function createProfile(type){const n=$('wName').value.trim().slice(0,16)||(type==='kid'?'Kid':'Me');
  const p={id:'p'+Date.now(),name:n,type};profiles.push(p);pf=p.id;saveProfiles();$('wName').value='';show('home')}
$('wAdult').onclick=()=>createProfile('adult');$('wKid').onclick=()=>createProfile('kid');
function renderSettings(){const r=$('setRegion');if(!r.options.length)REGIONS.forEach(x=>r.add(new Option(x.name,x.id)));r.value=region||'uk';$('setPaper').value=paper();applySpelling()}
$('setRegion').onchange=e=>{region=e.target.value;LS.setItem('region',region);LS.removeItem('paper');renderSettings()};
$('setPaper').onchange=e=>LS.setItem('paper',e.target.value);

let pinMode='enter';
function resetParent(){$('pBox').style.display='none';$('pinBox').style.display='block';$('pinIn').value='';$('pinMsg').textContent='';
  pinMode=LS.getItem('pin')?'enter':'new';$('pinText').textContent=pinMode==='new'?'Create a 4-digit PIN for the parent zone.':'Enter your PIN.'}
$('pinGo').onclick=()=>{const v=$('pinIn').value;if(!/^\d{4}$/.test(v)){$('pinMsg').textContent='Enter exactly 4 digits.';return}
  if(pinMode==='new'){LS.setItem('pin',v);open_()}else if(v===LS.getItem('pin'))open_();else $('pinMsg').textContent='That PIN is not right. Try again.';
  function open_(){$('pinBox').style.display='none';$('pBox').style.display='block';$('limit').value=LS.getItem('limit')||'0';renderParent()}};
$('chgPin').onclick=()=>{LS.removeItem('pin');resetParent()};
$('limit').onchange=()=>LS.setItem('limit',$('limit').value);
function row(label,img,btns){const r=document.createElement('div');r.className='row-item';
  if(img){const i=document.createElement('img');i.alt='';i.src=img;r.appendChild(i)}
  const s=document.createElement('span');s.style.flex='1';s.textContent=label;r.appendChild(s);
  const a=document.createElement('div');a.className='acts';btns.forEach(([t,c,f])=>{const b=document.createElement('button');b.textContent=t;if(c)b.className=c;b.onclick=f;a.appendChild(b)});r.appendChild(a);return r}
function mins(id,days){const u=J('use',{});let t=0;for(let i=0;i<days;i++){const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10);t+=(u[id+'|'+d]||{s:0}).s}return Math.round(t/60)}
async function renderParent(){
  const all=await getAll('pages'),art=await getAll('art'),first=profiles[0].id;
  const dash=$('dash');dash.innerHTML='';profiles.forEach(p=>{const m=art.filter(a=>(a.pf||first)===p.id);
    dash.appendChild(row(p.name+' ('+p.type+'): '+mins(p.id,1)+' min today, '+mins(p.id,7)+' min this week, '+m.length+' pages coloured, '+m.filter(a=>a.done).length+' finished',null,[]))});
  const pend=$('pend');pend.innerHTML='';const pp=all.filter(p=>p.ok===false);if(!pp.length)pend.innerHTML='<p class="sub">Nothing waiting.</p>';
  pp.forEach(p=>pend.appendChild(row(p.name,p.url,[['Approve','ok',async()=>{p.ok=true;await put('pages',p);renderParent()}],['Reject','danger',async()=>{await del('pages',p.id);renderParent()}]])));
  const mine=$('mine');mine.innerHTML='';const up=all.filter(p=>p.ok!==false);if(!up.length)mine.innerHTML='<p class="sub">No uploaded pages yet.</p>';
  up.forEach(p=>mine.appendChild(row(p.name,p.url,[['Delete','danger',async()=>{if(confirm('Delete "'+p.name+'" and its colouring?')){await del('pages',p.id);for(const a of art)if(a.pid===p.id)await del('art',a.id);renderParent()}}]])));
  const kl=$('kidList');kl.innerHTML='';profiles.forEach(p=>kl.appendChild(row(p.name+' ('+p.type+')',null,profiles.length>1?[['Remove','danger',async()=>{
    if(!confirm('Remove '+p.name+' and all their art?'))return;for(const a of art)if((a.pf||first)===p.id)await del('art',a.id);
    profiles=profiles.filter(x=>x.id!==p.id);if(pf===p.id)pf=profiles[0].id;saveProfiles();renderParent()}]]:[])));
}
const addProf=type=>{const n=(prompt('Name')||'').trim().slice(0,16);if(!n)return;profiles.push({id:'p'+Date.now(),name:n,type});saveProfiles();renderParent()};
$('addKid').onclick=()=>addProf('kid');$('addAdult').onclick=()=>addProf('adult');
$('addBtn').onclick=()=>{upMode='ok';$('file').click()};
$('file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const name=(prompt('Name this page','My page')||'My page').slice(0,24);
  try{const m=await makeLineArt(f);await put('pages',{id:'u-'+Date.now(),name,url:m.url,w:m.w,h:m.h,fmt:m.fmt,ok:upMode==='ok'});
    alert((m.capped?'This image was reduced to '+MAXD+' px on its longest side for smooth colouring. ':'')+(upMode==='ok'?'Page added to My pages.':'Sent to a parent for approval.'));
    if($('pages').classList.contains('on'))renderPages();if($('parent').classList.contains('on'))renderParent()}
  catch(x){alert('That image could not be opened. Try a JPG or PNG.')}};
$('wipe').onclick=async()=>{if(confirm('Delete all uploaded pages and all colouring? This cannot be undone.')){await clear('pages');await clear('art');LS.removeItem('use');alert('Data deleted.');renderParent()}};
$('bk').onclick=async()=>{const data={v:4,pages:await getAll('pages'),art:await getAll('art'),profiles,region,limit:LS.getItem('limit')};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));a.download='crayon-backup.json';a.click()};
$('rs').onclick=()=>$('rfile').click();
$('rfile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!confirm('Restore from this backup? It replaces everything now on this phone.'))return;
  try{const d=JSON.parse(await f.text());if(!d.pages||!d.art)throw 0;await clear('pages');await clear('art');for(const p of d.pages)await put('pages',p);for(const a of d.art)await put('art',a);
    if(d.profiles&&d.profiles.length)profiles=d.profiles.map(p=>({...p,type:p.type||'kid'}));pf=profiles[0].id;if(d.region){region=d.region;LS.setItem('region',region)}if(d.limit)LS.setItem('limit',d.limit);saveProfiles();alert('Backup restored.');renderParent()}
  catch(x){alert('That file is not a valid backup.')}};

/* screen-time limit (Kids profiles only) */
setInterval(()=>{const lim=+LS.getItem('limit')||0;if(!lim||document.hidden||me().type!=='kid'||$('parent').classList.contains('on')||$('welcome').classList.contains('on'))return;
  const u=J('use',{}),k=pf+'|'+today(),e=u[k]||{s:0,b:0};e.s++;u[k]=e;LS.setItem('use',JSON.stringify(u));
  if(e.s>=(lim+e.b)*60)$('lock').classList.add('on')},1000);
$('lockGo').onclick=()=>{if($('lockPin').value===LS.getItem('pin')){const u=J('use',{}),k=pf+'|'+today(),e=u[k]||{s:0,b:0};e.b+=15;u[k]=e;LS.setItem('use',JSON.stringify(u));
  $('lockPin').value='';$('lockMsg').textContent='';$('lock').classList.remove('on')}else $('lockMsg').textContent='That PIN is not right. Try again.'};

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
dbp=openDB().then(d=>db=d);applySpelling();show(region&&profiles.length?'home':'welcome');
    
