/* TEREA Dark Red — prototypy hier vo finálnej vizuálnej podobe.
   Bez závislostí, bez buildu. Otvor index.html priamo v prehliadači. */

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

/* ═══════════ farebná matematika ═══════════ */
const srgb=v=>v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055;
const lin =v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);
function oklchToRgb({l,c,h}){
  const a=c*Math.cos(h), b=c*Math.sin(h);
  const l_=l+0.3963377774*a+0.2158037573*b, m_=l-0.1055613458*a-0.0638541728*b,
        s_=l-0.0894841775*a-1.2914855480*b;
  const L=l_**3,M=m_**3,S=s_**3;
  const cl=x=>Math.max(0,Math.min(255,Math.round(srgb(x)*255)));
  return [cl(4.0767416621*L-3.3077115913*M+0.2309699292*S),
          cl(-1.2684380046*L+2.6097574011*M-0.3413193965*S),
          cl(-0.0041960863*L-0.7034186147*M+1.7076147010*S)];
}
function rgbToOklch([r,g,b]){
  const R=lin(r/255),G=lin(g/255),B=lin(b/255);
  const l=Math.cbrt(0.4122214708*R+0.5363325363*G+0.0514459929*B),
        m=Math.cbrt(0.2119034982*R+0.6806995451*G+0.1073969566*B),
        s=Math.cbrt(0.0883024619*R+0.2817188376*G+0.6299787005*B);
  const L=0.2104542553*l+0.7936177850*m-0.0040720468*s,
        A=1.9779984951*l-2.4285922050*m+0.4505937099*s,
        Bb=0.0259040371*l+0.7827717662*m-0.8086757660*s;
  return {l:L,c:Math.hypot(A,Bb),h:Math.atan2(Bb,A)};
}
function rgbToLab([r,g,b]){
  const R=lin(r/255),G=lin(g/255),B=lin(b/255);
  const X=(0.4124564*R+0.3575761*G+0.1804375*B)/0.95047,
        Y=(0.2126729*R+0.7151522*G+0.0721750*B),
        Z=(0.0193339*R+0.1191920*G+0.9503041*B)/1.08883;
  const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;
  const fx=f(X),fy=f(Y),fz=f(Z);
  return [116*fy-16,500*(fx-fy),200*(fy-fz)];
}
function dE2000(c1,c2){
  const [L1,a1,b1]=rgbToLab(c1),[L2,a2,b2]=rgbToLab(c2);
  const r2d=180/Math.PI,d2r=Math.PI/180;
  const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cb=(C1+C2)/2;
  const G=0.5*(1-Math.sqrt(Cb**7/(Cb**7+25**7)));
  const A1=(1+G)*a1,A2=(1+G)*a2;
  const P1=Math.hypot(A1,b1),P2=Math.hypot(A2,b2);
  let h1=Math.atan2(b1,A1)*r2d; if(h1<0)h1+=360;
  let h2=Math.atan2(b2,A2)*r2d; if(h2<0)h2+=360;
  const dL=L2-L1,dC=P2-P1; const cp=P1*P2;
  let dh=0; if(cp!==0){ dh=h2-h1; if(dh>180)dh-=360; else if(dh<-180)dh+=360; }
  const dH=2*Math.sqrt(cp)*Math.sin(dh*d2r/2);
  const Lb=(L1+L2)/2,Pb=(P1+P2)/2;
  let hb; if(cp===0) hb=h1+h2; else { hb=(h1+h2)/2; if(Math.abs(h1-h2)>180) hb+=(h1+h2<360?180:-180); }
  const T=1-0.17*Math.cos((hb-30)*d2r)+0.24*Math.cos(2*hb*d2r)
          +0.32*Math.cos((3*hb+6)*d2r)-0.20*Math.cos((4*hb-63)*d2r);
  const Sl=1+(0.015*(Lb-50)**2)/Math.sqrt(20+(Lb-50)**2);
  const Sc=1+0.045*Pb, Sh=1+0.015*Pb*T;
  const Rt=-Math.sin(2*(30*Math.exp(-(((hb-275)/25)**2)))*d2r)*2*Math.sqrt(Pb**7/(Pb**7+25**7));
  return Math.sqrt((dL/Sl)**2+(dC/Sc)**2+(dH/Sh)**2+Rt*(dC/Sc)*(dH/Sh));
}
const css=c=>`rgb(${c[0]},${c[1]},${c[2]})`;

