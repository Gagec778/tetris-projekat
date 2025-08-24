(function(){
  // ===== DOM =====
  const DPR = Math.min(window.devicePixelRatio||1, 2);
  const canvas = document.getElementById('game'); const ctx = canvas.getContext('2d');
  const fx = document.getElementById('fx'); const fctx = fx.getContext('2d');
  const trayEl = document.getElementById('tray');
  const scoreEl = document.getElementById('score'); const bestEl = document.getElementById('best');
  const resetBtn = document.getElementById('reset'); const app = document.getElementById('app');
  const startScreen = document.getElementById('startScreen'); const startClassic = document.getElementById('startClassic');
  const settingsBtn = document.getElementById('settingsBtn'); const settingsModal = document.getElementById('settingsModal');
  const setTheme = document.getElementById('setTheme'); const setSound = document.getElementById('setSound'); const setMode = document.getElementById('setMode');
  const resetBest = document.getElementById('resetBest'); const closeSettings = document.getElementById('closeSettings'); const runTestsBtn = document.getElementById('runTests');
  const ghost = document.getElementById('ghost'); const backBtn = document.getElementById('backBtn');
  const onboarding = document.getElementById('onboarding'); const skipOnb = document.getElementById('skipOnb'); const startOnb = document.getElementById('startOnb');
  const gameOver = document.getElementById('gameOver'); const goStats = document.getElementById('goStats');
  const playAgain = document.getElementById('playAgain'); const goMenu = document.getElementById('goMenu');
  const hud = document.querySelector('.hud');

  // opcioni powerup dugmići
  const btnRotate = document.getElementById('btnRotate');
  const btnHammer = document.getElementById('btnHammer');
  const btnShuffle = document.getElementById('btnShuffle');
  const btnBomb = document.getElementById('btnBomb');
  const cntHammer = document.getElementById('cntHammer');
  const cntShuffle = document.getElementById('cntShuffle');
  const cntBomb = document.getElementById('cntBomb');

  // ===== CONST =====
  const BOARD=10;
  const COLORS=['#5b8cff','#7ad37a','#ffb86b','#f17fb5','#6ee7f0','#c9a6ff','#ffd166','#8ecae6'];
  const COMBO_WINDOW=360;

  // ===== SETTINGS/LS =====
  const LS=(k,v)=> v===undefined?localStorage.getItem(k):localStorage.setItem(k,v);
  const settings={ theme:LS('bp10.theme')||'dark', sound:LS('bp10.sound')!==null?LS('bp10.sound')==='1':true, mode:LS('bp10.mode')||'classic', onboarded:LS('bp10.onboarded')==='1' };
  document.body.classList.toggle('light',settings.theme==='light');

  function updateSoundLabel(){ if(setSound) setSound.textContent=settings.sound?'🔈 On':'🔇 Off'; }
  function updateModeLabel(){ if(setMode){ const m=settings.mode; setMode.textContent=(m==='obstacles'?'Obstacles':m==='time'?'Time':m==='arcade'?'Arcade':m==='survival'?'Survival':m==='zen'?'Zen':m==='puzzle'?'Puzzle':'Classic'); } }
  updateSoundLabel(); updateModeLabel();

  // ===== RNG =====
  function RNG(seed){ this.s=seed>>>0; } RNG.prototype.next=function(){ this.s=(this.s*1664525+1013904223)>>>0; return this.s/4294967296; };
  let rng=null; const rnd=()=> rng?rng.next():Math.random();

  // ===== AUDIO/HAPT =====
  let audioCtx=null;
  function ensureAudio(){ if(!audioCtx){ try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } }
  function beep(f=440,d=0.06){ if(!settings.sound) return; ensureAudio(); if(!audioCtx) return; const t=audioCtx.currentTime; const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(0.001,t); g.gain.exponentialRampToValueAtTime(0.18,t+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+d); o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+d); }
  const hapt=(ms=15)=>{ if(!settings.sound) return; if(navigator.vibrate) navigator.vibrate(ms) };

  // ===== STATE =====
  let state={ grid:createGrid(), cell:32, score:0, best:Number(LS('bp10.best')||0), hand:[], dragging:null,
    combo:0, comboTimer:0, timeLeft:0, powerups:{hammer:1,shuffle:1,bomb:1}, using:null };
  bestEl.textContent=state.best;

  // ===== LAYOUT: kvadrat, centriran, preko cele dostupne visine =====
  function sizeToScreen(){
    const headerH = document.querySelector('header')?.offsetHeight||60;
    const trayH = document.getElementById('tray')?.offsetHeight||120;
    const chrome = 28; // padding/razmak
    const availH = Math.max(220, window.innerHeight - headerH - trayH - chrome);
    const availW = Math.min(document.documentElement.clientWidth, 720) - 32;
    const side = Math.max(200, Math.min(availW, availH));
    const cell = Math.floor(side/BOARD); const px = cell*BOARD;

    // CSS veličina
    canvas.style.width=px+'px'; canvas.style.height=px+'px';
    fx.style.width=px+'px'; fx.style.height=px+'px';
    // uređaj piks
    canvas.width=Math.floor(px*DPR); canvas.height=Math.floor(px*DPR);
    fx.width=Math.floor(px*DPR); fx.height=Math.floor(px*DPR);

    ctx.setTransform(1,0,0,1,0,0); fctx.setTransform(1,0,0,1,0,0); ctx.scale(DPR,DPR);
    state.cell = cell;
    draw();
  }
  addEventListener('resize', sizeToScreen, {passive:true});

  // ===== GRID/PIECES =====
  function createGrid(){ return Array.from({length:BOARD},()=>Array(BOARD).fill(0)); }
  const SHAPES=[ [[0,0]], [[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[1,0],[2,0],[3,0]], [[0,0],[1,0],[2,0],[3,0],[4,0]],
                 [[0,0],[0,1]], [[0,0],[0,1],[0,2]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[0,1],[0,2],[0,3],[0,4]],
                 [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[0,1],[1,1],[2,1]],
                 [[0,0],[1,0],[2,0],[0,1]], [[0,0],[1,0],[2,0],[0,1],[0,2]], [[0,0],[1,0],[2,0],[1,1]] ];
  function newPiece(){ const shape=SHAPES[Math.floor(rnd()*SHAPES.length)]; const color=COLORS[Math.floor(rnd()*COLORS.length)];
    const minx=Math.min(...shape.map(b=>b[0])), miny=Math.min(...shape.map(b=>b[1]));
    const blocks=shape.map(([x,y])=>[x-minx,y-miny]); const w=Math.max(...blocks.map(b=>b[0]))+1, h=Math.max(...blocks.map(b=>b[1]))+1;
    return {blocks,w,h,color,used:false,id:Math.random().toString(36).slice(2)}; }
  function rotatePiece(p){ const blocks=p.blocks.map(([x,y])=>[y,p.w-1-x]); return {...p,blocks,w:p.h,h:p.w}; }
  function refillHand(){ state.hand=[newPiece(),newPiece(),newPiece()]; renderTray(); }

  function canPlace(piece,gx,gy){
    for(const [dx,dy] of piece.blocks){
      const x=gx+dx,y=gy+dy;
      if(x<0||y<0||x>=BOARD||y>=BOARD) return false;
      if(state.grid[y][x]!==0) return false;
    }
    return true;
  }
  function canFitAnywhere(piece){
    for(let y=0;y<=BOARD-piece.h;y++) for(let x=0;x<=BOARD-piece.w;x++) if(canPlace(piece,x,y)) return true;
    return false;
  }
  const anyFits=()=> state.hand.some(p=>!p.used && canFitAnywhere(p));

  // ===== DRAW HELPERS =====
  const getCss=v=> getComputedStyle(document.body).getPropertyValue(v);
  function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); r=Math.min(r,w/2,h/2); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function hexToRgb(hex){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim()); if(!m) return {r:91,g:140,b:255}; return {r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}; }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function adjust(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r+(255-r)*amt),0,255), ng=clamp(Math.round(g+(255-g)*amt),0,255), nb=clamp(Math.round(b+(255-b)*amt),0,255); return `rgb(${nr},${ng},${nb})`; }
  function dark(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r*(1-amt)),0,255), ng=clamp(Math.round(g*(1-amt)),0,255), nb=clamp(Math.round(b*(1-amt)),0,255); return `rgb(${nr},${ng},${nb})`; }

  function drawBlock3D(ctx,x,y,s,color,{alpha=1}={}){
    ctx.save(); ctx.globalAlpha=alpha;
    // drop shadow
    ctx.fillStyle='rgba(0,0,0,.28)'; roundRect(ctx,x+2,y+3,s-3,s-2,Math.max(6,s*.18)); ctx.fill();
    // body
    roundRect(ctx,x+1,y+1,s-2,s-2,Math.max(6,s*.2));
    const g=ctx.createLinearGradient(x,y,x,y+s); g.addColorStop(0,adjust(color,.2)); g.addColorStop(.55,color); g.addColorStop(1,dark(color,.25));
    ctx.fillStyle=g; ctx.fill();
    // highlights / border
    ctx.beginPath(); ctx.moveTo(x+3,y+3); ctx.lineTo(x+s-3,y+3); ctx.lineWidth=Math.max(1,s*.06); ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+3,y+s-3); ctx.lineTo(x+s-3,y+s-3); ctx.lineWidth=Math.max(1,s*.08); ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.stroke();
    // spec
    const spec=ctx.createRadialGradient(x+s*.35,y+s*.28,2,x+s*.30,y+s*.18,s*.55); spec.addColorStop(0,'rgba(255,255,255,.55)'); spec.addColorStop(1,'rgba(255,255,255,0)');
    ctx.globalAlpha=.55; ctx.fillStyle=spec; ctx.beginPath(); ctx.ellipse(x+s*.35,y+s*.28,s*.42,s*.28,-.3,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=alpha;
    roundRect(ctx,x+1,y+1,s-2,s-2,Math.max(6,s*.2)); ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=Math.max(1,s*.06); ctx.stroke();
    ctx.restore();
  }
  function drawPlacedCell(ctx,x,y,s){ drawBlock3D(ctx,x,y,s,getCss('--accent')||'#5b8cff',{alpha:.98}); }
  function drawPieceCell(ctx,x,y,s,color,alpha){ drawBlock3D(ctx,x,y,s,color,{alpha}); }

  // ===== RENDER BOARD (diskretna mreža) =====
  function draw(){
    const s=state.cell;
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.scale(DPR,DPR);

    // semi-transparent panel, da se aurora vidi ispod
    roundRect(ctx,0,0,s*BOARD,s*BOARD,16);
    const panel=ctx.createLinearGradient(0,0,0,s*BOARD);
    panel.addColorStop(0,'rgba(10,12,18,.28)'); panel.addColorStop(1,'rgba(10,12,18,.38)');
    ctx.fillStyle=panel; ctx.fill();
    // tanki kvadrati "grid" samo kao suptilne pločice
    for(let y=0;y<BOARD;y++){
      for(let x=0;x<BOARD;x++){
        const px=x*s, py=y*s, v=state.grid[y][x];
        // pločica
        roundRect(ctx,px+1,py+1,s-2,s-2,8);
        if(v===1) { drawPlacedCell(ctx,px,py,s); }
        else if(v===-1){
          const g=ctx.createLinearGradient(px,py,px,py+s); g.addColorStop(0,'rgba(255,255,255,.05)'); g.addColorStop(1,'rgba(0,0,0,.22)');
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=1; ctx.stroke();
        } else {
          ctx.fillStyle='rgba(255,255,255,.03)'; ctx.fill(); // diskretna ploča
        }
      }
    }

    // „ghost“ dok vučemo
    if(state.dragging){
      const {piece,gx,gy,valid}=state.dragging;
      if(gx!=null&&gy!=null){
        for(const [dx,dy] of piece.blocks){
          const x=(gx+dx)*s, y=(gy+dy)*s;
          if(valid) drawPieceCell(ctx,x,y,s,piece.color,.94);
          else drawBlock3D(ctx,x,y,s,'#7a2c2c',{alpha:.55});
        }
      }
    }
  }

  // ===== PLACE & SCORE =====
  function scoreForClear(c){ return c*10 + (c>1?(c-1)*5:0); }
  function place(piece,gx,gy){
    for(const [dx,dy] of piece.blocks) state.grid[gy+dy][gx+dx]=1;

    // puni redovi/kolone
    const fullR=[], fullC=[];
    for(let y=0;y<BOARD;y++){ let ok=true; for(let x=0;x<BOARD;x++){ if(state.grid[y][x]!==1){ok=false;break} } if(ok) fullR.push(y); }
    for(let x=0;x<BOARD;x++){ let ok=true; for(let y=0;y<BOARD;y++){ if(state.grid[y][x]!==1){ok=false;break} } if(ok) fullC.push(x); }
    const cleared=fullR.length+fullC.length;

    if(cleared>0){
      const cells=[];
      for(const r of fullR){ for(let x=0;x<BOARD;x++){ cells.push([x,r]); } state.grid[r]=Array(BOARD).fill(0); }
      for(const c of fullC){ for(let y=0;y<BOARD;y++){ cells.push([c,y]); state.grid[y][c]=0; } }
      spawnParticles(cells); beep(660,.08); hapt(25);
    }else{ beep(420,.05); hapt(12); }

    const base=piece.blocks.length, bonus=scoreForClear(cleared);
    if(cleared>0){ state.combo=Math.min(state.combo+1,9); state.comboTimer=COMBO_WINDOW; }
    else state.combo=0;
    const mult=Math.max(1,state.combo||1);
    const gain=(base+bonus)*mult; state.score+=gain; scoreEl.textContent=state.score;

    piece.used=true; state.hand = state.hand.map(p=> p.id===piece.id? {...p,used:true}:p);
    renderTray();

    if(state.hand.every(p=>p.used)) refillHand();
    if(state.score>state.best){ state.best=state.score; LS('bp10.best',String(state.best)); bestEl.textContent=state.best; }

    if(!anyFits()){ goStats.textContent=`Score: ${state.score} • Best: ${state.best}`; gameOver.style.display='flex'; beep(220,.15); hapt(40); }
    draw();
  }

  // ===== FX =====
  const particles=[]; const scorePopups=[]; let pcFlash=0;
  function spawnParticles(cells){
    const s=state.cell, d=DPR;
    cells.forEach(([x,y])=>{ for(let i=0;i<6;i++) particles.push({x:(x+.5)*s*d,y:(y+.5)*s*d,vx:(Math.random()-.5)*2,vy:(-Math.random()*2-.5),life:40}) });
  }
  function stepFX(){
    // clear
    fctx.setTransform(1,0,0,1,0,0); fctx.clearRect(0,0,fx.width,fx.height);
    // particles
    fctx.fillStyle='#ffffffaa';
    particles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=.05; p.life--; fctx.globalAlpha=Math.max(0,p.life/40); fctx.beginPath(); fctx.arc(p.x,p.y,2,0,Math.PI*2); fctx.fill(); });
    for(let i=particles.length-1;i>=0;i--) if(particles[i].life<=0) particles.splice(i,1);
    requestAnimationFrame(stepFX);
  }
  requestAnimationFrame(stepFX);

  // ===== TRAY / DRAG =====
  const POINTER={active:false,from:null};
  function pieceToCanvas(piece){
    const scale=18, pad=6, w=piece.w*scale+pad*2, h=piece.h*scale+pad*2;
    const c=document.createElement('canvas'); c.width=w*DPR; c.height=h*DPR; c.style.width=w+'px'; c.style.height=h+'px';
    const cx=c.getContext('2d'); cx.scale(DPR,DPR);
    cx.fillStyle='rgba(0,0,0,.22)'; roundRect(cx,0,0,w,h,12); cx.fill();
    for(const [dx,dy] of piece.blocks){ const x=pad+dx*scale, y=pad+dy*scale; drawPieceCell(cx,x+1,y+1,scale-2,piece.color,1); }
    return c;
  }
  function renderTray(){
    trayEl.innerHTML='';
    state.hand.forEach((p,i)=>{
      const div=document.createElement('div');
      const fits=canFitAnywhere(p);
      div.className='slot'+(p.used?' used':'')+(p.used?'':(fits?' good':' bad'));
      div.dataset.index=String(i);
      div.appendChild(pieceToCanvas(p));
      if(!p.used) div.addEventListener('pointerdown', startDragFromSlot);
      trayEl.appendChild(div);
    });
  }
  function startDragFromSlot(e){
    const i=Number(e.currentTarget.dataset.index), piece=state.hand[i];
    if(!piece || piece.used) return;
    POINTER.active=true; POINTER.from=i; state.dragging={piece,gx:null,gy:null,valid:false};
    e.currentTarget.classList.add('used'); e.currentTarget.setPointerCapture?.(e.pointerId); e.preventDefault();
  }
  function getCanvasXY(e){ const r=canvas.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; }
  function onMove(e){
    if(!POINTER.active||!state.dragging) return;
    const {x,y}=getCanvasXY(e); const s=state.cell;
    const gx=Math.floor(x/s), gy=Math.floor(y/s);
    if(gx>=0&&gy>=0&&gx<=BOARD-state.dragging.piece.w&&gy<=BOARD-state.dragging.piece.h){
      state.dragging.gx=gx; state.dragging.gy=gy; state.dragging.valid=canPlace(state.dragging.piece,gx,gy);
    }else{ state.dragging.gx=null; state.dragging.gy=null; state.dragging.valid=false; }
    draw(); e.preventDefault();
  }
  function onUp(){
    if(!POINTER.active||!state.dragging) return;
    const d=state.dragging; const slot=trayEl.querySelector(`.slot[data-index="${POINTER.from}"]`);
    POINTER.active=false;
    if(d.valid && d.gx!=null && d.gy!=null) place(d.piece,d.gx,d.gy); else slot&&slot.classList.remove('used');
    state.dragging=null;
  }
  addEventListener('pointermove', onMove, {passive:false});
  addEventListener('pointerup', onUp, {passive:true});
  addEventListener('pointercancel', onUp, {passive:true});

  // ===== TOAST / UI =====
  let toastTimer=null;
  function toast(msg){
    let t=document.getElementById('toast');
    if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);
      Object.assign(t.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',background:'rgba(12,14,22,.8)',color:'#e8ecf1',padding:'10px 14px',borderRadius:'12px',boxShadow:'0 10px 30px rgba(0,0,0,.35)',zIndex:99,transition:'opacity .25s',opacity:'0',border:'1px solid rgba(255,255,255,.06)'}); }
    t.textContent=msg; t.style.opacity='1'; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.style.opacity='0'; }, 1500);
  }

  // ===== CONTROLS =====
  resetBtn?.addEventListener('click', ()=>newGame());
  backBtn?.addEventListener('click', ()=>goHome());
  settingsBtn?.addEventListener('click', ()=>settingsModal.style.display='flex');
  closeSettings?.addEventListener('click', ()=>settingsModal.style.display='none');
  settingsModal?.querySelector('.backdrop')?.addEventListener('click', ()=>settingsModal.style.display='none');
  setTheme?.addEventListener('click', ()=>{ settings.theme=settings.theme==='dark'?'light':'dark'; LS('bp10.theme',settings.theme); document.body.classList.toggle('light',settings.theme==='light'); });
  setSound?.addEventListener('click', ()=>{ settings.sound=!settings.sound; LS('bp10.sound',settings.sound?'1':'0'); updateSoundLabel(); });
  setMode?.addEventListener('click', ()=>{
    const order=['classic','obstacles','time','arcade','survival','zen','puzzle'];
    settings.mode=order[(order.indexOf(settings.mode)+1)%order.length]; LS('bp10.mode',settings.mode); updateModeLabel(); toast(`Mode: ${settings.mode}`);
  });
  resetBest?.addEventListener('click', ()=>{ localStorage.removeItem('bp10.best'); state.best=0; bestEl.textContent=0; toast('Best resetovan'); });
  runTestsBtn?.addEventListener('click', ()=>{ const {passed,failed}=runTests(); toast(`Testovi: ${passed} ✅ / ${failed} ❌`); });

  startClassic?.addEventListener('click', ()=>startGame('classic'));
  function startGame(mode){ settings.mode=mode; LS('bp10.mode',mode); startScreen.style.display='none'; app.style.display='flex'; if(!settings.onboarded) onboarding.style.display='flex'; sizeToScreen(); newGame(); }
  function goHome(){ app.style.display='none'; startScreen.style.display='flex'; gameOver.style.display='none'; onboarding.style.display='none'; state.dragging=null; }

  skipOnb?.addEventListener('click', ()=> onboarding.style.display='none');
  startOnb?.addEventListener('click', ()=>{ onboarding.style.display='none'; settings.onboarded=true; LS('bp10.onboarded','1'); });
  playAgain?.addEventListener('click', ()=>{ gameOver.style.display='none'; newGame(); });
  goMenu?.addEventListener('click', ()=>{ gameOver.style.display='none'; goHome(); });

  // ===== GAME FLOW =====
  function newGame(){
    state.grid=createGrid(); state.score=0; scoreEl.textContent=0; state.hand=[]; state.combo=0; state.comboTimer=0; state.using=null;
    refillHand(); draw();
  }

  // ===== TESTS (brzi sanity) =====
  function runTests(){
    const R=[]; const ok=(n,b)=>(R.push([n,b]), b);
    ok('anyFits defined', typeof anyFits==='function');
    const p={blocks:[[0,0],[1,0]],w:2,h:1,color:'#fff',id:'t'};
    ok('canPlace OOB false', canPlace(p,-1,0)===false);
    state.grid=createGrid(); for(let x=0;x<BOARD-1;x++) state.grid[0][x]=1;
    const s0=state.score; place({blocks:[[0,0]],w:1,h:1,color:'#fff',id:'t2'},9,0);
    ok('row clear scores', state.score>s0);
    console.log('[Tests]',R); return {passed:R.filter(x=>x[1]).length, failed:R.filter(x=>!x[1]).length};
  }

  // ===== INIT =====
  // ghost board na start ekran
  (function initGhost(){ if(!ghost) return; ghost.innerHTML=''; for(let i=0;i<100;i++){ const sp=document.createElement('span'); ghost.appendChild(sp); } [12,13,14,22,32,42,52,62,72,82].forEach(i=>{ if(ghost.children[i]) ghost.children[i].style.background='#ffffff33'; }); })();
  sizeToScreen();
})();
