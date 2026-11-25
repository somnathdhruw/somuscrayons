/* app2: colouring engine, tools, zoom, saving */
let acts=[],redoStack=[];
const PC=()=>$('paint').getContext('2d',{willReadFrequently:true}),LC=()=>$('lines').getContext('2d',{willReadFrequently:true});
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),hex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join(''),dark=(h,f)=>hex(rgb(h).map(v=>v*(1-f)));
const barOf=(c,w,h)=>{const d=c.getImageData(0,0,w,h).data,b=new Uint8Array(w*h);for(let i=0;i<w*h;i++)b[i]=d[i*4+3]>40?1:0;return b};

async function openPage(p){
  cur=p;curDone=false;hadSaved=false;ops=[];undoStack=[];acts=[];redoStack=[];$('cTitle').textContent=p.name;show('colour');
  let img=await loadImg(p.url);
  if(p.src){if(!p.maskUrl){const m=await maskFromImg(img);p.maskUrl=m.url}img=await loadImg(p.maskUrl)}
  W=img.naturalWidth;H=img.naturalHeight;K=Math.max(W,H)/800;
  $('paint').width=$('lines').width=W;$('paint').height=$('lines').height=H;layoutStage();setZ(1,0,0);
  const pc=PC(),l=LC();pc.fillStyle='#fff';pc.fillRect(0,0,W,H);l.clearRect(0,0,W,H);l.drawImage(img,0,0);barrier=barOf(l,W,H);
  let saved=await get('art',pf+'|'+p.id);if(!saved&&pf===(profiles[0]||{}).id)saved=await get('art',p.id);
  if(saved&&saved.w===W&&saved.h===H){hadSaved=true;curDone=!!saved.done;ops=saved.ops||[];acts=saved.acts||[];pc.drawImage(await loadImg(saved.colour),0,0)}
}
function layoutStage(){const w0=Math.min($('colour').clientWidth-32,640),hm=innerHeight*.6;let w=w0,h=w*H/W;if(h>hm){h=hm;w=h*W/H}$('stage').style.width=w+'px';$('stage').style.height=h+'px'}
addEventListener('resize',()=>{if($('colour').classList.contains('on')){layoutStage();setZ(Z.s,Z.x,Z.y)}});

/* painting: fill, gradient, patterns */
function fill(c,bar,w,h,o){
  const[,x,y,col,mode,col2]=o;if(x<0||y<0||x>=w||y>=h||bar[y*w+x])return false;
  const id=c.getImageData(0,0,w,h),d=id.data,seen=new Uint8Array(w*h),q=new Int32Array(w*h);let hd=0,tl=0,x0=x,x1=x,y0=y,y1=y;q[tl++]=y*w+x;seen[y*w+x]=1;
  while(hd<tl){const p=q[hd++],px=p%w,py=(p-px)/w;if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py;
    if(px>0&&!seen[p-1]&&!bar[p-1]){seen[p-1]=1;q[tl++]=p-1}
    if(px<w-1&&!seen[p+1]&&!bar[p+1]){seen[p+1]=1;q[tl++]=p+1}
    if(py>0&&!seen[p-w]&&!bar[p-w]){seen[p-w]=1;q[tl++]=p-w}
    if(py<h-1&&!seen[p+w]&&!bar[p+w]){seen[p+w]=1;q[tl++]=p+w}}
  const A=rgb(col),B=rgb(col2||'#FFFFFF'),sz=Math.max(6,Math.round(24*Math.max(w,h)/800)),span=Math.max(1,(x1-x0)+(y1-y0));
  for(let i=0;i<tl;i++){const p=q[i],px=p%w,py=(p-px)/w;let t=0;
    if(mode==='grad')t=((px-x0)+(py-y0))/span;
    else if(mode==='stripes')t=Math.floor((px+py)/sz)%2;
    else if(mode==='checks')t=(Math.floor(px/sz)+Math.floor(py/sz))%2;
    else if(mode==='dots'){const dx=px%(sz*2)-sz,dy=py%(sz*2)-sz;t=dx*dx+dy*dy<sz*sz*.36?1:0}
    const o4=p*4;d[o4]=A[0]+(B[0]-A[0])*t;d[o4+1]=A[1]+(B[1]-A[1])*t;d[o4+2]=A[2]+(B[2]-A[2])*t;d[o4+3]=255}
  c.putImageData(id,0,0);return true}
