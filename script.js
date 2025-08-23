
(function(){
  // ===== DOM REFS =====
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const fx = document.getElementById('fx');
  const fctx = fx.getContext('2d');
  const trayEl = document.getElementById('tray');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const resetBtn = document.getElementById('reset');
  const app = document.getElementById('app');
  const startScreen = document.getElementById('startScreen');
  const startClassic = document.getElementById('startClassic');
  const startDaily = document.getElementById('startDaily');
  const bg = document.getElementById('bg');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const setTheme = document.getElementById('setTheme');
  const setSound = document.getElementById('setSound');
  const setMode = document.getElementById('setMode');
  const resetBest = document.getElementById('resetBest');
  const closeSettings = document.getElementById('closeSettings');
  const runTestsBtn = document.getElementById('runTests');
  const ghost = document.getElementById('ghost');
  const backBtn = document.getElementById('backBtn');
  const onboarding = document.getElementById('onboarding');
  const skipOnb = document.getElementById('skipOnb');
  const startOnb = document.getElementById('startOnb');
  const gameOver = document.getElementById('gameOver');
  const goStats = document.getElementById('goStats');
  const playAgain = document.getElementById('playAgain');
  const goMenu = document.getElementById('goMenu');
  const hud = document.querySelector('.hud');

  // ===== CONSTS =====
  const BOARD_SIZE = 10;
  const COLORS = ['#5b8cff','#7ad37a','#ffb86b','#f17fb5','#6ee7f0','#c9a6ff','#ffd166','#8ecae6'];
  const COMBO_WINDOW = 360; // ~6s @60fps

  // ===== SETTINGS / LS =====
  const LS = (k, v) => (v===undefined ? localStorage.getItem(k) : localStorage.setItem(k, v));
  const settings = {
    theme: LS('bp10.theme') || 'dark',
    sound: LS('bp10.sound')!==null ? LS('bp10.sound')==='1' : true,
    // classic | daily | obstacles | time | arcade | survival | zen | puzzle
    mode: LS('bp10.mode') || 'classic',
    onboarded: LS('bp10.onboarded')==='1'
  };
  applyTheme(settings.theme);
  updateSoundLabel();
  updateModeLabel();

  // ===== RNG =====
  function RNG(seed){ this.s = seed>>>0; }
  RNG.prototype.next = function(){ this.s = (this.s*1664525 + 1013904223)>>>0; return this.s / 4294967296; };
  function todaySeed(){
    const d=new Date();
    return parseInt(`${d.getFullYear()}${(d.getMonth()+1+'').padStart(2,'0')}${(d.getDate()+'').padStart(2,'0')}`,10)>>>0;
  }
  let rng = null;
  function rnd(){ return rng ? rng.next() : Math.random(); }

  // ===== AUDIO/HAPTICS =====
  let audioCtx = null;
  function ensureAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } }
  function beep(freq=440, dur=0.06){
    if(!settings.sound) return;
    ensureAudio(); if(!audioCtx) return;
    const t=audioCtx.currentTime;
    const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
    osc.type='sine'; osc.frequency.value=freq;
    g.gain.setValueAtTime(0.001,t);
    g.gain.exponentialRampToValueAtTime(0.18,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(t); osc.stop(t+dur);
  }
  function hapt(ms=15){ if(!settings.sound) return; if(navigator.vibrate) navigator.vibrate(ms); }

  // ===== STATE =====
  let state = {
    grid: createGrid(), cell:32, margin:6,
    score:0, best:Number(LS('bp10.best')||0),
    hand:[], dragging:null,
    combo:0, comboTimer:0,
    timeLeft:0,
    powerups: { hammer:1, shuffle:1, bomb:1 },
    using: null,           // 'hammer' | null
    arcadeRotate: false,   // samo u Arcade modu
    turns: 0,              // Survival
    puzzleIndex: 0         // Puzzle pack
  };
  bestEl.textContent = state.best;

  // ===== START SCREEN FX =====
  initGhostBoard();
  initAmbientBackgroundStart();

  function initGhostBoard(){
    if(!ghost) return;
    ghost.innerHTML='';
    for(let i=0;i<100;i++){ const sp=document.createElement('span'); ghost.appendChild(sp); }
    const on=[12,13,14,22,32,42,52,62,72,82];
    on.forEach(i=>{ if(ghost.children[i]) ghost.children[i].style.background = '#ffffff33'; });
  }
  function initAmbientBackgroundStart(){
    const gctx = bg.getContext('2d');
    function resize(){ bg.width=Math.floor(innerWidth*DPR); bg.height=Math.floor(innerHeight*DPR); }
    resize(); addEventListener('resize', resize, {passive:true});
    const shapes=Array.from({length:16},(_,i)=>({x:Math.random()*bg.width,y:Math.random()*bg.height,s:(40+Math.random()*100)*DPR,a:Math.random()*Math.PI*2,vx:(-0.2+Math.random()*0.4)*DPR,vy:(-0.2+Math.random()*0.4)*DPR,c:COLORS[i%COLORS.length]}));
    (function loop(){
      gctx.clearRect(0,0,bg.width,bg.height);
      const grad=gctx.createLinearGradient(0,0,bg.width,bg.height); grad.addColorStop(0,'#0f1220'); grad.addColorStop(1,'#0b0c12');
      gctx.fillStyle=grad; gctx.fillRect(0,0,bg.width,bg.height);
      gctx.globalAlpha=0.28;
      shapes.forEach(sh=>{ gctx.save(); gctx.translate(sh.x,sh.y); gctx.rotate(sh.a); gctx.fillStyle=sh.c; gctx.fillRect(-sh.s/2,-sh.s/2,sh.s,sh.s); gctx.restore(); sh.x+=sh.vx; sh.y+=sh.vy; sh.a+=0.0015; if(sh.x<-150||sh.x>bg.width+150) sh.vx*=-1; if(sh.y<-150||sh.y>bg.height+150) sh.vy*=-1; });
      gctx.globalAlpha=1; requestAnimationFrame(loop);
    })();
  }

  // ===== GAME AMBIENT BACKGROUND (aurora blobs) =====
  const aurora = [];
  function initAurora(){
    aurora.length = 0;
    const count = 5;
    for(let i=0;i<count;i++){
      aurora.push({
        x: Math.random()*fx.width, y: Math.random()*fx.height,
        r: (120 + Math.random()*240) * DPR,
        vx: (-0.4 + Math.random()*0.8) * DPR,
        vy: (-0.4 + Math.random()*0.8) * DPR,
        hue: Math.floor(Math.random()*360)
      });
    }
  }

  // ===== LAYOUT =====
  function sizeToScreen(){
    const W=Math.min(window.innerWidth,720)-32;
    const H=Math.max(320,window.innerHeight*0.42);
    const side=Math.min(W,H);
    const cell=Math.floor(side/BOARD_SIZE);
    const px=cell*BOARD_SIZE;
    canvas.style.width=px+'px'; canvas.style.height=px+'px';
    fx.style.width=px+'px'; fx.style.height=px+'px';
    canvas.width=Math.floor(px*DPR); canvas.height=Math.floor(px*DPR);
    fx.width=canvas.width; fx.height=canvas.height;
    state.cell=Math.floor(px/BOARD_SIZE);
    initAurora();
    draw();
  }
  addEventListener('resize', sizeToScreen, {passive:true});

  // ===== GRID/PIECES =====
  function createGrid(){ return Array.from({length:BOARD_SIZE},()=>Array(BOARD_SIZE).fill(0)); }
  function createObstaclesGrid(density=0.10, rngLike=null){
    const g=createGrid(); const R=rngLike||{next:Math.random};
    for(let y=0;y<BOARD_SIZE;y++){
      for(let x=0;x<BOARD_SIZE;x++){
        const centerDist=Math.hypot(x-5,y-5); if(centerDist<2) continue;
        const r=rngLike?R.next():Math.random(); if(r<density) g[y][x]=-1;
      }
    }
    return g;
  }
  const SHAPES = [
    [[0,0]], [[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[1,0],[2,0],[3,0]],
    [[0,0],[1,0],[2,0],[3,0],[4,0]],
    [[0,0],[0,1]], [[0,0],[0,1],[0,2]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[0,1],[0,2],[0,3],[0,4]],
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1],[2,1]],
    [[0,0],[1,0],[2,0],[0,1]],
    [[0,0],[1,0],[2,0],[0,1],[0,2]],
    [[0,0],[1,0],[2,0],[1,1]],
  ];
  function newPiece(){
    const shape=SHAPES[Math.floor(rnd()*SHAPES.length)];
    const color=COLORS[Math.floor(rnd()*COLORS.length)];
    const minx=Math.min(...shape.map(b=>b[0])); const miny=Math.min(...shape.map(b=>b[1]));
    const blocks=shape.map(([x,y])=>[x-minx,y-miny]);
    const w=Math.max(...blocks.map(b=>b[0]))+1; const h=Math.max(...blocks.map(b=>b[1]))+1;
    return {blocks,w,h,color,placed:false,id:Math.random().toString(36).slice(2)};
  }
  function rotatePiece(p){
    const blocks = p.blocks.map(([x,y])=>[y, p.w-1-x]);
    const w = p.h, h = p.w;
    return {...p, blocks, w, h};
  }
  function refillHand(){ state.hand=[newPiece(),newPiece(),newPiece()]; renderTray(); }

  function canPlace(piece,gx,gy){
    for(const [dx,dy] of piece.blocks){
      const x=gx+dx,y=gy+dy;
      if(x<0||y<0||x>=BOARD_SIZE||y>=BOARD_SIZE) return false;
      if(state.grid[y][x]!==0) return false;
    }
    return true;
  }
  function canFitAnywhere(piece){
    for(let y=0;y<=BOARD_SIZE-piece.h;y++){
      for(let x=0;x<=BOARD_SIZE-piece.w;x++){
        if(canPlace(piece,x,y)) return true;
      }
    }
    return false;
  }
  function anyFits(){ return state.hand.some(p => !p.used && canFitAnywhere(p)); }

  function scoreForClear(c){ return c*10 + (c>1 ? (c-1)*5 : 0); }

  // ===== FX / OVERLAYS =====
  const particles = [];
  const scorePopups = [];
  let comboFlash=0, comboFlashText='';
  let pcFlash=0;
  let confetti= [];

  function spawnParticles(cells){
    const s=state.cell, d=DPR;
    cells.forEach(([x,y])=>{
      for(let i=0;i<6;i++){
        particles.push({ x:(x+0.5)*s*d, y:(y+0.5)*s*d, vx:(Math.random()-0.5)*2, vy:(-Math.random()*2-0.5), life:40 });
      }
    });
  }
  function spawnConfettiBurst(){
    const d=DPR;
    for(let i=0;i<80;i++){
      confetti.push({x:fx.width/2, y:fx.height/3, vx:(Math.random()-0.5)*6, vy:(Math.random()*-4-2), life:120, c:COLORS[i%COLORS.length]});
    }
  }

  function drawAurora(){
    // soft background gradient blobs
    fctx.save();
    fctx.globalCompositeOperation = 'source-over';
    // subtle dark base
    const grd = fctx.createLinearGradient(0,0,fx.width,fx.height);
    grd.addColorStop(0,'rgba(8,10,16,0.55)');
    grd.addColorStop(1,'rgba(4,6,10,0.55)');
    fctx.fillStyle = grd;
    fctx.fillRect(0,0,fx.width,fx.height);

    aurora.forEach(b=>{
      b.x += b.vx; b.y += b.vy;
      if(b.x<-200 || b.x>fx.width+200) b.vx*=-1;
      if(b.y<-200 || b.y>fx.height+200) b.vy*=-1;
      const rad = fctx.createRadialGradient(b.x,b.y,0, b.x,b.y,b.r);
      const c1 = `hsla(${b.hue}, 85%, 62%, 0.12)`;
      const c2 = `hsla(${(b.hue+40)%360}, 85%, 62%, 0.06)`;
      rad.addColorStop(0, c1);
      rad.addColorStop(1, c2);
      fctx.fillStyle = rad;
      fctx.beginPath();
      fctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      fctx.fill();
    });
    fctx.restore();
  }

  function tickFX(){
    // pozadina
    fctx.clearRect(0,0,fx.width,fx.height);
    drawAurora();

    // particles
    fctx.fillStyle='#ffffffaa';
    particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.life--;
      fctx.globalAlpha=Math.max(0,p.life/40);
      fctx.beginPath(); fctx.arc(p.x,p.y,2,0,Math.PI*2); fctx.fill();
    });
    for(let i=particles.length-1;i>=0;i--) if(particles[i].life<=0) particles.splice(i,1);

    // confetti (best)
    confetti.forEach(c=>{
      c.x+=c.vx; c.y+=c.vy; c.vy+=0.06; c.life--;
      fctx.globalAlpha = Math.max(0, c.life/120);
      fctx.fillStyle = c.c;
      fctx.fillRect(c.x, c.y, 3*DPR, 6*DPR);
    });
    for(let i=confetti.length-1;i>=0;i--) if(confetti[i].life<=0) confetti.splice(i,1);

    // score popups
    fctx.globalAlpha=1;
    scorePopups.forEach(p=>{ p.y-=0.4; p.life--; const a=Math.max(0,p.life/40); fctx.globalAlpha=a; fctx.font=`${Math.max(12,12*DPR)}px system-ui,sans-serif`; fctx.textAlign='center'; fctx.fillStyle='#ffffff'; fctx.fillText(p.txt, p.x, p.y); });
    for(let i=scorePopups.length-1;i>=0;i--) if(scorePopups[i].life<=0) scorePopups.splice(i,1);

    // combo timer
    if(state.comboTimer>0){ state.comboTimer--; if(state.comboTimer<=0) state.combo=0; }

    // big combo overlay
    if(comboFlash>0 && state.combo>1 && comboFlashText){
      const total=48, t=Math.max(0,Math.min(1,comboFlash/total));
      const alpha=Math.min(0.22,0.22*t);
      const cx=fx.width/2, cy=fx.height/2;
      const base=Math.max(canvas.width,canvas.height);
      const fontSize=Math.max(48*DPR, base*0.16);
      fctx.save();
      fctx.globalAlpha=alpha; fctx.textAlign='center'; fctx.textBaseline='middle';
      fctx.font=`800 ${fontSize}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
      fctx.fillStyle='#000';
      for(let i=0;i<6;i++){ fctx.globalAlpha=alpha*(0.18+i*0.08); fctx.fillText(comboFlashText, cx+i*2, cy+i*2); }
      fctx.globalAlpha=alpha*0.75; fctx.fillStyle='#ffffff14'; fctx.fillText(comboFlashText, cx, cy);
      fctx.restore();
      comboFlash--;
    }

    // perfect clear flash
    if(pcFlash>0){
      const alpha = Math.min(0.35, pcFlash/40 * 0.35);
      fctx.fillStyle = `rgba(255,255,255,${alpha})`;
      fctx.fillRect(0,0,fx.width,fx.height);
      pcFlash--;
    }

    requestAnimationFrame(tickFX);
  }
  tickFX();

  // ===== DRAW HELPERS =====
  function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); r=Math.min(r,w/2,h/2); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function hexToRgb(hex){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim()); if(!m) return {r:91,g:140,b:255}; return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)}; }
  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function adjustColor(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r+(255-r)*amt),0,255); const ng=clamp(Math.round(g+(255-g)*amt),0,255); const nb=clamp(Math.round(b+(255-b)*amt),0,255); return `rgb(${nr},${ng},${nb})`; }
  function darkenColor(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r*(1-amt)),0,255); const ng=clamp(Math.round(g*(1-amt)),0,255); const nb=clamp(Math.round(b*(1-amt)),0,255); return `rgb(${nr},${ng},${nb})`; }

  // 3D blok: jači bevel + specular + pod-senka
  function drawBlock3D(ctx,x,y,s,color,{alpha=1, hover=false}={}){
    ctx.save();
    ctx.globalAlpha = alpha;

    // pod-senka (cast shadow)
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(ctx, x+2, y+3, s-3, s-2, Math.max(6, s*0.18));
    ctx.fill();

    // telo
    roundRect(ctx, x+1, y+1, s-2, s-2, Math.max(6, s*0.2));
    const body = ctx.createLinearGradient(x, y, x, y+s);
    body.addColorStop(0, adjustColor(color, 0.20));
    body.addColorStop(0.55, color);
    body.addColorStop(1, darkenColor(color, 0.25));
    ctx.fillStyle = body;
    ctx.fill();

    // bevel ivice
    // gornja ivica svetlija
    ctx.beginPath();
    ctx.moveTo(x+3, y+3);
    ctx.lineTo(x+s-3, y+3);
    ctx.lineWidth = Math.max(1, s*0.06);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.stroke();

    // donja ivica tamnija
    ctx.beginPath();
    ctx.moveTo(x+3, y+s-3);
    ctx.lineTo(x+s-3, y+s-3);
    ctx.lineWidth = Math.max(1, s*0.08);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.stroke();

    // specular highlight (oval)
    const spec = ctx.createRadialGradient(x+s*0.35, y+s*0.28, 2, x+s*0.30, y+s*0.18, s*0.55);
    spec.addColorStop(0, 'rgba(255,255,255,.55)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.ellipse(x+s*0.35, y+s*0.28, s*0.42, s*0.28, -0.3, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = alpha;

    // tanki border za definiciju
    roundRect(ctx, x+1, y+1, s-2, s-2, Math.max(6, s*0.2));
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = Math.max(1, s*0.06);
    ctx.stroke();

    ctx.restore();
  }
  function drawPlacedCell(ctx,x,y,s){
    const accent=getCss('--accent')||'#5b8cff';
    drawBlock3D(ctx,x,y,s,accent,{alpha:0.98});
  }
  function drawPieceCell(ctx,x,y,s,color,alpha){ drawBlock3D(ctx,x,y,s,color,{alpha}); }

  // ===== PLACE & CLEAR =====
  function place(piece,gx,gy){
    // upis
    for(const [dx,dy] of piece.blocks){ state.grid[gy+dy][gx+dx]=1; }

    // puni redovi/kolone (obstacles -1 blokiraju)
    const fullRows=[], fullCols=[];
    for(let y=0;y<BOARD_SIZE;y++){
      let ok=true; for(let x=0;x<BOARD_SIZE;x++){ if(state.grid[y][x]!==1){ ok=false; break; } }
      if(ok) fullRows.push(y);
    }
    for(let x=0;x<BOARD_SIZE;x++){
      let ok=true; for(let y=0;y<BOARD_SIZE;y++){ if(state.grid[y][x]!==1){ ok=false; break; } }
      if(ok) fullCols.push(x);
    }
    const cleared = fullRows.length + fullCols.length;

    // clear + FX
    if(cleared>0){
      const clearedCells=[];
      for(const r of fullRows){ for(let x=0;x<BOARD_SIZE;x++){ clearedCells.push([x,r]); } state.grid[r]=Array(BOARD_SIZE).fill(0); }
      for(const c of fullCols){ for(let y=0;y<BOARD_SIZE;y++){ clearedCells.push([c,y]); state.grid[y][c]=0; } }
      spawnParticles(clearedCells);
      trayEl.classList.add('neon-glow'); setTimeout(()=> trayEl.classList.remove('neon-glow'), 180);
      beep(660,0.08); hapt(25);
    } else { beep(420,0.05); hapt(12); }

    // Time bonus
    if (settings.mode==='time' && cleared>0){
      const add = cleared===1?3 : cleared===2?6 : 10;
      state.timeLeft = Math.min(state.timeLeft + add, 120);
      showToast(`+${add}s`);
      updateTimePill();
    }

    // Combo & score
    const baseGain=piece.blocks.length, clearBonus=scoreForClear(cleared);
    let comboMult=1;
    if(cleared>0){
      state.combo=Math.min(state.combo+1,9); state.comboTimer=COMBO_WINDOW; comboMult=Math.max(1,state.combo);
      comboFlash=48; comboFlashText=`x${comboMult}`;
      if(comboMult>=4){ trayEl.classList.add('neon-glow'); setTimeout(()=> trayEl.classList.remove('neon-glow'), 260); }
    } else { state.combo=0; }
    const gainNow=(baseGain+clearBonus)*comboMult;
    state.score+=gainNow; scoreEl.textContent=state.score;

    // Score popup
    const cx=(gx+piece.w/2)*state.cell*DPR, cy=(gy+piece.h/2)*state.cell*DPR;
    scorePopups.push({x:cx,y:cy,txt:(cleared>0&&comboMult>1)?`+${gainNow} x${comboMult}`:`+${gainNow}`,life:40});

    // Perfect Clear bonus
    if(isBoardEmpty()){
      state.score+=50; scoreEl.textContent=state.score;
      pcFlash=40; showToast('✨ Perfect Clear +50'); beep(880,0.1);
      achievementTick('perfect');
    }

    // mark used
    piece.placed=true;
    state.hand = state.hand.map(p => p.id===piece.id ? {...p, used:true} : p);
    renderTray();

    // Survival: posle poteza garbage red
    if(settings.mode==='survival'){ addGarbageRow(); }

    // refill hand
    if(state.hand.every(p=>p.used)) refillHand();

    // Best glow + confetti
    if(state.score>state.best){
      state.best=state.score; LS('bp10.best', String(state.best)); bestEl.textContent=state.best;
      bestEl.parentElement.classList.add('best-glow'); setTimeout(()=>bestEl.parentElement.classList.remove('best-glow'), 500);
      spawnConfettiBurst();
      achievementTick('newbest');
    }

    // Achievements tick
    if(cleared>=2) achievementTick('clear2');
    if(state.combo>=3) achievementTick('combo3');

    // kraj?
    if(!anyFits()){
      if(settings.mode==='zen'){
        showToast('Zen: nema poteza — reshuffle ruke');
        shuffleHand(); renderTray();
      } else {
        endTimeMode();
        goStats.textContent = `Score: ${state.score} • Best: ${state.best}`;
        gameOver.style.display='flex';
        beep(220,0.15); hapt(40);
      }
    }

    draw();
  }

  function isBoardEmpty(){
    for(let y=0;y<BOARD_SIZE;y++) for(let x=0;x<BOARD_SIZE;x++) if(state.grid[y][x]===1) return false;
    return true;
  }
  function addGarbageRow(){
    for(let y=BOARD_SIZE-1;y>0;y--) state.grid[y]=state.grid[y-1].slice();
    const row=Array(BOARD_SIZE).fill(-1);
    const holes = 2 + Math.floor(Math.random()*2);
    for(let i=0;i<holes;i++){ row[Math.floor(Math.random()*BOARD_SIZE)] = 0; }
    state.grid[0]=row;
  }

  // ===== RENDER BOARD =====
  function draw(){
    const s=state.cell; const d=DPR;
    ctx.save(); ctx.scale(d,d);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    roundRect(ctx,0,0,s*BOARD_SIZE,s*BOARD_SIZE,16); ctx.fillStyle=getCss('--grid'); ctx.fill();

    for(let y=0;y<BOARD_SIZE;y++){
      for(let x=0;x<BOARD_SIZE;x++){
        const px=x*s, py=y*s, v=state.grid[y][x];
        if(v===-1){
          roundRect(ctx,px+1,py+1,s-2,s-2,8);
          const g=ctx.createLinearGradient(px,py,px,py+s); g.addColorStop(0,'#2a2f3a'); g.addColorStop(1,'#1b1f28');
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1; ctx.stroke();
          continue;
        }
        if(v===1){ drawPlacedCell(ctx,px,py,s); }
        else { roundRect(ctx,px+1,py+1,s-2,s-2,8); ctx.fillStyle=getCss('--cell'); ctx.fill(); }
      }
    }

    if(state.dragging){
      const {piece,gx,gy,valid}=state.dragging;
      if(gx!=null&&gy!=null){
        for(const [dx,dy] of piece.blocks){
          const x=(gx+dx)*s, y=(gy+dy)*s;
          if(valid){ drawPieceCell(ctx,x,y,s,piece.color,0.94); }
          else { drawBlock3D(ctx,x,y,s,'#7a2c2c',{alpha:0.55}); }
        }
      }
    }
    ctx.restore();
  }
  function getCss(v){ return getComputedStyle(document.body).getPropertyValue(v); }

  // ===== POINTER =====
  const POINTER={x:0,y:0,active:false,fromSlotIndex:null};
  function canvasPos(e){
    const rect=canvas.getBoundingClientRect();
    const x=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
    const y=(e.touches?e.touches[0].clientY:e.clientY)-rect.top;
    return {x,y};
  }
  function startDrag(e){
    if(state.using==='hammer'){ showToast('Tapni na tablu da razbiješ ćeliju'); return; }
    const target=e.currentTarget.closest('.slot');
    const idx=Number(target.dataset.index);
    const piece=state.hand[idx];
    if(!piece||piece.used) return;
    POINTER.active=true; POINTER.fromSlotIndex=idx;
    state.dragging={piece,gx:null,gy:null,valid:false};
    target.classList.add('used');
  }
  function moveDrag(e){
    if(!POINTER.active||!state.dragging) return;
    const {x,y}=canvasPos(e); const s=state.cell;
    const gx=Math.floor(x/s), gy=Math.floor(y/s);
    if(gx>=0&&gy>=0&&gx<=BOARD_SIZE-state.dragging.piece.w&&gy<=BOARD_SIZE-state.dragging.piece.h){
      const valid=canPlace(state.dragging.piece,gx,gy);
      state.dragging.gx=gx; state.dragging.gy=gy; state.dragging.valid=valid;
    } else { state.dragging.gx=null; state.dragging.gy=null; state.dragging.valid=false; }
    draw();
  }
  function endDrag(){
    if(!POINTER.active||!state.dragging) return;
    const d=state.dragging;
    const slot=trayEl.querySelector(`.slot[data-index="${POINTER.fromSlotIndex}"]`);
    POINTER.active=false;
    if(d.valid && d.gx!=null && d.gy!=null){ place(d.piece,d.gx,d.gy); }
    else { if(slot) slot.classList.remove('used'); }
    state.dragging=null;
  }
  canvas.addEventListener('touchmove', moveDrag,{passive:false});
  canvas.addEventListener('mousemove', moveDrag);
  window.addEventListener('touchend', endDrag);
  window.addEventListener('mouseup', endDrag);

  // ===== TRAY =====
  function renderTray(){
    trayEl.innerHTML='';
    state.hand.forEach((p,i)=>{
      const div=document.createElement('div');
      const fits=canFitAnywhere(p);
      div.className='slot'+(p.used?' used':'')+(p.used?'':(fits?' good':' bad'));
      div.dataset.index=String(i);
      const mini=pieceToCanvas(p);
      div.appendChild(mini);
      if(!p.used){
        div.title = fits? 'Može se postaviti' : 'Nema mesta';
        div.addEventListener('touchstart',(e)=>{startDrag(e);e.preventDefault();},{passive:false});
        div.addEventListener('mousedown',startDrag);
      }
      trayEl.appendChild(div);
    });
  }
  function pieceToCanvas(piece){
    const scale=18, pad=6;
    const w=piece.w*scale+pad*2, h=piece.h*scale+pad*2;
    const c=document.createElement('canvas');
    c.width=w*DPR; c.height=h*DPR; c.style.width=w+'px'; c.style.height=h+'px';
    const cx=c.getContext('2d'); cx.scale(DPR,DPR);
    cx.fillStyle='#10131b33'; roundRect(cx,0,0,w,h,12); cx.fill();
    for(const [dx,dy] of piece.blocks){
      const x=pad+dx*scale, y=pad+dy*scale;
      drawPieceCell(cx,x+1,y+1,scale-2,piece.color,1);
    }
    return c;
  }

  // ===== POWER-UPS & ACTIONS =====
  const btnRotate = document.getElementById('btnRotate');
  const btnHammer = document.getElementById('btnHammer');
  const btnShuffle = document.getElementById('btnShuffle');
  const btnBomb = document.getElementById('btnBomb');
  const cntHammer = document.getElementById('cntHammer');
  const cntShuffle = document.getElementById('cntShuffle');
  const cntBomb = document.getElementById('cntBomb');

  function updatePowerupCounters(){
    if(cntHammer) cntHammer.textContent = state.powerups.hammer;
    if(cntShuffle) cntShuffle.textContent = state.powerups.shuffle;
    if(cntBomb) cntBomb.textContent = state.powerups.bomb;
  }
  function shuffleHand(){
    if(state.hand.some(p=>!p.used)){
      state.hand = state.hand.map(p=> p.used ? p : newPiece());
      renderTray(); showToast('Shuffle!'); beep(520,0.08);
      achievementTick('usePower');
    }
  }
  function bombClear(){
    const cells=[];
    for(let y=0;y<BOARD_SIZE;y++) for(let x=0;x<BOARD_SIZE;x++) if(state.grid[y][x]===1) cells.push([x,y]);
    spawnParticles(cells);
    state.grid = createGrid();
    pcFlash=28; draw();
    showToast('💥 Bomb: full clear!'); beep(200,0.1); setTimeout(()=>beep(180,0.1), 90);
    achievementTick('usePower');
  }

  if(btnRotate) btnRotate.addEventListener('click', ()=>{
    if(settings.mode!=='arcade'){ showToast('Rotate je deo Arcade moda'); return; }
    const idx = state.hand.findIndex(p=>!p.used);
    if(idx===-1){ showToast('Nema aktivnog komada'); return; }
    state.hand[idx] = rotatePiece(state.hand[idx]);
    renderTray(); showToast('Rotate');
  });
  if(btnHammer) btnHammer.addEventListener('click', ()=>{
    if(state.powerups.hammer<=0){ showToast('Nema više čekića'); return; }
    state.using = state.using==='hammer'? null : 'hammer';
    showToast(state.using==='hammer'?'Hammer ON — tapni ćeliju':'Hammer OFF');
  });
  if(btnShuffle) btnShuffle.addEventListener('click', ()=>{
    if(state.powerups.shuffle<=0){ showToast('Nema više shuffle-a'); return; }
    shuffleHand(); state.powerups.shuffle=Math.max(0,state.powerups.shuffle-1); updatePowerupCounters();
  });
  if(btnBomb) btnBomb.addEventListener('click', ()=>{
    if(state.powerups.bomb<=0){ showToast('Nema više bombi'); return; }
    bombClear(); state.powerups.bomb=Math.max(0,state.powerups.bomb-1); updatePowerupCounters();
  });

  // Hammer klik na tablu
  canvas.addEventListener('click', (e)=>{
    if(state.using!=='hammer') return;
    const {x,y}=canvasPos(e); const gx=Math.floor(x/state.cell), gy=Math.floor(y/state.cell);
    if(gx>=0 && gy>=0 && gx<BOARD_SIZE && gy<BOARD_SIZE){
      if(state.grid[gy][gx]===1){
        state.grid[gy][gx]=0; draw();
        state.using=null; state.powerups.hammer=Math.max(0,state.powerups.hammer-1); updatePowerupCounters();
        showToast('Razbijeno!'); beep(300,0.06); hapt(15);
        achievementTick('usePower');
      } else {
        showToast('Nema šta da se razbije ovde');
      }
    }
  });

  // ===== TOAST =====
  let toastTimer=null;
  function showToast(msg){
    let t=document.getElementById('toast');
    if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);
      Object.assign(t.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',background:'#10131b',color:'#e8ecf1',padding:'10px 14px',borderRadius:'12px',boxShadow:'0 10px 30px rgba(0,0,0,.3)',zIndex:99,transition:'opacity .25s',opacity:'0'}); }
    t.textContent=msg; t.style.opacity='1'; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.style.opacity='0'; }, 1600);
  }

  // ===== CONTROLS =====
  resetBtn.addEventListener('click', ()=> newGame());
  backBtn.addEventListener('click', ()=> goHome());

  // Settings
  settingsBtn.addEventListener('click', ()=> settingsModal.style.display='flex');
  closeSettings.addEventListener('click', ()=> settingsModal.style.display='none');
  settingsModal.querySelector('.backdrop').addEventListener('click', ()=> settingsModal.style.display='none');
  setTheme.addEventListener('click', ()=>{ settings.theme=settings.theme==='dark'?'light':'dark'; LS('bp10.theme',settings.theme); applyTheme(settings.theme); });
  setSound.addEventListener('click', ()=>{ settings.sound=!settings.sound; LS('bp10.sound', settings.sound?'1':'0'); updateSoundLabel(); });

  // === Mode rotacija (bez "dnevnih misija" u classic) ===
  setMode.addEventListener('click', ()=>{
    const order=['classic','daily','obstacles','time','arcade','survival','zen','puzzle'];
    const idx=order.indexOf(settings.mode); settings.mode=order[(idx+1)%order.length];
    LS('bp10.mode',settings.mode); updateModeLabel(); showToast(`Mode: ${settings.mode}`);
  });

  resetBest.addEventListener('click', ()=>{ localStorage.removeItem('bp10.best'); state.best=0; bestEl.textContent=0; showToast('Best resetovan'); });
  runTestsBtn.addEventListener('click', ()=>{ const {passed,failed}=runTests(); showToast(`Testovi: ${passed} ✅ / ${failed} ❌`); });

  // Start
  startClassic.addEventListener('click', ()=> startGame('classic'));
  startDaily.addEventListener('click', ()=> startGame('daily'));
  function startGame(mode){
    settings.mode=mode; LS('bp10.mode',mode);
    rng=(mode==='daily')? new RNG(todaySeed()) : null;
    startScreen.style.display='none'; app.style.display='flex';
    if(!settings.onboarded) onboarding.style.display='flex';
    sizeToScreen(); newGame();
  }
  function goHome(){
    endTimeMode();
    app.style.display='none'; startScreen.style.display='flex';
    gameOver.style.display='none'; onboarding.style.display='none';
    state.dragging=null;
  }
  skipOnb.addEventListener('click', ()=> onboarding.style.display='none');
  startOnb.addEventListener('click', ()=>{ onboarding.style.display='none'; settings.onboarded=true; LS('bp10.onboarded','1'); });
  playAgain.addEventListener('click', ()=>{ gameOver.style.display='none'; newGame(); });
  goMenu.addEventListener('click', ()=>{ gameOver.style.display='none'; goHome(); });

  // ===== LABELS/THEME/HUD =====
  function updateModeLabel(){
    const m=settings.mode;
    setMode.textContent = (m==='daily'?'Daily': m==='obstacles'?'Obstacles': m==='time'?'Time': m==='arcade'?'Arcade': m==='survival'?'Survival': m==='zen'?'Zen': m==='puzzle'?'Puzzle':'Classic');
  }
  function updateSoundLabel(){ setSound.textContent = (settings.sound?'🔈 On':'🔇 Off'); }
  function applyTheme(t){ document.body.classList.toggle('light', t==='light'); }

  // Time bedž
  let timePill=null, timerId=null;
  function ensureTimePill(){ if(!timePill){ timePill=document.createElement('div'); timePill.className='pill'; hud && hud.appendChild(timePill); } timePill.style.display='inline-flex'; updateTimePill(); }
  function hideTimePill(){ if(timePill) timePill.style.display='none'; }
  function updateTimePill(){ if(settings.mode==='time' && timePill) timePill.textContent=`Time: ${Math.max(0,state.timeLeft)}s`; }

  function endTimeMode(){ if(timerId){ clearInterval(timerId); timerId=null; } }

  // ===== ACHIEVEMENTS (zamenjuju dnevne misije) =====
  const ACH = [
    {id:'clear2',  title:'Double Clean', desc:'Očisti 2 linije u jednom potezu', done:false},
    {id:'combo3',  title:'Combo Starter', desc:'Dostigni combo x3', done:false},
    {id:'perfect', title:'Perfect!', desc:'Uradi Perfect Clear', done:false},
    {id:'usePower',title:'Taktičar', desc:'Iskoristi bilo koji power-up', done:false},
    {id:'newbest', title:'Nova zvezda', desc:'Obori lični rekord', done:false}
  ];
  function loadAchievements(){
    const saved = JSON.parse(LS('bp10.ach')||'null');
    if(saved && Array.isArray(saved)){
      ACH.forEach(a=>{ const f=saved.find(x=>x.id===a.id); if(f) a.done=!!f.done; });
    }
  }
  function saveAchievements(){ LS('bp10.ach', JSON.stringify(ACH)); }
  function achievementTick(id){
    const a = ACH.find(x=>x.id===id);
    if(a && !a.done){
      a.done = true; saveAchievements();
      showToast(`🏆 Achievement: ${a.title}`);
    }
  }

  // Achievements panel u Settings (tab ispod)
  let achOverlay = null;
  function ensureAchOverlay(){
    if(achOverlay) return;
    achOverlay = document.createElement('div');
    achOverlay.className = 'overlay';
    achOverlay.style.zIndex = '14';
    achOverlay.innerHTML = `
      <div class="backdrop"></div>
      <div class="panel">
        <h3>🏆 Achievements</h3>
        <ul id="achList" style="list-style:none; padding:0; margin:8px 0; display:grid; gap:6px"></ul>
        <div style="text-align:right; margin-top:8px">
          <button id="closeAch" class="btn">Zatvori</button>
        </div>
      </div>`;
    document.body.appendChild(achOverlay);
    achOverlay.querySelector('.backdrop').addEventListener('click', ()=> achOverlay.style.display='none');
    achOverlay.querySelector('#closeAch').addEventListener('click', ()=> achOverlay.style.display='none');
  }
  function renderAchievements(){
    ensureAchOverlay();
    const list = achOverlay.querySelector('#achList');
    list.innerHTML = '';
    ACH.forEach(a=>{
      const li = document.createElement('li');
      li.style.display='flex'; li.style.alignItems='center'; li.style.gap='8px';
      li.style.color = a.done ? 'var(--good)' : 'var(--muted)';
      li.innerHTML = `<span>${a.done?'✅':'⬜️'}</span><div><div style="font-weight:700">${a.title}</div><div style="opacity:.8">${a.desc}</div></div>`;
      list.appendChild(li);
    });
  }
  // Dugme u Settings panelu (dinamički)
  (function injectAchievementsRow(){
    const panel = settingsModal.querySelector('.panel');
    if(!panel) return;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span>Dostignuća</span><button id="openAch" class="btn">Prikaži</button>`;
    panel.insertBefore(row, panel.querySelector('.row:last-of-type'));
    panel.querySelector('#openAch').addEventListener('click', ()=>{
      loadAchievements(); renderAchievements(); ensureAchOverlay(); achOverlay.style.display='flex';
    });
  })();

  // ===== NEW GAME (sa odvojenim Classic bez misija) =====
  function newGame(){
    endTimeMode();
    // grid po modu
    if(settings.mode==='obstacles'){ const r=rng||{next:Math.random}; state.grid=createObstaclesGrid(0.10, r); }
    else if(settings.mode==='puzzle'){ state.grid = puzzleLevelGrid(0); state.puzzleIndex=0; }
    else { state.grid=createGrid(); }

    state.score=0; scoreEl.textContent=0;
    state.hand=[]; state.combo=0; state.comboTimer=0;
    state.powerups={hammer:1, shuffle:1, bomb:1};
    state.using=null; comboFlash=0; comboFlashText=''; pcFlash=0; confetti.length=0;
    updatePowerupCounters();
    refillHand(); draw();

    // timers
    if(settings.mode==='time'){
      state.timeLeft=60; ensureTimePill(); updateTimePill();
      timerId=setInterval(()=>{ state.timeLeft--; updateTimePill(); if(state.timeLeft<=0){ endTimeMode(); goStats.textContent=`Score: ${state.score} • Best: ${state.best}`; gameOver.style.display='flex'; } },1000);
    } else { hideTimePill(); }

    // arcade flag
    state.arcadeRotate = (settings.mode==='arcade');

    // survival reset
    state.turns = 0;

    // nema dnevnih misija u classic (uopšte ne prikazujemo nikakav banner)
    // achievements su u Settings tabu

    loadAchievements();

    showToast(settings.mode==='daily'?'Daily Challenge': settings.mode==='obstacles'?'Obstacles': settings.mode==='time'?'Time Attack': settings.mode==='arcade'?'Arcade (Rotate)': settings.mode==='survival'?'Survival': settings.mode==='zen'?'Zen': settings.mode==='puzzle'?'Puzzle Pack':'Classic');
  }

  function puzzleLevelGrid(i){
    const g=createGrid();
    for(let x=0;x<BOARD_SIZE;x++){ g[0][x]=-1; g[BOARD_SIZE-1][x]=-1; }
    for(let y=0;y<BOARD_SIZE;y++){ g[y][0]=-1; g[y][BOARD_SIZE-1]=-1; }
    g[4][4]=-1; g[5][5]=-1; g[4][6]=-1; g[6][4]=-1;
    return g;
  }

  // ===== TESTS (sanity) =====
  function runTests(){
    const results=[]; const log=(n,ok,info='')=>{ results.push({n,ok}); (ok?console.log:console.error)(`[TEST] ${n}: ${ok?'PASS':'FAIL'} ${info}`); };
    try{
      log('anyFits defined', typeof anyFits==='function');
      const p={blocks:[[0,0],[1,0]], w:2,h:1,color:'#fff',id:'t'};
      log('canPlace rejects OOB', canPlace(p,-1,0)===false);
      state.grid=createGrid(); for(let x=0;x<BOARD_SIZE-1;x++) state.grid[0][x]=1;
      const s0=state.score; place({blocks:[[0,0]],w:1,h:1,color:'#fff',id:'t2'},9,0);
      log('row clear adds points', state.score>s0);
    }catch(e){ console.error(e); }
    return {passed:results.filter(r=>r.ok).length, failed:results.filter(r=>!r.ok).length};
  }

  // ===== UTILS =====
  function getCss(v){ return getComputedStyle(document.body).getPropertyValue(v); }

  // ===== INIT BUTTONS & LOOPS =====
  requestAnimationFrame(()=>{ /* FX loop started already */ });

})();