/* zaoblený trojuholník — obrys loga IQOS */
function iqosPath(cx,cy,R,k=0.52){
  const A=[-90,30,150].map(d=>d*Math.PI/180);
  const P=A.map(a=>[cx+R*Math.cos(a), cy+R*Math.sin(a)]);
  const T=A.map(a=>[-Math.sin(a), Math.cos(a)]);
  let d=`M ${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for(let i=0;i<3;i++){ const j=(i+1)%3, K=R*k;
    d+=` C ${(P[i][0]+T[i][0]*K).toFixed(1)} ${(P[i][1]+T[i][1]*K).toFixed(1)},`
      +` ${(P[j][0]-T[j][0]*K).toFixed(1)} ${(P[j][1]-T[j][1]*K).toFixed(1)},`
      +` ${P[j][0].toFixed(1)} ${P[j][1].toFixed(1)}`; }
  return d+' Z';
}

/* ═══════════ navigácia ═══════════ */
let current='s-menu';
function go(id){
  $$('.scr').forEach(e=>e.classList.toggle('on',e.id===id));
  current=id;
  ({'s-spot':startSpot,'s-push':startPush,'s-mem':startMem,
    's-draw':()=>{startDraw();drawFrame();},'s-rel':startRel,'s-lat':startLat}[id]||(()=>{}))();
}
/* ── vstupné udalosti ──
   Obsluhy sú samostatné funkcie, aby sa dali volať aj z dotykových udalostí.
   Pointer Events pribudli až v Safari 13 — na starších iPadoch ich niet. */
function onDown(e){
  const t=e.target&&e.target.closest?e.target.closest('[data-go]'):null;
  if(t){ go(t.dataset.go); return; }
  const inEl=sel=>e.target&&e.target.closest&&e.target.closest(sel);
  if(current==='s-draw'&&inEl('#trcv')) drawDown(e);
  if(current==='s-rel' &&inEl('#tcv'))  relDown(e);
  if(current==='s-push'&&!inEl('.back')) pushDown(e);
  if(current==='s-spot'&&inEl('.card')) e.target.closest('.card').__pick&&e.target.closest('.card').__pick();
  if(current==='s-mem' &&inEl('.pad'))  inEl('.pad').__tap&&inEl('.pad').__tap();
}
function onMove(e){
  if(current==='s-draw') drawMove(e);
  if(current==='s-rel')  relMove(e);
}
function onUp(e){
  if(current==='s-draw') drawUp();
  if(current==='s-rel')  relUp();
  if(current==='s-push') pushUp(e);
}
if(window.PointerEvent){
  document.addEventListener('pointerdown',onDown);
  document.addEventListener('pointermove',onMove);
  document.addEventListener('pointerup',onUp);
} else {
  const P=(t,ts)=>({clientX:t.clientX, clientY:t.clientY, timeStamp:ts,
                    target:document.elementFromPoint(t.clientX,t.clientY)});
  document.addEventListener('touchstart',e=>{
    e.preventDefault(); onDown(P(e.changedTouches[0],e.timeStamp)); },{passive:false});
  document.addEventListener('touchmove',e=>{
    e.preventDefault(); onMove(P(e.changedTouches[0],e.timeStamp)); },{passive:false});
  document.addEventListener('touchend',e=>{
    e.preventDefault(); onUp(P(e.changedTouches[0],e.timeStamp)); },{passive:false});
}

/* ═══════════ NÁSTROJ — latencia a fps ═══════════ */
function startLat(){
  const box=$('#hitbox'), out=$('#lat');
  let delays=[],frames=[],last=0,n=0;
  out.textContent=''; box.textContent='ŤUKAJ SEM';
  const tick=t=>{ if(last)frames.push(t-last); last=t;
    if(current==='s-lat') requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  box.onpointerdown=e=>{
    delays.push(performance.now()-e.timeStamp);
    n++; box.textContent=`${n} / 12`;
    if(n>=12){
      const avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
      const d=avg(delays.slice(2)), f=avg(frames.slice(-60)), est=d+f*1.5;
      out.innerHTML=
`spracovanie vstupu   ${d.toFixed(1)} ms
priemerný snímok     ${f.toFixed(1)} ms   (${(1000/f).toFixed(0)} fps)
odhad vstup → pixel  ${est.toFixed(0)} ms

najužší pás v hre 2  ${Math.max(3,est/1100*100*1.6).toFixed(1)} %`;
      box.textContent='HOTOVO'; box.onpointerdown=null;
    }
  };
}

/* ═══════════ 1 · SPOT THE INTENSITY ═══════════ */
const TARGET=[142,27,34];
const RR=[{de:[7,10]},{de:[4.5,6.5]},{de:[2.5,4]}];
let rSpot=0, spotTimer=null;

function decoys(n,min,max){
  const b=rgbToOklch(TARGET), out=[];
  const k=max/5, sep=Math.max(1.5,min*0.45);
  let g=0;
  while(out.length<n&&g++<20000){
    const c={l:b.l+(Math.random()-.5)*.075*k, c:b.c+(Math.random()-.5)*.075*k,
             h:b.h+(Math.random()-.5)*.30*k};
    const rgb=oklchToRgb(c), d=dE2000(TARGET,rgb);
    if(d<min||d>max) continue;
    if(out.some(o=>dE2000(o,rgb)<sep)) continue;
    out.push(rgb);
  } return out;
}
/* balenie ako SVG — prstence z obrysu loga, wordmark, pás varovania */
function packSVG(rgb){
  const o=rgbToOklch(rgb);
  const dk=css(oklchToRgb({l:Math.max(0,o.l-0.13),c:o.c*0.9,h:o.h}));
  const md=css(oklchToRgb({l:Math.max(0,o.l-0.05),c:o.c,h:o.h}));
  const lt=css(oklchToRgb({l:Math.min(1,o.l+0.05),c:o.c,h:o.h}));
  let rings='';
  for(let i=5;i>=1;i--)
    rings+=`<path d="${iqosPath(42,74,16+i*17)}" fill="none" stroke="${i%2?md:lt}" stroke-width="7" opacity="${0.30+i*0.07}"/>`;
  return `<svg viewBox="0 0 320 220" preserveAspectRatio="none">
   <defs><clipPath id="c"><rect width="320" height="220"/></clipPath></defs>
   <rect width="320" height="220" fill="${css(rgb)}"/>
   <g clip-path="url(#c)"><rect width="320" height="220" fill="${dk}" opacity=".25"/>${rings}</g>
   <circle cx="150" cy="72" r="11" fill="none" stroke="#FFB627" stroke-width="2.5"/>
   <text x="170" y="82" font-family="Helvetica Neue,Arial" font-size="31"
     letter-spacing="2.5" fill="#F7EEEE">TEREA</text>
   <text x="236" y="104" font-family="Helvetica Neue,Arial" font-size="11"
     letter-spacing="2.6" fill="#FFB627">DARK RED</text>
   <text x="248" y="122" font-family="Helvetica Neue,Arial" font-size="9"
     letter-spacing="1.6" fill="#E2C9A4">for IQOS</text>
   <rect y="168" width="320" height="52" fill="#C9C6C7"/>
   <text x="160" y="199" text-anchor="middle" font-family="Helvetica Neue,Arial"
     font-size="15" letter-spacing="1.4" fill="#1a1a1a">HEALTH WARNING</text>
  </svg>`;
}
function startSpot(){ rSpot=0; roundSpot(); }
function roundSpot(){
  clearTimeout(spotTimer);
  const memo=$('#memo'), grid=$('#grid'), bar=$('#tbar i');
  $('#st-spot').textContent=`KOLO ${rSpot+1} / 3`;
  memo.style.display='block'; memo.innerHTML=packSVG(TARGET);
  grid.style.display='none'; grid.innerHTML='';
  bar.style.transition='none'; bar.style.width='100%';
  $('#m-spot').textContent='Zapamätaj si ju.';
  spotTimer=setTimeout(()=>{
    if(current!=='s-spot')return;
    memo.style.display='none';
    const [min,max]=RR[rSpot].de;
    const set=[{rgb:TARGET,ok:true},...decoys(5,min,max).map(r=>({rgb:r,ok:false}))]
      .sort(()=>Math.random()-.5);
    set.forEach(c=>{
      const d=document.createElement('div');
      d.className='card'; d.innerHTML=packSVG(c.rgb);
      d.__pick=()=>pickSpot(c.ok,set);
      grid.appendChild(d);
    });
    grid.style.display='grid';
    $('#m-spot').textContent='Ktorá je pravá?';
    bar.offsetWidth; bar.style.transition='width 8s linear'; bar.style.width='0%';
    spotTimer=setTimeout(()=>{ if(current==='s-spot') pickSpot(false,set); },8000);
  },3000);
}
function pickSpot(ok,set){
  clearTimeout(spotTimer);
  $('#tbar i').style.transition='none';
  $$('#grid .card').forEach((c,i)=>{
    c.__pick=null;
    if(set[i].ok) c.classList.add('win'); else c.classList.add('dim');
  });
  $('#m-spot').innerHTML = ok ? '<span class="amber">MÁŠ OKO</span>'
                              : '<span class="scarlet">TESNE VEDĽA</span>';
  spotTimer=setTimeout(()=>{ if(current!=='s-spot')return;
    if(ok&&rSpot<2) rSpot++; else rSpot=0; roundSpot(); },2000);
}

/* ═══════════ 2 · PUSH THE INTENSITY ═══════════ */
const PB=[[106,114],[107.5,112.5],[108.5,111.5]];
const RAMP=800, SLOW=2600, MAXV=125;
const TEAL='linear-gradient(180deg,#3ECDD3,#00A8AC)';
const FIRE='linear-gradient(180deg,#FF8A1C,#D8232A)';
let rPush=0, holdT0=null, rafPush=null;
const valueAt=t=>t<RAMP?100*(t/RAMP):Math.min(MAXV,100+(t-RAMP)/SLOW*25);
const mapPct =v=>v<=100?v*0.5:50+(v-100)/25*50;

function startPush(){ rPush=0; paintPush(); resetPush(); }
function paintPush(){
  const sc=$('#sc'); sc.innerHTML='';
  [0,50,100,105,110,115,120,125].forEach(v=>{
    const s=document.createElement('span');
    s.textContent=v; s.style.bottom=mapPct(v)+'%';
    if(v===110) s.className='hi'; sc.appendChild(s);
  });
  const [lo,hi]=PB[rPush];
  $('#band').style.bottom=mapPct(lo)+'%';
  $('#band').style.height=(mapPct(hi)-mapPct(lo))+'%';
  $('#burn').style.height=(100-mapPct(120))+'%';
  $('#ceil').style.bottom=mapPct(100)+'%';
  $('#bandLbl').style.bottom=mapPct(110)+'%';
  $('#burnLbl').style.bottom=mapPct(122)+'%';
}
function tint(v){ $('#fill').style.background = v<100?TEAL:FIRE;
  $('#track').style.borderColor = v<100?'#1C4D52':'#3A1620'; }
function resetPush(){
  holdT0=null; cancelAnimationFrame(rafPush);
  $('#fill').style.height='0%'; tint(0);
  $('#val').innerHTML='0<small>%</small>';
  $('#m-push').textContent='Prilož prst a drž. Pusť na 110.';
}
function pushDown(e){ if(holdT0!==null)return; holdT0=e.timeStamp; loopPush(); }
function loopPush(){
  rafPush=requestAnimationFrame(ts=>{
    if(holdT0===null)return;
    const v=valueAt(ts-holdT0);
    tint(v); $('#fill').style.height=mapPct(v)+'%';
    $('#val').innerHTML=v.toFixed(1).replace('.',',')+'<small>%</small>';
    if(v<MAXV) loopPush(); else endPush(ts-holdT0);
  });
}
function pushUp(e){ if(holdT0===null)return; endPush(e.timeStamp-holdT0); }
function endPush(el){
  cancelAnimationFrame(rafPush); holdT0=null;
  const v=valueAt(el), [lo,hi]=PB[rPush];       // hodnota z timeStampu, nie zo stavu
  tint(v); $('#fill').style.height=mapPct(v)+'%';
  $('#val').innerHTML=v.toFixed(1).replace('.',',')+'<small>%</small>';
  if(v>120) $('#m-push').innerHTML='<span class="scarlet">SPÁLIL SI TO</span>';
  else if(v>=lo&&v<=hi){
    $('#m-push').innerHTML='<span class="amber">PRETLAK</span>';
    if(rPush<2){ rPush++; setTimeout(()=>{if(current==='s-push'){paintPush();resetPush();}},1200); return; }
  } else {
    const d=(v<lo?lo-v:v-hi).toFixed(1).replace('.',',');
    $('#m-push').innerHTML=`TESNE VEDĽA — chýbalo ${d} %`;
  }
  setTimeout(()=>{ if(current==='s-push'&&holdT0===null) resetPush(); },1900);
}

/* ═══════════ 3 · MEMORIZE INTENSITY ═══════════ */
const MR=[{n:4,on:450,off:250},{n:5,on:400,off:220},{n:6,on:350,off:200}];
let rMem=0, seq=[], step=0, canTap=false;
const LEAF='M 0 0 C 46 -40 46 -126 0 -176 C -46 -126 -46 -40 0 0 Z';
function startMem(){
  const pads=$('#pads');
  pads.querySelectorAll('.pad').forEach(e=>e.remove());
  [-54,-18,18,54].forEach((rot,i)=>{
    const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('class','pad'); s.setAttribute('viewBox','-60 -180 120 180');
    s.setAttribute('width','196'); s.setAttribute('height','294');
    s.style.transform=`translateX(-50%) rotate(${rot}deg)`;
    s.innerHTML=`<path d="${LEAF}"/>`;
    s.__tap=()=>tapMem(i,s);
    pads.appendChild(s);
  });
  rMem=0; playMem();
}
function playMem(){
  const {n,on,off}=MR[rMem];
  seq=Array.from({length:n},()=>Math.floor(Math.random()*4));
  step=0; canTap=false;
  $('#pdots').innerHTML=seq.map(()=>'<div class="dot"></div>').join('');
  $('#st-mem').textContent='POZERAJ'; $('#m-mem').textContent='';
  const pads=$$('.pad'); let i=0;
  const next=()=>{
    if(current!=='s-mem')return;
    if(i>=n){ canTap=true; $('#st-mem').textContent='TERAZ TY';
      $$('#pdots .dot').forEach(d=>d.classList.remove('on')); return; }
    const p=pads[seq[i]];
    p.classList.add('lit'); $('#glow').classList.add('on');
    $$('#pdots .dot')[i].classList.add('on');
    setTimeout(()=>{ p.classList.remove('lit'); $('#glow').classList.remove('on');
      i++; setTimeout(next,off); },on);
  };
  setTimeout(next,700);
}
function tapMem(i,el){
  if(!canTap)return;
  el.classList.add('lit'); $('#glow').classList.add('on');
  setTimeout(()=>{el.classList.remove('lit');$('#glow').classList.remove('on');},150);
  if(i!==seq[step]){
    canTap=false; $('#m-mem').innerHTML='<span class="scarlet">STRATIL SI TO</span>';
    setTimeout(()=>{ if(current==='s-mem'){rMem=0;playMem();} },1600); return;
  }
  $$('#pdots .dot')[step].classList.add('on'); step++;
  if(step===seq.length){
    canTap=false; $('#m-mem').innerHTML='<span class="amber">V PORADÍ</span>';
    $$('.pad').forEach(p=>p.classList.add('lit')); $('#glow').classList.add('on');
    setTimeout(()=>{
      $$('.pad').forEach(p=>p.classList.remove('lit')); $('#glow').classList.remove('on');
      if(current!=='s-mem')return; if(rMem<2)rMem++; else rMem=0; playMem(); },1500);
  }
}

/* ═══════════ 4 · DRAW THE INTENSITY ═══════════
   1. skóre zo surových udalostí, nezávisle od vykresľovania
   2. interpolácia medzi vzorkami — riedke vzorkovanie prestáva trestať
   3. canvas + predkreslená matná vrstva, adaptívne preskakovanie snímkov */
const DR=[34,26,20];
const VB=600, INSET=0.80;
let rDraw=0, dPts=[], dSeen=[], dDrag=false, dcv, dcx, baseCv, covPath, covDirty=true;
let lastIdx=0, lastPt=null, smpN=0, smpT0=0, frN=0, frT0=0, frLast=0, skipF=0, ADAPT=1;
let sparks=[];   // max 22 kruhov za snímok — lacnejšie než jeden SVG filter
let offPath=null, isOff=false, offLen=0;   // stopa mimo dráhy

function startDraw(){ rDraw=0; roundDraw(); }
function roundDraw(){
  dcv=$('#trcv'); const r=dcv.getBoundingClientRect();
  dcv.width=r.width*devicePixelRatio; dcv.height=r.height*devicePixelRatio;
  dcx=dcv.getContext('2d');
  const k=devicePixelRatio*r.width/VB;
  dcx.setTransform(k,0,0,k,0,0);

  const base=$('#tbase');
  base.setAttribute('d', iqosPath(VB/2,VB/2,VB/2*INSET));
  const L=base.getTotalLength(), N=220;
  dPts=[]; for(let i=0;i<N;i++){ const p=base.getPointAtLength(L*i/N); dPts.push([p.x,p.y]); }
  dSeen=new Array(N).fill(false);
  dDrag=false; lastIdx=0; lastPt=null; smpN=0; frN=0; covDirty=true; ADAPT=1; sparks=[];
  offPath=new Path2D(); isOff=false; offLen=0;

  baseCv=document.createElement('canvas');
  baseCv.width=dcv.width; baseCv.height=dcv.height;
  const bx=baseCv.getContext('2d');
  bx.setTransform(k,0,0,k,0,0); bx.lineCap='round'; bx.lineJoin='round';
  bx.beginPath();
  dPts.forEach((q,i)=> i?bx.lineTo(q[0],q[1]):bx.moveTo(q[0],q[1]));
  bx.closePath(); bx.strokeStyle='#3E1A21'; bx.lineWidth=9; bx.stroke();
  const st=dPts[0];
  bx.beginPath(); bx.arc(st[0],st[1],17,0,7);
  bx.strokeStyle='#FFB627'; bx.lineWidth=3; bx.stroke();
  bx.beginPath(); bx.moveTo(st[0]-7,st[1]+14); bx.lineTo(st[0],st[1]+4);
  bx.lineTo(st[0]+7,st[1]+14); bx.strokeStyle='#FFB627'; bx.lineWidth=2.5; bx.stroke();

  $('#st-draw').textContent='PRESNOSŤ 0 %';
  $('#m-draw').textContent=`Prilož prst na krúžok a obkresli tvar. · tolerancia ${DR[rDraw]} px`;
  $('#diag').textContent=''; drawCanvas();
}
const dTol=()=>DR[rDraw]*(VB/dcv.getBoundingClientRect().width);
function markSeg(ax,ay,bx,by){
  const T=dTol(), d=Math.hypot(bx-ax,by-ay), steps=Math.max(1,Math.ceil(d/4));
  for(let s=0;s<=steps;s++){
    const x=ax+(bx-ax)*s/steps, y=ay+(by-ay)*s/steps;
    let bi=-1,bd=1e9;
    for(let k=-35;k<=35;k++){
      const i=(lastIdx+k+dPts.length)%dPts.length;
      const dd=Math.hypot(dPts[i][0]-x,dPts[i][1]-y);
      if(dd<bd){bd=dd;bi=i;}
    }
    if(bd<=T){ if(!dSeen[bi]) covDirty=true; dSeen[bi]=true; lastIdx=bi; }
  }
}
function nearDist(x,y){
  let bd=1e9;
  for(let k=-35;k<=35;k++){
    const i=(lastIdx+k+dPts.length)%dPts.length;
    const dd=Math.hypot(dPts[i][0]-x,dPts[i][1]-y);
    if(dd<bd)bd=dd;
  }
  return bd;
}
function drawCanvas(){
  if(!dcx||!baseCv)return;
  const r=dcv.getBoundingClientRect(), k=devicePixelRatio*r.width/VB;
  dcx.setTransform(1,0,0,1,0,0);
  dcx.clearRect(0,0,dcv.width,dcv.height);
  dcx.drawImage(baseCv,0,0);
  dcx.setTransform(k,0,0,k,0,0);
  dcx.lineCap='round'; dcx.lineJoin='round';
  if(covDirty){
    covPath=new Path2D();
    for(let i=0;i<dPts.length-1;i++)
      if(dSeen[i]&&dSeen[i+1]){ covPath.moveTo(dPts[i][0],dPts[i][1]);
        covPath.lineTo(dPts[i+1][0],dPts[i+1][1]); }
    covDirty=false;
  }
  if(offPath){                                 // vybočenie — tmavočervená, tenká, bez žiary
    dcx.strokeStyle='rgba(200,52,62,.75)'; dcx.lineWidth=5; dcx.stroke(offPath);
  }
  if(covPath){
    dcx.strokeStyle='rgba(255,106,31,.28)'; dcx.lineWidth=22; dcx.stroke(covPath);
    dcx.strokeStyle='#FF7A20'; dcx.lineWidth=11; dcx.stroke(covPath);
  }
  // žeravé iskry za prstom — doživajú ~420 ms, potom vypadnú
  const now=performance.now();
  for(let i=sparks.length-1;i>=0;i--){
    const sp=sparks[i], age=(now-sp.t)/420;
    if(age>=1){ sparks.splice(i,1); continue; }
    const px=sp.x+sp.vx*age*26, py=sp.y+sp.vy*age*26+age*age*14;
    dcx.beginPath(); dcx.arc(px,py,sp.r*(1-age)+0.6,0,7);
    dcx.fillStyle = isOff
      ? `rgba(224,67,74,${(1-age)*0.55})`
      : `rgba(255,${Math.round(150+90*(1-age))},${Math.round(40+70*(1-age))},${(1-age)*0.85})`;
    dcx.fill();
  }
  if(lastPt){
    dcx.beginPath(); dcx.arc(lastPt[0],lastPt[1],15,0,7);
    dcx.fillStyle = isOff ? 'rgba(224,67,74,.22)' : 'rgba(255,180,90,.20)'; dcx.fill();
    dcx.beginPath(); dcx.arc(lastPt[0],lastPt[1],8,0,7);
    dcx.fillStyle = isOff ? '#E0434A' : '#FFE3A8'; dcx.fill();
    dcx.beginPath(); dcx.arc(lastPt[0],lastPt[1],3.4,0,7);
    dcx.fillStyle = isOff ? '#FFD2D4' : '#FFFFFF'; dcx.fill();
  }
}
const dPt=e=>{ const r=dcv.getBoundingClientRect();
  return [(e.clientX-r.left)/r.width*VB,(e.clientY-r.top)/r.height*VB]; };
function drawDown(e){
  const [x,y]=dPt(e), s0=dPts[0]||[0,0];
  if(Math.hypot(x-s0[0],y-s0[1])<80){
    dDrag=true; lastPt=[x,y]; lastIdx=0; smpN=0;
    smpT0=performance.now(); frT0=smpT0; frN=0;
    $('#m-draw').textContent='';
  } else $('#m-draw').textContent='Začni pri krúžku.';
}
function drawMove(e){
  if(!dDrag)return;
  for(const ev of (e.getCoalescedEvents?e.getCoalescedEvents():[e])){
    const [x,y]=dPt(ev); smpN++;
    const off = nearDist(x,y) > dTol();
    if(lastPt){
      if(off){                                  // mimo dráhy — kreslíme skutočnú stopu prsta
        offPath.moveTo(lastPt[0],lastPt[1]); offPath.lineTo(x,y);
        offLen += Math.hypot(x-lastPt[0], y-lastPt[1]);
      }
      isOff = off;
      markSeg(lastPt[0],lastPt[1],x,y);
      if(Math.random()<0.55){                     // nie z každej vzorky — nech to nie je retiazka
        const a=Math.random()*6.283, sp=0.4+Math.random()*2.4;
        sparks.push({x:x+(Math.random()-.5)*7, y:y+(Math.random()-.5)*7,
                     vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-0.9,
                     r:3.2+Math.random()*2.6, t:performance.now()});
        if(sparks.length>22) sparks.shift();
      }
    }
    lastPt=[x,y];
  }
  const pct=(dSeen.filter(Boolean).length/dSeen.length*100).toFixed(0);
  $('#st-draw').innerHTML = isOff
    ? `<span style="color:#E0434A">MIMO DRÁHY</span>`
    : `PRESNOSŤ ${pct} %`;
}
function drawFrame(){
  if(current!=='s-draw')return;
  const now=performance.now();
  if(frLast){ frN++;
    if(now-frLast>22) ADAPT=2; else if(frN>30&&now-frLast<15) ADAPT=1; }
  frLast=now;
  if(++skipF%ADAPT===0 || sparks.length) drawCanvas();
  if(dDrag&&smpT0){
    const s=(now-smpT0)/1000, f=(now-frT0)/1000;
    $('#diag').textContent=
      `vzoriek/s  ${s>0?(smpN/s).toFixed(0):'–'}\n`+
      `fps        ${f>0?(frN/f).toFixed(0):'–'}\n`+
      `kreslenie  ${ADAPT===1?'každý snímok':'každý druhý'}`;
  }
  requestAnimationFrame(drawFrame);
}
function drawUp(){
  if(!dDrag)return; dDrag=false;
  const cov=dSeen.filter(Boolean).length/dSeen.length;
  const s=(performance.now()-smpT0)/1000;
  $('#diag').textContent=`vzoriek/s  ${(smpN/s).toFixed(0)}\npokrytie   ${(cov*100).toFixed(0)} %`;
  if(cov>=0.85){
    $('#m-draw').innerHTML=`<span class="amber">ČISTÁ LINKA — ${(cov*100).toFixed(0)} %</span>`;
    setTimeout(()=>{ if(current!=='s-draw')return; if(rDraw<2)rDraw++; else rDraw=0; roundDraw(); },1700);
  } else {
    $('#m-draw').innerHTML=`<span class="scarlet">ROZTRASENÉ — ${(cov*100).toFixed(0)} %</span> · treba 85 %`;
    setTimeout(()=>{ if(current==='s-draw') roundDraw(); },1900);
  }
}

/* ═══════════ 5 · RELEASE THE INTENSITY ═══════════ */
let rcv, rcx, throws=[], shot=null, aim=null, rings=[];
const G=1400;
function startRel(){
  rcv=$('#tcv'); const r=rcv.getBoundingClientRect();
  rcv.width=r.width*devicePixelRatio; rcv.height=r.height*devicePixelRatio;
  rcx=rcv.getContext('2d'); rcx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  throws=[]; shot=null; aim=null;
  const m=Math.min(r.width,r.height);
  rings=[m*0.060,m*0.112,m*0.166,m*0.224];
  $('#st-rel').textContent='HOD 1 / 3';
  $('#rdots').innerHTML='<div class="dot on"></div><div class="dot"></div><div class="dot"></div>';
  $('#m-rel').textContent='Potiahni dozadu a pusť. Silu musíš odhadnúť.';
  $('#pw .b i').style.width='0%';
  drawRel();
}
const launch=()=>{const r=rcv.getBoundingClientRect();return [r.width*0.5,r.height*0.90];};
const centre=()=>{const r=rcv.getBoundingClientRect();return [r.width*0.5,r.height*0.30];};
const rvel =()=>{const [lx,ly]=launch();return [(lx-aim[0])*2.6,(ly-aim[1])*2.6];};
function drawRel(){
  if(!rcx)return;
  const r=rcv.getBoundingClientRect(),W=r.width,H=r.height,[cx,cy]=centre();
  rcx.clearRect(0,0,W,H);
  const g=rcx.createRadialGradient(cx,cy,0,cx,cy,rings[3]*2.4);
  g.addColorStop(0,'rgba(255,106,31,.20)'); g.addColorStop(1,'rgba(255,106,31,0)');
  rcx.fillStyle=g; rcx.fillRect(0,0,W,H);
  const col=['#FFB627','#FF5A18','#C62C33','#6B1A22'];
  for(let i=rings.length-1;i>=0;i--){
    rcx.beginPath();
    const p=new Path2D(iqosPath(cx,cy,rings[i]));
    rcx.strokeStyle=col[i]; rcx.lineWidth=i===0?3:2; rcx.stroke(p);
  }
  rcx.beginPath(); rcx.arc(cx,cy,4,0,7); rcx.fillStyle='#FFE9B0'; rcx.fill();
  const [lx,ly]=launch();
  rcx.beginPath(); rcx.arc(lx,ly,9,0,7);
  rcx.fillStyle='#2A1218'; rcx.fill();
  rcx.strokeStyle='#5A2530'; rcx.lineWidth=1.5; rcx.stroke();
  if(aim){
    rcx.setLineDash([3,5]); rcx.beginPath(); rcx.moveTo(lx,ly); rcx.lineTo(aim[0],aim[1]);
    rcx.strokeStyle='#FFB627'; rcx.lineWidth=1.5; rcx.stroke(); rcx.setLineDash([]);
    rcx.beginPath(); rcx.arc(aim[0],aim[1],6,0,7); rcx.fillStyle='#FFB627'; rcx.fill();
  }
  throws.forEach((p,i)=>{
    rcx.beginPath(); rcx.arc(p.x,p.y,6,0,7);
    rcx.fillStyle=p.hit?'#FF6A1F':'#4A2028'; rcx.fill();
    rcx.fillStyle='#6B5459'; rcx.font='11px -apple-system,sans-serif';
    rcx.fillText(String(i+1),p.x+10,p.y+4);
  });
  if(shot){
    rcx.beginPath(); rcx.arc(shot.x,shot.y,11,0,7);
    rcx.fillStyle='rgba(255,217,138,.25)'; rcx.fill();
    rcx.beginPath(); rcx.arc(shot.x,shot.y,6,0,7); rcx.fillStyle='#FFD98A'; rcx.fill();
  }
}
function relDown(e){
  if(shot||throws.length>=3)return;
  const r=rcv.getBoundingClientRect(); aim=[e.clientX-r.left,e.clientY-r.top]; drawRel();
}
function relMove(e){
  if(!aim)return;
  const r=rcv.getBoundingClientRect(); aim=[e.clientX-r.left,e.clientY-r.top];
  const [lx,ly]=launch(), d=Math.min(1,Math.hypot(lx-aim[0],ly-aim[1])/(r.height*0.55));
  $('#pw .b i').style.width=(d*100).toFixed(0)+'%';
  drawRel();
}
function relUp(){
  if(!aim)return;
  const [lx,ly]=launch(), v=rvel(); aim=null;
  $('#pw .b i').style.width='0%';
  const t0=performance.now(), cy=centre()[1];
  const step=ts=>{
    if(current!=='s-rel'){shot=null;return;}
    const t=(ts-t0)/1000;
    const x=lx+v[0]*t, y=ly+v[1]*t+0.5*G*t*t;
    shot={x,y}; drawRel();
    const r=rcv.getBoundingClientRect();
    if((y<=cy&&v[1]<0)||t>3||y>r.height+60||x<-60||x>r.width+60){ land(x,y); return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function land(x,y){
  shot=null;
  const [cx,cy]=centre(), d=Math.hypot(x-cx,y-cy), hit=d<=rings[3];
  throws.push({x,y,hit,d}); drawRel();
  const n=throws.length;
  const dir=Math.abs(y-cy)>Math.abs(x-cx)?(y>cy?'krátko':'ďaleko'):(x>cx?'vpravo':'vľavo');
  $('#m-rel').innerHTML = !hit
    ? `<span class="scarlet">MIMO</span> · ${dir}, ${d.toFixed(0)} px od stredu`
    : d<=rings[0] ? `<span class="amber">PRESNE</span> · ${d.toFixed(0)} px`
    : `<span class="amber">ZÁSAH</span> · ${dir}, ${d.toFixed(0)} px od stredu`;
  $$('#rdots .dot').forEach((e,i)=>e.classList.toggle('on',i<=n));
  if(n>=3){
    const best=Math.min(...throws.map(p=>p.d));
    setTimeout(()=>{ if(current!=='s-rel')return;
      $('#m-rel').innerHTML=`najlepší hod <span class="amber">${best.toFixed(0)} px</span> od stredu`;
      setTimeout(()=>{ if(current==='s-rel') startRel(); },1900); },1200);
  } else { $('#st-rel').textContent=`HOD ${n+1} / 3`;
    $('#m-rel').innerHTML+=' · koriguj'; }
}