function stamp(c,o){const[,kind,col,sz,x,y]=o;c.fillStyle=col;
  if(kind==='star')c.fill(new Path2D(starD(x,y,sz*1.6,sz*.7)));
  else{c.save();c.translate(x,y);c.scale(sz/36,sz/36);c.fill(new Path2D('M0 40C-60 -5 -45 -50 -15 -45C-5 -43 0 -35 0 -28C0 -35 5 -43 15 -45C45 -50 60 -5 0 40z'));c.restore()}}
/* shadow brush: soft, builds up darker, uses a darker tone of the chosen colour */
function shade(c,col,sz,str,x0,y0,x1,y1){const r=sz*1.1,[R,G,B]=rgb(dark(col,.4)),n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/(r*.25))),a=.05+.18*str/100;
  for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n,g=c.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(${R},${G},${B},${a})`);g.addColorStop(1,`rgba(${R},${G},${B},0)`);c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,7);c.fill()}}
/* one drawing step; used live and when replaying a timelapse */
function apply(o,c,bar,w,h){
  if(o[0]==='f')return fill(c,bar,w,h,o);
  if(o[0]==='m'){stamp(c,o);return}
  const[,t,col,sz,x0,y0,x1,y1,hh,str]=o;c.lineCap=c.lineJoin='round';
  if(t==='shadow'){shade(c,col,sz,str,x0,y0,x1,y1);return}
  c.strokeStyle=t==='erase'?'#fff':t==='rainbow'?'hsl('+hh+',90%,55%)':col;
  if(t==='crayon'){c.globalAlpha=.45;c.lineWidth=sz;for(let i=0;i<3;i++){const j=()=>(Math.random()-.5)*sz*.35;c.beginPath();c.moveTo(x0+j(),y0+j());c.lineTo(x1+j(),y1+j());c.stroke()}c.globalAlpha=1;return}
  if(t==='glitter'){for(let i=0;i<7;i++){c.fillStyle=i%2?col:'#FFE680';const a=Math.random()*6.3,r=Math.random()*sz;c.beginPath();c.arc(x1+r*Math.cos(a),y1+r*Math.sin(a),(1+Math.random()*3)*K,0,7);c.fill()}return}
  if(t==='marker'){c.globalAlpha=.55;c.lineCap='square'}
  c.lineWidth=t==='pencil'?Math.max(2,sz/4):sz;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();c.globalAlpha=1}
function rec(o){const ok=apply(o,PC(),barrier,W,H);if(ok!==false&&ops.length<20000)ops.push(o);return ok!==false}
function snap(){const lim=Math.max(3,Math.min(30,Math.floor(9e7/(W*H*4))));undoStack.push({img:PC().getImageData(0,0,W,H),n:ops.length});if(undoStack.length>lim)undoStack.shift();acts.push(ops.length);redoStack=[]}

/* touch: one finger paints, two fingers zoom and move */
const stage=$('stage'),zm=$('zoomer'),ptrs=new Map(),FILLS={fill:'solid',grad:'grad',stripes:'stripes',dots:'dots',checks:'checks'};
let Z={s:1,x:0,y:0},g0=null,drawing=false,last=null;
function setZ(s,x,y){const w=stage.clientWidth,h=stage.clientHeight;Z.s=Math.min(4,Math.max(1,s));Z.x=Math.min(0,Math.max(w*(1-Z.s),x));Z.y=Math.min(0,Math.max(h*(1-Z.s),y));zm.style.transform='translate('+Z.x+'px,'+Z.y+'px) scale('+Z.s+')'}
function zoomBy(f){const w=stage.clientWidth,h=stage.clientHeight,ns=Math.min(4,Math.max(1,Z.s*f));setZ(ns,w/2-(w/2-Z.x)/Z.s*ns,h/2-(h/2-Z.y)/Z.s*ns)}
const midp=()=>{const[a,b]=[...ptrs.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)||1}};
const pt=e=>{const r=zm.getBoundingClientRect();return[Math.floor((e.clientX-r.left)/r.width*W),Math.floor((e.clientY-r.top)/r.height*H)]};
function cancelStroke(){drawing=false;const s=undoStack.pop();if(s){PC().putImageData(s.img,0,0);ops.length=s.n;acts.pop()}}
stage.addEventListener('pointerdown',e=>{e.preventDefault();ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){if(drawing)cancelStroke();const m=midp();g0={mx:m.x,my:m.y,d:m.d,s:Z.s,zx:Z.x,zy:Z.y};return}
  if(ptrs.size>2)return;
  const[x,y]=pt(e),sz=+$('size').value*K,str=+$('str').value;
  if(FILLS[tool]){snap();if(rec(['f',x,y,c1,FILLS[tool],c2]))queueSave();else{undoStack.pop();acts.pop()}return}
  if(tool==='star'||tool==='heart'){snap();rec(['m',tool,c1,sz,x,y]);queueSave();return}
  snap();drawing=true;last=[x,y];rec(['s',tool,c1,sz,x,y,x,y,hue,str]);stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2&&g0){const m=midp(),r=stage.getBoundingClientRect(),ns=Math.min(4,Math.max(1,g0.s*m.d/g0.d)),cx=(g0.mx-r.left-g0.zx)/g0.s,cy=(g0.my-r.top-g0.zy)/g0.s;setZ(ns,m.x-r.left-cx*ns,m.y-r.top-cy*ns);return}
  if(!drawing)return;const[x,y]=pt(e);hue=(hue+4)%360;rec(['s',tool,c1,+$('size').value*K,last[0],last[1],x,y,hue,+$('str').value]);last=[x,y]});
['pointerup','pointercancel'].forEach(t=>stage.addEventListener(t,e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)g0=null;if(drawing&&!ptrs.size){drawing=false;queueSave()}}));

/* tools and colours */
function selTool(t){tool=t;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('sel',x.dataset.tool===t));$('sRow').style.display=t==='shadow'?'flex':'none'}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>selTool(b.dataset.tool));
function stashRedo(n){redoStack.push({img:PC().getImageData(0,0,W,H),removed:ops.slice(n)});if(redoStack.length>8)redoStack.shift()}
function rebuild(){const c=PC();c.fillStyle='#fff';c.fillRect(0,0,W,H);for(const o of ops)apply(o,c,barrier,W,H)}
$('undo').onclick=()=>{const s=undoStack.pop();
  if(s){stashRedo(s.n);PC().putImageData(s.img,0,0);ops.length=s.n;acts.pop();queueSave();return}
  if(acts.length){const n=acts.pop();stashRedo(n);ops.length=n;rebuild();queueSave()}};
$('redo').onclick=()=>{const r=redoStack.pop();if(!r)return;undoStack.push({img:PC().getImageData(0,0,W,H),n:ops.length});acts.push(ops.length);PC().putImageData(r.img,0,0);for(const o of r.removed)ops.push(o);queueSave()};
$('zin').onclick=()=>zoomBy(1.5);$('zout').onclick=()=>zoomBy(1/1.5);
function syncCol(){document.querySelectorAll('.sw[data-c]').forEach(b=>b.classList.toggle('sel',b.dataset.c.toLowerCase()===c1.toLowerCase()));$('cur1').style.background=c1;$('cur2').style.background=c2;$('pick').value=c1;$('hex').value=slot===2?c2:c1;
  $('cur1').style.boxShadow=slot===1?'0 0 0 3px var(--ink)':'0 0 0 2px var(--line)';$('cur2').style.boxShadow=slot===2?'0 0 0 3px var(--ink)':'0 0 0 2px var(--line)'}
function setColor(h){if(slot===2&&me().type==='adult')c2=h;else c1=h;if(tool==='erase')selTool('brush');syncCol()}
function mkSw(c,box){const b=document.createElement('button');b.className='sw';b.dataset.c=c;b.style.background=c;b.setAttribute('aria-label','Colour '+c);b.onclick=()=>setColor(c);box.appendChild(b)}
COLS.forEach(c=>mkSw(c,$('pal')));
function renderSaved(){const b=$('saved');b.innerHTML='';J('saved',[]).forEach(c=>mkSw(c,b))}
$('slot').onclick=()=>{slot=slot===1?2:1;$('slot').dataset.cw='Editing: %l '+slot;applySpelling();syncCol()};
$('cur1').onclick=()=>{slot=1;$('slot').dataset.cw='Editing: %l 1';applySpelling();syncCol()};$('cur2').onclick=()=>{slot=2;$('slot').dataset.cw='Editing: %l 2';applySpelling();syncCol()};
$('pick').oninput=e=>setColor(e.target.value);
$('hex').onchange=e=>{let v=e.target.value.trim();if(v[0]!=='#')v='#'+v;if(/^#[0-9a-f]{6}$/i.test(v))setColor(v.toLowerCase());else syncCol()};
$('saveCol').onclick=()=>{const l=J('saved',[]),c=slot===2?c2:c1;if(!l.includes(c))l.unshift(c);LS.setItem('saved',JSON.stringify(l.slice(0,16)));renderSaved()};
syncCol();renderSaved();

/* saving, finishing */
function queueSave(){clearTimeout(saveT);saveT=setTimeout(()=>saveArt().catch(()=>{}),W*H>2e6?2500:700)}
function composite(){const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');c.drawImage($('paint'),0,0);c.drawImage($('lines'),0,0);return cv}
async function saveArt(done){if(!cur)return;if(done)curDone=true;if(!ops.length&&!hadSaved&&!curDone)return;hadSaved=true;
  const cv=composite(),fmt=cur.fmt==='jpeg'?'jpeg':'png',k=Math.min(1,400/Math.max(W,H)),t=document.createElement('canvas');t.width=Math.round(W*k)||1;t.height=Math.round(H*k)||1;t.getContext('2d').drawImage(cv,0,0,t.width,t.height);
  await put('art',{id:pf+'|'+cur.id,pf,pid:cur.id,name:cur.name,fmt,w:W,h:H,colour:$('paint').toDataURL(),final:cv.toDataURL('image/'+fmt,.92),thumb:t.toDataURL('image/jpeg',.8),ops,acts,done:curDone,t:Date.now()})}
const fail=e=>alert('Could not save: '+(e&&e.message||e));
$('cSave').onclick=async()=>{try{await saveArt();show('gallery')}catch(e){fail(e)}};
$('cBack').onclick=async()=>{try{await saveArt()}catch(e){fail(e)}show('pages')};
$('cDone').onclick=async()=>{try{await saveArt(true);confetti();$('cTitle').textContent='Well done, '+me().name+'!';setTimeout(()=>show('gallery'),2300)}catch(e){fail(e)}};
function confetti(){const c=$('fx'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
  const P=Array.from({length:140},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.5,vx:(Math.random()-.5)*3,vy:2+Math.random()*4,s:5+Math.random()*7,c:COLS[Math.floor(Math.random()*11)]}));let f=0;
  (function t(){x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;x.fillStyle=p.c;x.fillRect(p.x,p.y,p.s,p.s*.6)});if(++f<130)requestAnimationFrame(t);else x.clearRect(0,0,c.width,c.height)})()}
    
