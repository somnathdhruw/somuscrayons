/* app1: state, storage, navigation, ready-made pages */
const $=id=>document.getElementById(id),LS=localStorage,MAXD=2400;
const J=(k,d)=>{try{return JSON.parse(LS.getItem(k))||d}catch(e){return d}};
const COLS=['#E8452C','#FF8A3D','#FFC93C','#8BC34A','#1FA896','#3E8EDE','#6B4EA8','#F4B4C8','#8B5A2B','#2B2A33','#9AA0A6','#FFFFFF','#FFD9B0','#B8E0A0','#9BD4F5','#D9B8F5'];
let db,dbp,W=800,H=800,K=1,cur=null,curDone=false,hadSaved=false,tool='fill',c1='#E8452C',c2='#FFFFFF',slot=1,undoStack=[],barrier=null,ops=[],saveT=null,hue=0,upMode='pending',cat='All',rpStop=false,builtin=null;
const REGIONS=[{id:'us',name:'United States',sp:'us',paper:'letter'},{id:'uk',name:'United Kingdom',sp:'uk',paper:'a4'},{id:'ca',name:'Canada',sp:'uk',paper:'letter'},{id:'au',name:'Australia',sp:'uk',paper:'a4'},{id:'ie',name:'Ireland',sp:'uk',paper:'a4'},{id:'nz',name:'New Zealand',sp:'uk',paper:'a4'},{id:'xx',name:'Other region',sp:'uk',paper:'a4'}];
let region=LS.getItem('region'),profiles=J('profiles',[]).map(p=>({...p,type:p.type||'kid'})),pf=LS.getItem('cur');
if(!profiles.find(p=>p.id===pf)&&profiles.length)pf=profiles[0].id;
const me=()=>profiles.find(p=>p.id===pf)||{id:'',name:'',type:'kid'},saveProfiles=()=>{LS.setItem('profiles',JSON.stringify(profiles));LS.setItem('cur',pf)};
const today=()=>new Date().toISOString().slice(0,10),reg=()=>REGIONS.find(r=>r.id===region)||REGIONS[1],paper=()=>LS.getItem('paper')||reg().paper,CW=()=>reg().sp==='us'?'color':'colour';
function applySpelling(){const us=reg().sp==='us';document.querySelectorAll('[data-cw]').forEach(e=>{e.textContent=e.dataset.cw.replace(/%c/g,us?'Color':'Colour').replace(/%l/g,us?'color':'colour')})}

/* storage */
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open('crayon',1);
  r.onupgradeneeded=()=>{r.result.createObjectStore('pages',{keyPath:'id'});r.result.createObjectStore('art',{keyPath:'id'})};
  r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function tx(s,m,fn){return dbp.then(d=>new Promise((ok,no)=>{const t=d.transaction(s,m),q=fn(t.objectStore(s));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)}))}
const getAll=s=>tx(s,'readonly',o=>o.getAll()),put=(s,v)=>tx(s,'readwrite',o=>o.put(v)),get=(s,k)=>tx(s,'readonly',o=>o.get(k)),del=(s,k)=>tx(s,'readwrite',o=>o.delete(k)),clear=s=>tx(s,'readwrite',o=>o.clear());

/* navigation */
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));window.scrollTo(0,0);
  if(id==='welcome')renderWelcome();if(id==='home')renderHome();if(id==='pages')renderPages();if(id==='gallery')renderGallery();if(id==='parent')resetParent();if(id==='settings')renderSettings()}
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));

function renderWelcome(){const g=$('regionGrid');g.innerHTML='';$('wStep1').style.display=region?'none':'block';$('wStep2').style.display=region?'block':'none';
  if(!region)REGIONS.forEach(r=>{const b=document.createElement('button');b.className='rg';b.textContent=r.name;
    b.onclick=()=>{region=r.id;LS.setItem('region',r.id);LS.removeItem('paper');applySpelling();profiles.length?show('home'):renderWelcome()};g.appendChild(b)})}
async function renderHome(){
  document.body.className=me().type;applySpelling();selTool('fill');
  const k=$('kids');k.innerHTML='';
  profiles.forEach(p=>{const b=document.createElement('button');b.className='chip'+(p.id===pf?' sel':'');b.textContent=p.name;
    b.onclick=()=>{if(p.id===pf)return;if(p.type==='adult'&&me().type==='kid'&&!pinOk())return;pf=p.id;saveProfiles();renderHome()};k.appendChild(b)});
  $('hi').textContent='Hi, '+me().name+'! Pick a page and add some '+CW()+'.';
  const n=(await getAll('art')).filter(a=>(a.pf||profiles[0].id)===pf&&a.done).length;
  $('stars').textContent=n?('You have '+n+(n===1?' star':' stars')):'Your finished art';
}

