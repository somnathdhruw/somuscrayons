/* app3: gallery, download, print, share, timelapse */
function pinOk(){const p=LS.getItem('pin');
  if(!p){const n=prompt('Create a 4-digit parent PIN');if(/^\d{4}$/.test(n||'')){LS.setItem('pin',n);alert('PIN saved. Remember it.');return true}alert('The PIN must be 4 digits.');return false}
  const v=prompt('Parent PIN');if(v===null)return false;if(v===p)return true;alert('That PIN is not right.');return false}
const ext=x=>x.fmt==='jpeg'?'jpg':'png';
async function shareArt(x){const b=await (await fetch(x.final)).blob(),f=new File([b],x.name+'.'+ext(x),{type:b.type});
  if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:x.name}).catch(()=>{});else alert('Sharing is not available on this device. Use Save instead.')}
function printArt(x){const w=window.open('');if(!w){alert('Allow pop-ups to print.');return}
  w.document.write('<style>@page{size:'+(paper()==='letter'?'letter':'A4')+';margin:10mm}html,body{margin:0}img{display:block;margin:auto;max-width:100%;max-height:96vh;object-fit:contain}</style><img src="'+x.final+'" onload="window.print()">');w.document.close()}
async function renderGallery(){
  const a=(await getAll('art')).filter(x=>(x.pf||profiles[0].id)===pf).sort((x,y)=>y.t-x.t),g=$('galGrid');g.innerHTML='';
  if(!a.length){g.innerHTML='<div class="empty">No art yet. Colour a page and press Save, and it will show up here.</div>';return}
  a.forEach(x=>{const d=document.createElement('div');d.className='card';
    d.innerHTML='<img alt=""><span></span><div class="mini"><button data-a="d">Save</button><button data-a="p">Print</button><button data-a="s">Share</button><button data-a="r">Replay</button></div>';
    d.querySelector('img').src=x.thumb||x.final;d.querySelector('span').textContent=(x.done?'★ ':'')+x.name+(x.w?' ('+x.w+'x'+x.h+')':'');
    d.querySelector('[data-a=d]').onclick=()=>{const l=document.createElement('a');l.href=x.final;l.download=x.name+'.'+ext(x);l.click()};
    d.querySelector('[data-a=p]').onclick=()=>{if(me().type==='adult'||pinOk())printArt(x)};
    d.querySelector('[data-a=s]').onclick=()=>{if(me().type==='adult'||pinOk())shareArt(x)};
    d.querySelector('[data-a=r]').onclick=()=>replay(x);g.appendChild(d)});
}
async function findPage(id){const s=SAMPLES.find(z=>z.id===id);if(s)return{url:sampleURL(s)};const b=(await loadBuiltin()).find(p=>p.id===id);if(b)return b;return get('pages',id)}
async function replay(a){
  if(!a.ops||!a.ops.length){alert('No timelapse for this one. Colour a page again to record one.');return}
  const p=await findPage(a.pid);if(!p){alert('The original page was deleted.');return}
  let img=await loadImg(p.url);if(p.src){const m=p.maskUrl?{url:p.maskUrl}:await maskFromImg(img);p.maskUrl=m.url;img=await loadImg(m.url)}
  const w=img.naturalWidth,h=img.naturalHeight,lc=document.createElement('canvas'),pc=document.createElement('canvas');lc.width=pc.width=w;lc.height=pc.height=h;
  const lx=lc.getContext('2d',{willReadFrequently:true}),px=pc.getContext('2d',{willReadFrequently:true});px.fillStyle='#fff';px.fillRect(0,0,w,h);lx.drawImage(img,0,0);
  const bar=barOf(lx,w,h),out=$('rpc'),k=Math.min(1,800/Math.max(w,h)),rw=Math.round(w*k),rh=Math.round(h*k);out.width=rw;out.height=rh;const ox=out.getContext('2d');
  rpStop=false;$('rpSave').style.display='none';$('rp').classList.add('on');K=Math.max(w,h)/800;
  let mr=null,chunks=[];try{mr=new MediaRecorder(out.captureStream(30));mr.ondataavailable=e=>e.data.size&&chunks.push(e.data);mr.start()}catch(e){mr=null}
  const per=Math.max(1,Math.ceil(a.ops.length/180));let i=0;
  (function f(){if(rpStop){if(mr&&mr.state!=='inactive')mr.stop();return}
    for(let n=0;n<per&&i<a.ops.length;n++)apply(a.ops[i++],px,bar,w,h);ox.drawImage(pc,0,0,rw,rh);ox.drawImage(lc,0,0,rw,rh);
    if(i<a.ops.length){requestAnimationFrame(f);return}
    if(mr){mr.onstop=()=>{$('rpSave').href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));$('rpSave').style.display='inline'};setTimeout(()=>{if(mr.state!=='inactive')mr.stop()},300)}})();
}
$('rpClose').onclick=()=>{rpStop=true;$('rp').classList.remove('on')};
  