/* ready-made pages (drawn in code) */
const circ=(x,y,r)=>`M${x+r} ${y}a${r} ${r} 0 1 0 ${-2*r} 0a${r} ${r} 0 1 0 ${2*r} 0z`;
const ell=(x,y,rx,ry)=>`M${x+rx} ${y}a${rx} ${ry} 0 1 0 ${-2*rx} 0a${rx} ${ry} 0 1 0 ${2*rx} 0z`;
const starD=(x,y,R,r)=>{let d='';for(let i=0;i<10;i++){const q=i%2?r:R,a=-Math.PI/2+i*Math.PI/5;d+=(i?'L':'M')+(x+q*Math.cos(a)).toFixed(0)+' '+(y+q*Math.sin(a)).toFixed(0)}return d+'z'};
const ring=(x,y,n,off,r)=>Array.from({length:n},(_,i)=>{const a=i*2*Math.PI/n;return circ(Math.round(x+off*Math.sin(a)),Math.round(y-off*Math.cos(a)),r)});
const rays=(x,y,n,r1,r2)=>Array.from({length:n},(_,i)=>{const a=i*2*Math.PI/n,w=.17,P=(r,t)=>Math.round(x+r*Math.sin(t))+' '+Math.round(y-r*Math.cos(t));return`M${P(r1,a-w)}L${P(r2,a)}L${P(r1,a+w)}z`});
const SAMPLES=[
 {id:'s-cat',name:'Cat',cat:'Animals',d:[circ(400,400,200),'M230 280L210 120L360 220','M570 280L590 120L440 220',circ(340,380,30),circ(460,380,30),'M375 450h50l-25 30z','M400 480Q380 520 340 510','M400 480Q420 520 460 510','M200 430L320 450','M200 490L320 480','M600 430L480 450','M600 490L480 480']},
 {id:'s-fish',name:'Fish',cat:'Animals',d:['M120 400C120 280 300 240 440 250C540 260 600 330 620 400C600 470 540 540 440 550C300 560 120 520 120 400z','M620 400L740 290V510z',circ(294,360,22),'M330 260Q380 170 440 250','M310 330Q350 400 310 470']},
 {id:'s-butterfly',name:'Butterfly',cat:'Animals',d:['M385 250Q400 220 415 250V560Q400 600 385 560z','M385 330C300 150 120 160 130 300C140 400 300 400 385 380z','M415 330C500 150 680 160 670 300C660 400 500 400 415 380z','M385 400C280 400 170 480 220 580C270 650 370 560 385 480z','M415 400C520 400 630 480 580 580C530 650 430 560 415 480z','M390 235Q350 150 310 140','M410 235Q450 150 490 140']},
 {id:'s-car',name:'Car',cat:'Vehicles',d:['M100 500V420Q100 400 130 395L250 380L330 300H520L600 380L690 400Q710 405 710 430V500z','M280 380L340 320H400V380z','M420 320H510L565 380H420z',circ(240,520,55),circ(570,520,55),'M60 590H740']},
 {id:'s-boat',name:'Boat',cat:'Vehicles',d:['M120 520H680L600 640H200z','M400 520V140','M400 160L620 480H400z','M380 220L200 480H380z','M60 690Q110 660 160 690T260 690T360 690T460 690T560 690T660 690T760 690']},
 {id:'s-rocket',name:'Rocket',cat:'Vehicles',d:['M400 100C500 200 520 360 500 520H300C280 360 300 200 400 100z',circ(400,300,45),'M300 440L200 560L300 520z','M500 440L600 560L500 520z','M340 520Q400 700 460 520z',starD(130,170,40,18),starD(660,210,32,14)]},
 {id:'s-flower',name:'Flower',cat:'Nature',d:[circ(400,300,45),...ring(400,300,8,105,50),'M390 420V700','M410 420V700','M410 560Q520 480 560 540Q500 600 410 600z','M390 620Q290 540 240 600Q300 660 390 660z']},
 {id:'s-tree',name:'Tree',cat:'Nature',d:['M360 700V480h80V700z',circ(400,260,140),circ(300,380,110),circ(500,380,110),'M100 700H700']},
 {id:'s-sun',name:'Sun',cat:'Nature',d:[circ(400,400,120),...rays(400,400,12,150,230)]},
 {id:'s-star',name:'Star',cat:'Shapes',d:[starD(400,420,340,150)]},
 {id:'s-heart',name:'Heart',cat:'Shapes',d:['M400 660C150 480 150 250 300 220C360 210 400 250 400 290C400 250 440 210 500 220C650 250 650 480 400 660z',starD(620,160,40,18)]},
 {id:'s-a',name:'Letter A',cat:'Shapes',d:['M240 660L370 160H430L560 660H500L470 540H330L300 660z','M345 460H455L400 270z']},
 {id:'s-house',name:'House',cat:'Shapes',d:['M200 380h400v300H200z','M160 390L400 170L640 390z','M340 500h120v180H340z','M230 430h90v90h-90z','M480 430h90v90h-90z',circ(660,140,50)]}
];
const thumbs={};
function sampleURL(s){if(thumbs[s.id])return thumbs[s.id];const cv=document.createElement('canvas');cv.width=cv.height=800;const c=cv.getContext('2d');
  c.lineWidth=8;c.lineJoin='round';c.lineCap='round';c.strokeStyle='#000';s.d.forEach(d=>c.stroke(new Path2D(d)));return thumbs[s.id]=cv.toDataURL()}

/* your own pages added to the app (pages/index.json) */
async function loadBuiltin(){if(builtin)return builtin;
  try{const r=await fetch('pages/index.json',{cache:'no-cache'}),j=await r.json();
    builtin=(j.pages||[]).map(p=>({id:'b-'+p.file,name:p.name,cat:p.cat||'More',src:p.file,url:p.file,fmt:/\.jpe?g$/i.test(p.file)?'jpeg':'png',ok:true}))}
  catch(e){builtin=[]}return builtin}
async function renderPages(){
  const mine=(await getAll('pages')).filter(p=>p.ok!==false).map(p=>({...p,cat:'Mine'})),bl=await loadBuiltin();
  const all=SAMPLES.map(s=>({id:s.id,name:s.name,cat:s.cat,url:sampleURL(s),w:800,h:800,fmt:'png'})).concat(bl,mine);
  const cats=['All','Animals','Vehicles','Nature','Shapes',...new Set(bl.map(p=>p.cat).filter(c=>!['Animals','Vehicles','Nature','Shapes'].includes(c))),'Mine'];
  const c=$('cats');c.innerHTML='';cats.forEach(n=>{const b=document.createElement('button');b.className='chip'+(n===cat?' sel':'');b.textContent=n;b.onclick=()=>{cat=n;renderPages()};c.appendChild(b)});
  const g=$('pageGrid');g.innerHTML='';
  all.filter(p=>cat==='All'||p.cat===cat).forEach(p=>{const d=document.createElement('div');d.className='card';d.style.cursor='pointer';d.innerHTML='<img alt=""><span></span>';
    d.querySelector('img').src=p.url;d.querySelector('span').textContent=p.name;d.onclick=()=>openPage(p);g.appendChild(d)});
  const a=document.createElement('div');a.className='card add';a.innerHTML='<span style="font-size:36px;line-height:1">+</span><span>Add page</span>';
  a.onclick=()=>{upMode=me().type==='adult'?'ok':'pending';$('file').click()};g.appendChild(a);
}

/* any-size images: turn a picture into a line layer at its own size */
const loadImg=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});
async function maskFromImg(img){
  const iw=img.naturalWidth,ih=img.naturalHeight,k=Math.min(1,MAXD/Math.max(iw,ih)),w=Math.max(1,Math.round(iw*k)),h=Math.max(1,Math.round(ih*k));
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d',{willReadFrequently:true});c.fillStyle='#fff';c.fillRect(0,0,w,h);c.drawImage(img,0,0,w,h);
  const id=c.getImageData(0,0,w,h),d=id.data;
  for(let i=0;i<d.length;i+=4){const lum=d[i]*.3+d[i+1]*.59+d[i+2]*.11;d[i+3]=lum<110?255:lum<190?Math.round((190-lum)/80*255):0;d[i]=d[i+1]=d[i+2]=0}
  c.putImageData(id,0,0);return{url:cv.toDataURL(),w,h,capped:k<1}}
async function makeLineArt(file){const m=await maskFromImg(await loadImg(URL.createObjectURL(file)));m.fmt=file.type==='image/jpeg'?'jpeg':'png';return m}
