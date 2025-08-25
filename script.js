(function(){
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const canvas = document.getElementById('game');
  const ctx = canvas?.getContext('2d', { alpha: true });
  const fx = document.getElementById('fx');
  const fctx = fx?.getContext('2d', { alpha: true });

  const app = document.getElementById('app');
  const startScreen = document.getElementById('startScreen');

  const trayEl = document.getElementById('tray');
  const scoreEl = document.getElementById('score');
  const bestEl  = document.getElementById('best');
  const hud     = document.querySelector('.hud');

  const resetBtn   = document.getElementById('reset');
  const backBtn    = document.getElementById('backBtn');

  const settingsBtn   = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const setTheme      = document.getElementById('setTheme');
  const setSound      = document.getElementById('setSound');
  const setMode       = document.getElementById('setMode');
  const resetBest     = document.getElementById('resetBest');
  const closeSettings = document.getElementById('closeSettings');
  const runTestsBtn   = document.getElementById('runTests');

  const onboarding = document.getElementById('onboarding');
  const skipOnb    = document.getElementById('skipOnb');
  const startOnb   = document.getElementById('startOnb');

  const gameOver = document.getElementById('gameOver');
  const goStats  = document.getElementById('goStats');
  const playAgain= document.getElementById('playAgain');
  const goMenu   = document.getElementById('goMenu');

  const startClassic = document.getElementById('startClassic');
  const achMenuBtn   = document.getElementById('achBtn');
  const ghost        = document.getElementById('ghost');

  // Optional action bar hooks
  const btnRotate = document.getElementById('btnRotate');
  const btnHammer = document.getElementById('btnHammer');
  const btnShuffle= document.getElementById('btnShuffle');
  const btnBomb   = document.getElementById('btnBomb');
  const cntHammer = document.getElementById('cntHammer');
  const cntShuffle= document.getElementById('cntShuffle');
  const cntBomb   = document.getElementById('cntBomb');

  const BOARD_SIZE = 10;
  const COLORS = ['#76b3ff','#7ad37a','#ffd166','#f17fb5','#6ee7f0','#c9a6ff','#ffb86b','#8ecae6'];
  const COMBO_WINDOW = 360;

  const LS = (k,v)=> (v===undefined ? localStorage.getItem(k) : localStorage.setItem(k, v));
  const settings = {
    theme: LS('bp10.theme') || 'dark',
    sound: LS('bp10.sound')!==null ? LS('bp10.sound')==='1' : true,
    mode:  LS('bp10.mode') || 'classic',
    onboarded: LS('bp10.onboarded')==='1'
  };
  applyTheme(settings.theme);
  updateSoundLabel();
  updateModeLabel();

  function RNG(seed){ this.s = seed>>>0; }
  RNG.prototype.next = function(){ this.s = (this.s*1664525 + 1013904223)>>>0; return this.s/4294967296; };
  let rng = null;
  const rnd = ()=> rng ? rng.next() : Math.random();

  let audioCtx = null;
  function ensureAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } }
  function beep(freq=600, dur=0.06, type='sine', gain=0.18){
    if(!settings.sound) return;
    ensureAudio(); if(!audioCtx) return;
    const t=audioCtx.currentTime, osc=audioCtx.createOscillator(), g=audioCtx.createGain();
    osc.type=type; osc.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(gain,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(t); osc.stop(t+dur);
  }
  const hapt=(ms=15)=>{ if(!settings.sound) return; if(navigator.vibrate) navigator.vibrate(ms); };

  let state = {
    grid: createGrid(),
    cell: 32,
    score: 0, best: Number(LS('bp10.best')||0),
    hand: [], dragging: null,
    combo: 0, comboTimer: 0,
    timeLeft: 0,
    powerups: { hammer:1, shuffle:1, bomb:1 },
    using: null,
    arcadeRotate:false,
    turns: 0,
    puzzleIndex: 0
  };
  if(bestEl) bestEl.textContent = state.best;

  function sizeToScreen(){
    if(!canvas || !ctx) return;
    const headerH = document.querySelector('header')?.offsetHeight || 60;
    const trayH   = trayEl?.offsetHeight || 120;
    const chrome  = 28;
    const availH  = Math.max(240, window.innerHeight - headerH - trayH - chrome);
    const availW  = Math.min(document.documentElement.clientWidth, 720) - 32;
    const side    = Math.max(220, Math.min(availW, availH));
    const cell    = Math.floor(side / BOARD_SIZE);
    const px      = cell * BOARD_SIZE;

    canvas.style.width = px+'px'; canvas.style.height = px+'px';
    if(fx){ fx.style.width = px+'px'; fx.style.height = px+'px'; }

    canvas.width = Math.floor(px * DPR); canvas.height = Math.floor(px * DPR);
    if(fx){ fx.width = Math.floor(px * DPR); fx.height = Math.floor(px * DPR); }

    ctx.setTransform(1,0,0,1,0,0); ctx.scale(DPR, DPR);
    if(fctx){ fctx.setTransform(1,0,0,1,0,0); }

    state.cell = cell;
    requestDraw();
  }
  addEventListener('resize', sizeToScreen, {passive:true});

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
    return {blocks,w,h,color,used:false,id:Math.random().toString(36).slice(2)};
  }
  function rotatePiece(p){
    const blocks = p.blocks.map(([x,y])=>[y, p.w-1-x]);
    return {...p, blocks, w:p.h, h:p.w};
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
  function anyFits(){ return state.hand.some(p=>!p.used && canFitAnywhere(p)); }

  function roundRect(c,x,y,w,h,r){ c.beginPath(); r=Math.min(r,w/2,h/2); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
  function hexToRgb(hex){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim()); if(!m) return {r:91,g:140,b:255}; return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)}; }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function adjustColor(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r+(255-r)*amt),0,255); const ng=clamp(Math.round(g+(255-g)*amt),0,255); const nb=clamp(Math.round(b+(255-b)*amt),0,255); return `rgb(${nr},${ng},${nb})`; }
  function darkenColor(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r*(1-amt)),0,255); const ng=clamp(Math.round(g*(1-amt)),0,255); const nb=clamp(Math.round(b*(1-amt)),0,255); return `rgb(${nr},${ng},${nb})`; }
  function getCss(v){ return getComputedStyle(document.body).getPropertyValue(v); }

  function drawGem(c,x,y,s,baseColor,{alpha=1, placed=false}={}){
    c.save(); c.globalAlpha=alpha;
    c.fillStyle='rgba(0,0,0,.28)';
    roundRect(c,x+2,y+4,s-4,s-3,Math.max(6,s*.18)); c.fill();

    roundRect(c,x+1,y+1,s-2,s-2,Math.max(6,s*.22));
    const body=c.createLinearGradient(x,y, x, y+s);
    body.addColorStop(0.00, adjustColor(baseColor, .35));
    body.addColorStop(0.45, baseColor);
    body.addColorStop(1.00, darkenColor(baseColor, .30));
    c.fillStyle=body; c.fill();

    const facet=c.createLinearGradient(x, y, x+s, y+s);
    facet.addColorStop(0.0, 'rgba(255,255,255,.30)');
    facet.addColorStop(0.5, 'rgba(255,255,255,0)');
    c.save(); c.globalCompositeOperation='overlay';
    roundRect(c,x+1,y+1,s-2,s-2,Math.max(6,s*.22)); c.fillStyle=facet; c.fill();
    c.restore();

    const spec=c.createRadialGradient(x+s*.35,y+s*.25,1, x+s*.25,y+s*.18, s*.65);
    spec.addColorStop(0,'rgba(255,255,255,.65)');
    spec.addColorStop(.35,'rgba(255,255,255,.28)');
    spec.addColorStop(1,'rgba(255,255,255,0)');
    c.globalAlpha=.75; c.fillStyle=spec;
    c.beginPath(); c.ellipse(x+s*.34, y+s*.26, s*.42, s*.28, -0.25, 0, Math.PI*2); c.fill();

    roundRect(c,x+1,y+1,s-2,s-2,Math.max(6,s*.22));
    c.lineWidth=Math.max(1,s*.06);
    c.strokeStyle='rgba(0,0,0,.40)'; c.stroke();

    if(placed){
      roundRect(c,x+1,y+1,s-2,s-2,Math.max(6,s*.22));
      const gold=c.createLinearGradient(x,y,x,y+s);
      gold.addColorStop(0,'rgba(255,215,130,.85)');
      gold.addColorStop(1,'rgba(180,120,30,.55)');
      c.lineWidth=Math.max(1, s*.07); c.strokeStyle=gold; c.stroke();
    }
    c.restore();
  }
  const drawPieceCell = (c,x,y,s,color,alpha)=> drawGem(c,x,y,s,color,{alpha});
  const drawPlacedCell= (c,x,y,s)=> drawGem(c,x,y,s,getCss('--accent')||'#ffd166',{alpha:.98, placed:true});

  function draw(){
    if(!canvas||!ctx) return;
    const s=state.cell;

    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.scale(DPR, DPR);

    // glass panel
    roundRect(ctx,0,0,s*BOARD_SIZE,s*BOARD_SIZE,18);
    const panel=ctx.createLinearGradient(0,0,0,s*BOARD_SIZE);
    panel.addColorStop(0,'rgba(13,16,25,.32)');
    panel.addColorStop(1,'rgba(13,16,25,.42)');
    ctx.fillStyle=panel; ctx.fill();

    roundRect(ctx,1,1,s*BOARD_SIZE-2,s*BOARD_SIZE-2,16);
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1; ctx.stroke();

    // cells
    for(let y=0;y<BOARD_SIZE;y++){
      for(let x=0;x<BOARD_SIZE;x++){
        const px=x*s, py=y*s, v=state.grid[y][x];
        roundRect(ctx,px+1,py+1,s-2,s-2,9);
        if(v===1)      drawPlacedCell(ctx,px,py,s);
        else if(v===-1){
          const g=ctx.createLinearGradient(px,py,px,py+s); g.addColorStop(0,'rgba(255,255,255,.05)'); g.addColorStop(1,'rgba(0,0,0,.22)');
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=1; ctx.stroke();
        } else { ctx.fillStyle='rgba(255,255,255,.03)'; ctx.fill(); }
      }
    }

    // ghost snap na mreži
    if(state.dragging){
      const {piece,gx,gy,valid}=state.dragging;
      if(gx!=null&&gy!=null){
        for(const [dx,dy] of piece.blocks){
          const x=(gx+dx)*s, y=(gy+dy)*s;
          drawPieceCell(ctx,x,y,s, valid?piece.color:'#7a2c2c', valid?0.85:0.55);
        }
      }
    }

    // floating preview IZNAD prsta (pomereno na gore da se vidi cilj)
    if(state.dragging && state.dragging.px!=null){
      const {piece, px, py} = state.dragging;
      const lift = 14; // koliko iznad prsta
      const baseX = px - (piece.w*s)/2;
      const baseY = py - (piece.h*s)/2 - lift;
      for(const [dx,dy] of piece.blocks){
        drawPieceCell(ctx, baseX + dx*s, baseY + dy*s, s, piece.color, 0.28);
      }
    }
  }

  // FX
  const particles=[]; const scorePopups=[]; let comboFlash=0, comboFlashText=''; let pcFlash=0; let confetti=[];
  const rings=[];
  function spawnParticles(cells){
    if(!fx||!fctx) return;
    const s=state.cell, d=DPR;
    for(let i=0;i<cells.length;i++){
      const [x,y]=cells[i];
      for(let j=0;j<6;j++){
        particles.push({ x:(x+0.5)*s*d, y:(y+0.5)*s*d, vx:(Math.random()-0.5)*2, vy:(-Math.random()*2-0.5), life:40 });
      }
    }
  }
  function spawnConfettiBurst(){
    if(!fx) return;
    for(let i=0;i<80;i++){
      confetti.push({x:fx.width/2, y:fx.height/3, vx:(Math.random()-0.5)*6, vy:(Math.random()*-4-2), life:120, c:COLORS[i%COLORS.length]});
    }
  }
  function spawnRing(x,y){
    if(!fx) return;
    rings.push({x:x*state.cell*DPR, y:y*state.cell*DPR, r:0, life:26});
  }
  function stepFX(){
    if(!fx||!fctx){ requestAnimationFrame(stepFX); return; }
    fctx.setTransform(1,0,0,1,0,0);
    fctx.clearRect(0,0,fx.width,fx.height);

    fctx.fillStyle='#ffffffaa';
    for(let i=0;i<particles.length;i++){
      const p=particles[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.life--;
      fctx.globalAlpha=Math.max(0,p.life/40);
      fctx.beginPath(); fctx.arc(p.x,p.y,2,0,Math.PI*2); fctx.fill();
    }
    for(let i=particles.length-1;i>=0;i--) if(particles[i].life<=0) particles.splice(i,1);

    confetti.forEach(c=>{ c.x+=c.vx; c.y+=c.vy; c.vy+=0.06; c.life--; fctx.globalAlpha=Math.max(0,c.life/120); fctx.fillStyle=c.c; fctx.fillRect(c.x,c.y,3*DPR,6*DPR); });
    for(let i=confetti.length-1;i>=0;i--) if(confetti[i].life<=0) confetti.splice(i,1);

    for(let i=0;i<rings.length;i++){
      const r=rings[i];
      r.r += 8*DPR; r.life--;
      const a = Math.max(0, r.life/26);
      fctx.beginPath(); fctx.arc(r.x, r.y, r.r, 0, Math.PI*2);
      fctx.strokeStyle = `rgba(255,215,130,${a*.75})`;
      fctx.lineWidth = Math.max(2*DPR, r.r*0.04);
      fctx.stroke();
    }
    for(let i=rings.length-1;i>=0;i--) if(rings[i].life<=0) rings.splice(i,1);

    fctx.globalAlpha=1;
    for(let i=0;i<scorePopups.length;i++){
      const p=scorePopups[i];
      p.y-=0.4; p.life--;
      const a=Math.max(0,p.life/40);
      fctx.globalAlpha=a;
      fctx.font=`${Math.max(12,12*DPR)}px system-ui,sans-serif`;
      fctx.textAlign='center';
      fctx.fillStyle='rgba(255,215,130,.95)';
      fctx.fillText(p.txt, p.x, p.y);
    }
    for(let i=scorePopups.length-1;i>=0;i--) if(scorePopups[i].life<=0) scorePopups.splice(i,1);

    if(state.comboTimer>0){ state.comboTimer--; if(state.comboTimer<=0) state.combo=0; }
    if(comboFlash>0 && state.combo>1 && comboFlashText){
      const total=48, t=Math.max(0,Math.min(1,comboFlash/total));
      const alpha=Math.min(0.22,0.22*t);
      const cx=fx.width/2, cy=fx.height/2;
      const base=Math.max(canvas.width,canvas.height);
      const fontSize=Math.max(48*DPR, base*0.16);
      fctx.save();
      fctx.globalAlpha=alpha; fctx.textAlign='center'; fctx.textBaseline='middle';
      fctx.font=`800 ${fontSize}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
      fctx.fillStyle='rgba(0,0,0,.85)';
      for(let i=0;i<6;i++){ fctx.globalAlpha=alpha*(0.18+i*0.08); fctx.fillText(comboFlashText, cx+i*2, cy+i*2); }
      fctx.globalAlpha=alpha*0.85; fctx.fillStyle='rgba(255,215,130,.85)'; fctx.fillText(comboFlashText, cx, cy);
      fctx.restore();
      comboFlash--;
    }

    if(pcFlash>0){
      const alpha = Math.min(0.35, pcFlash/40 * 0.35);
      fctx.fillStyle = `rgba(255,255,255,${alpha})`;
      fctx.fillRect(0,0,fx.width,fx.height);
      pcFlash--;
    }
    requestAnimationFrame(stepFX);
  }
  requestAnimationFrame(stepFX);

  function scoreForClear(c){ return c*10 + (c>1 ? (c-1)*5 : 0); }
  function place(piece,gx,gy){
    for(const [dx,dy] of piece.blocks){ state.grid[gy+dy][gx+dx]=1; }
    spawnRing(gx + piece.w/2, gy + piece.h/2);

    const fullRows=[], fullCols=[];
    for(let y=0;y<BOARD_SIZE;y++){ let ok=true; for(let x=0;x<BOARD_SIZE;x++){ if(state.grid[y][x]!==1){ ok=false; break; } } if(ok) fullRows.push(y); }
    for(let x=0;x<BOARD_SIZE;x++){ let ok=true; for(let y=0;y<BOARD_SIZE;y++){ if(state.grid[y][x]!==1){ ok=false; break; } } if(ok) fullCols.push(x); }

    const cleared=fullRows.length+fullCols.length;
    if(cleared>0){
      const cells=[];
      for(const r of fullRows){ for(let x=0;x<BOARD_SIZE;x++){ cells.push([x,r]); } state.grid[r]=Array(BOARD_SIZE).fill(0); }
      for(const c of fullCols){ for(let y=0;y<BOARD_SIZE;y++){ cells.push([c,y]); state.grid[y][c]=0; } }
      spawnParticles(cells);
      trayEl?.classList.add('neon-glow'); setTimeout(()=> trayEl?.classList.remove('neon-glow'), 200);
      beep(760,.08,'triangle',0.22); hapt(28);
    } else { beep(520,.05,'sine',0.16); hapt(12); }

    if (settings.mode==='time' && cleared>0){
      const add = cleared===1?3 : cleared===2?6 : 10;
      state.timeLeft = Math.min(state.timeLeft + add, 120);
      showToast(`+${add}s`); updateTimePill();
    }

    const baseGain=piece.blocks.length, clearBonus=scoreForClear(cleared);
    let comboMult=1;
    if(cleared>0){
      state.combo=Math.min(state.combo+1,9); state.comboTimer=COMBO_WINDOW; comboMult=Math.max(1,state.combo);
      comboFlash=48; comboFlashText=`x${comboMult}`;
    } else state.combo=0;
    const gainNow=(baseGain+clearBonus)*comboMult;
    state.score+=gainNow; if(scoreEl) scoreEl.textContent=state.score;

    if(fx){ const cx=(gx+piece.w/2)*state.cell*DPR, cy=(gy+piece.h/2)*state.cell*DPR; scorePopups.push({x:cx,y:cy,txt:(cleared>0&&comboMult>1)?`+${gainNow} ×${comboMult}`:`+${gainNow}`,life:40}); }

    if(isBoardEmpty()){
      state.score+=50; if(scoreEl) scoreEl.textContent=state.score;
      pcFlash=40; showToast('✨ Perfect Clear +50'); beep(880,0.1,'sawtooth',0.18);
      achievementTick('perfect');
    }

    piece.used=true;
    state.hand = state.hand.map(p => p.id===piece.id ? {...p, used:true} : p);
    renderTray();

    if(settings.mode==='survival'){ addGarbageRow(); }
    if(state.hand.every(p=>p.used)) refillHand();

    if(state.score>state.best){
      state.best=state.score; LS('bp10.best', String(state.best)); if(bestEl) bestEl.textContent=state.best;
      bestEl?.parentElement?.classList.add('best-glow'); setTimeout(()=>bestEl?.parentElement?.classList.remove('best-glow'), 500);
      spawnConfettiBurst(); achievementTick('newbest');
    }
    if(cleared>=2) achievementTick('clear2');
    if(state.combo>=3) achievementTick('combo3');

    if(!anyFits()){
      if(settings.mode==='zen'){ showToast('Zen: nema poteza — reshuffle'); shuffleHand(); renderTray(); }
      else { endTimeMode(); if(goStats) goStats.textContent = `Score: ${state.score} • Best: ${state.best}`; if(gameOver) gameOver.style.display='flex'; beep(220,0.15); hapt(40); }
    }
    requestDraw();
  }

  function isBoardEmpty(){ for(let y=0;y<BOARD_SIZE;y++) for(let x=0;x<BOARD_SIZE;x++) if(state.grid[y][x]===1) return false; return true; }
  function addGarbageRow(){
    for(let y=BOARD_SIZE-1;y>0;y--) state.grid[y]=state.grid[y-1].slice();
    const row=Array(BOARD_SIZE).fill(-1);
    const holes = 2 + Math.floor(Math.random()*2);
    for(let i=0;i<holes;i++){ row[Math.floor(Math.random()*BOARD_SIZE)] = 0; }
    state.grid[0]=row;
  }

  function pieceToCanvas(piece){
    const scale=18, pad=6;
    const w=piece.w*scale+pad*2, h=piece.h*scale+pad*2;
    const c=document.createElement('canvas');
    c.width=w*DPR; c.height=h*DPR; c.style.width=w+'px'; c.style.height=h+'px';
    const cx=c.getContext('2d'); cx.scale(DPR,DPR);
    cx.fillStyle='rgba(0,0,0,.24)'; roundRect(cx,0,0,w,h,12); cx.fill();
    for(const [dx,dy] of piece.blocks){
      const x=pad+dx*scale, y=pad+dy*scale;
      drawPieceCell(cx,x+1,y+1,scale-2,piece.color,1);
    }
    return c;
  }
  function renderTray(){
    if(!trayEl) return;
    trayEl.innerHTML='';
    state.hand.forEach((p,i)=>{
      const div=document.createElement('div');
      const fits=canFitAnywhere(p);
      div.className='slot'+(p.used?' used':'')+(p.used?'':(fits?' good':' bad'));
      div.dataset.index=String(i);
      div.appendChild(pieceToCanvas(p));
      if(!p.used) div.addEventListener('pointerdown', startDragFromSlot, {passive:false});
      trayEl.appendChild(div);
    });
  }

  const POINTER={active:false,fromSlotIndex:null};
  function getCanvasPosFromClient(clientX, clientY){
    const rect=canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }
  function startDragFromSlot(e){
    const target=e.currentTarget;
    const idx=Number(target.dataset.index);
    const piece=state.hand[idx];
    if(!piece||piece.used) return;

    POINTER.active=true; POINTER.fromSlotIndex=idx;
    state.dragging={piece,gx:null,gy:null,valid:false,lastValid:null,px:null,py:null};
    target.classList.add('used');
    try{ target.setPointerCapture && target.setPointerCapture(e.pointerId); }catch(_){}
    document.body.style.cursor='grabbing';
    e.preventDefault(); e.stopPropagation();
  }

  let moveQueued=false, lastMoveEvent=null;
  function onGlobalPointerMoveRaw(e){
    if(!POINTER.active||!state.dragging) return;
    lastMoveEvent=e;
    if(!moveQueued){ moveQueued=true; requestAnimationFrame(processPointerMove); }
  }
  function processPointerMove(){
    moveQueued=false;
    const e=lastMoveEvent; if(!e||!POINTER.active||!state.dragging) return;
    const {x,y}=getCanvasPosFromClient(e.clientX, e.clientY);
    state.dragging.px = x;
    state.dragging.py = y;

    const s=state.cell;
    let gx=Math.floor(x/s), gy=Math.floor(y/s);

    const maxX=BOARD_SIZE - state.dragging.piece.w;
    const maxY=BOARD_SIZE - state.dragging.piece.h;
    if (gx < -0.3) { gx = null; } else if (gx > maxX + 0.3) { gx = null; } else { gx = Math.max(0, Math.min(maxX, gx)); }
    if (gy < -0.3) { gy = null; } else if (gy > maxY + 0.3) { gy = null; } else { gy = Math.max(0, Math.min(maxY, gy)); }

    if(gx!=null && gy!=null){
      const valid = canPlace(state.dragging.piece,gx,gy);
      state.dragging.gx=gx; state.dragging.gy=gy; state.dragging.valid=valid;
      if(valid) state.dragging.lastValid={gx,gy};
    } else {
      if(state.dragging.lastValid){
        state.dragging.gx=state.dragging.lastValid.gx;
        state.dragging.gy=state.dragging.lastValid.gy;
        state.dragging.valid=true;
      } else {
        state.dragging.gx=null; state.dragging.gy=null; state.dragging.valid=false;
      }
    }
    requestDraw();
  }

  function onGlobalPointerUp(){
    if(!POINTER.active||!state.dragging) return;
    const d=state.dragging;
    const slot=trayEl?.querySelector(`.slot[data-index="${POINTER.fromSlotIndex}"]`);
    POINTER.active=false; document.body.style.cursor='';

    if(d.valid && d.gx!=null && d.gy!=null){ place(d.piece,d.gx,d.gy); }
    else { if(slot) slot.classList.remove('used'); }
    state.dragging=null;
  }
  window.addEventListener('pointermove', onGlobalPointerMoveRaw, {passive:false});
  window.addEventListener('pointerup', onGlobalPointerUp, {passive:true});
  window.addEventListener('pointercancel', onGlobalPointerUp, {passive:true});

  function updatePowerupCounters(){
    if(cntHammer) cntHammer.textContent = state.powerups.hammer;
    if(cntShuffle) cntShuffle.textContent = state.powerups.shuffle;
    if(cntBomb) cntBomb.textContent = state.powerups.bomb;
  }
  function shuffleHand(){
    if(state.hand.some(p=>!p.used)){
      state.hand = state.hand.map(p=> p.used ? p : newPiece());
      renderTray(); showToast('Shuffle!'); beep(540,0.08,'square',0.18); achievementTick('usePower');
    }
  }
  function bombClear(){
    const cells=[];
    for(let y=0;y<BOARD_SIZE;y++) for(let x=0;x<BOARD_SIZE;x++) if(state.grid[y][x]===1) cells.push([x,y]);
    spawnParticles(cells);
    state.grid = createGrid();
    pcFlash=28; requestDraw();
    showToast('💥 Bomb: full clear!'); beep(220,0.1,'sawtooth',0.22); setTimeout(()=>beep(180,0.1,'square',0.18), 100);
    achievementTick('usePower');
  }
  btnRotate?.addEventListener('click', ()=>{
    if(settings.mode!=='arcade'){ showToast('Rotate je deo Arcade moda'); return; }
    const idx = state.hand.findIndex(p=>!p.used);
    if(idx===-1){ showToast('Nema aktivnog komada'); return; }
    state.hand[idx] = rotatePiece(state.hand[idx]);
    renderTray(); showToast('Rotate');
  });
  btnHammer?.addEventListener('click', ()=>{
    if(state.powerups.hammer<=0){ showToast('Nema više čekića'); return; }
    state.using = state.using==='hammer'? null : 'hammer';
    showToast(state.using==='hammer'?'Hammer ON — tapni ćeliju':'Hammer OFF');
  });
  btnShuffle?.addEventListener('click', ()=>{
    if(state.powerups.shuffle<=0){ showToast('Nema više shuffle-a'); return; }
    shuffleHand(); state.powerups.shuffle=Math.max(0,state.powerups.shuffle-1); updatePowerupCounters();
  });
  btnBomb?.addEventListener('click', ()=>{
    if(state.powerups.bomb<=0){ showToast('Nema više bombi'); return; }
    bombClear(); state.powerups.bomb=Math.max(0,state.powerups.bomb-1); updatePowerupCounters();
  });

  let toastTimer=null;
  function showToast(msg){
    let t=document.getElementById('toast');
    if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);
      Object.assign(t.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',background:'rgba(12,14,22,.82)',color:'#e8ecf1',padding:'10px 14px',borderRadius:'12px',boxShadow:'0 10px 30px rgba(0,0,0,.35)',zIndex:99,transition:'opacity .25s',opacity:'0',border:'1px solid rgba(255,255,255,.06)'}); }
    t.textContent=msg; t.style.opacity='1'; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.style.opacity='0'; }, 1600);
  }

  let timePill=null, timerId=null;
  function ensureTimePill(){ if(!timePill){ timePill=document.createElement('div'); timePill.className='pill'; hud && hud.appendChild(timePill); } timePill.style.display='inline-flex'; updateTimePill(); }
  function hideTimePill(){ if(timePill) timePill.style.display='none'; }
  function updateTimePill(){ if(settings.mode==='time' && timePill) timePill.textContent=`Time: ${Math.max(0,state.timeLeft)}s`; }
  function endTimeMode(){ if(timerId){ clearInterval(timerId); timerId=null; } }

  const ACH = [
    {id:'clear2',  title:'Double Clean', desc:'Očisti 2 linije u jednom potezu', done:false},
    {id:'combo3',  title:'Combo Starter', desc:'Dostigni combo x3', done:false},
    {id:'perfect', title:'Perfect!', desc:'Uradi Perfect Clear', done:false},
    {id:'usePower',title:'Taktičar', desc:'Iskoristi bilo koji power-up', done:false},
    {id:'newbest', title:'Nova zvezda', desc:'Obori lični rekord', done:false}
  ];
  function loadAchievements(){
    const saved = JSON.parse(LS('bp10.ach')||'null');
    if(saved && Array.isArray(saved)){ ACH.forEach(a=>{ const f=saved.find(x=>x.id===a.id); if(f) a.done=!!f.done; }); }
  }
  function saveAchievements(){ LS('bp10.ach', JSON.stringify(ACH)); }
  function achievementTick(id){
    const a = ACH.find(x=>x.id===id);
    if(a && !a.done){
      a.done = true; saveAchievements();
      showToast(`🏆 Achievement: ${a.title}`);
    }
  }

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
    loadAchievements(); ensureAchOverlay();
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
  (function injectAchievementsRow(){
    const panel = settingsModal?.querySelector('.panel');
    if(!panel) return;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span>Dostignuća</span><button id="openAch" class="btn">Prikaži</button>`;
    panel.insertBefore(row, panel.querySelector('.row:last-of-type'));
    panel.querySelector('#openAch').addEventListener('click', ()=>{
      renderAchievements(); ensureAchOverlay(); achOverlay.style.display='flex';
    });
  })();

  resetBtn?.addEventListener('click', ()=> newGame());
  backBtn?.addEventListener('click', ()=> goHome());

  settingsBtn?.addEventListener('click', ()=> settingsModal.style.display='flex');
  closeSettings?.addEventListener('click', ()=> settingsModal.style.display='none');
  settingsModal?.querySelector('.backdrop')?.addEventListener('click', ()=> settingsModal.style.display='none');

  setTheme?.addEventListener('click', ()=>{ settings.theme=settings.theme==='dark'?'light':'dark'; LS('bp10.theme',settings.theme); applyTheme(settings.theme); });
  setSound?.addEventListener('click', ()=>{ settings.sound=!settings.sound; LS('bp10.sound', settings.sound?'1':'0'); updateSoundLabel(); });
  setMode?.addEventListener('click', ()=>{
    const order=['classic','obstacles','time','arcade','survival','zen','puzzle'];
    const idx=order.indexOf(settings.mode); settings.mode=order[(idx+1)%order.length];
    LS('bp10.mode',settings.mode); updateModeLabel(); showToast(`Mode: ${settings.mode}`);
  });
  resetBest?.addEventListener('click', ()=>{ localStorage.removeItem('bp10.best'); state.best=0; if(bestEl) bestEl.textContent=0; showToast('Best resetovan'); });
  runTestsBtn?.addEventListener('click', ()=>{ const {passed,failed}=runTests(); showToast(`Testovi: ${passed} ✅ / ${failed} ❌`); });

  startClassic?.addEventListener('click', ()=> startGame('classic'));
  achMenuBtn?.addEventListener('click', ()=>{ renderAchievements(); ensureAchOverlay(); achOverlay.style.display='flex'; });

  function startGame(mode){
    settings.mode=mode; LS('bp10.mode',mode);
    rng=null;
    if(startScreen) startScreen.style.display='none';
    if(app){
      app.style.display='flex';
      app.style.pointerEvents='auto';
    }
    sizeToScreen();
    newGame();
  }
  function goHome(){
    endTimeMode();
    if(app) app.style.display='none';
    if(startScreen) startScreen.style.display='flex';
    if(gameOver) gameOver.style.display='none';
    if(onboarding) onboarding.style.display='none';
    state.dragging=null;
  }
  skipOnb?.addEventListener('click', ()=> onboarding.style.display='none');
  startOnb?.addEventListener('click', ()=>{ onboarding.style.display='none'; settings.onboarded=true; LS('bp10.onboarded','1'); });
  playAgain?.addEventListener('click', ()=>{ if(gameOver) gameOver.style.display='none'; newGame(); });
  goMenu?.addEventListener('click', ()=>{ if(gameOver) gameOver.style.display='none'; goHome(); });

  function updateModeLabel(){
    const m=settings.mode;
    if(setMode) setMode.textContent =
      m==='obstacles'?'Obstacles':
      m==='time'?'Time':
      m==='arcade'?'Arcade':
      m==='survival'?'Survival':
      m==='zen'?'Zen':
      m==='puzzle'?'Puzzle':'Classic';
  }
  function updateSoundLabel(){ if(setSound) setSound.textContent = settings.sound?'🔈 On':'🔇 Off'; }
  function applyTheme(t){ document.body.classList.toggle('light', t==='light'); }

  function newGame(){
    endTimeMode();
    if(settings.mode==='obstacles'){ const r=rng||{next:Math.random}; state.grid=createObstaclesGrid(0.10, r); }
    else if(settings.mode==='puzzle'){ state.grid = puzzleLevelGrid(0); state.puzzleIndex=0; }
    else { state.grid=createGrid(); }

    state.score=0; if(scoreEl) scoreEl.textContent=0;
    state.hand=[]; state.combo=0; state.comboTimer=0;
    state.powerups={hammer:1, shuffle:1, bomb:1};
    state.using=null; comboFlash=0; comboFlashText=''; pcFlash=0; confetti.length=0; rings.length=0;
    updatePowerupCounters();
    refillHand(); requestDraw();

    if(settings.mode==='time'){
      state.timeLeft=60; ensureTimePill(); updateTimePill();
      timerId=setInterval(()=>{ state.timeLeft--; updateTimePill(); if(state.timeLeft<=0){ endTimeMode(); if(goStats) goStats.textContent=`Score: ${state.score} • Best: ${state.best}`; if(gameOver) gameOver.style.display='flex'; } },1000);
    } else { hideTimePill(); }

    state.arcadeRotate = (settings.mode==='arcade');
    state.turns = 0;
    loadAchievements();

    showToast(
      settings.mode==='obstacles'?'Obstacles':
      settings.mode==='time'?'Time Attack':
      settings.mode==='arcade'?'Arcade (Rotate)':
      settings.mode==='survival'?'Survival':
      settings.mode==='zen'?'Zen':
      settings.mode==='puzzle'?'Puzzle Pack':
      'Classic'
    );
  }
  function puzzleLevelGrid(i){
    const g=createGrid();
    for(let x=0;x<BOARD_SIZE;x++){ g[0][x]=-1; g[BOARD_SIZE-1][x]=-1; }
    for(let y=0;y<BOARD_SIZE;y++){ g[y][0]=-1; g[y][BOARD_SIZE-1]=-1; }
    g[4][4]=-1; g[5][5]=-1; g[4][6]=-1; g[6][4]=-1;
    return g;
  }

  function runTests(){
    const results=[]; const log=(n,ok)=>{ results.push({n,ok}); (ok?console.log:console.error)(`[TEST] ${n}: ${ok?'PASS':'FAIL'}`); };
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

  let drawQueued=false;
  function requestDraw(){ if(!drawQueued){ drawQueued=true; requestAnimationFrame(()=>{ drawQueued=false; draw(); }); } }

  (function initGhost(){
    if(!ghost) return; ghost.innerHTML='';
    for(let i=0;i<100;i++){ const s=document.createElement('span'); ghost.appendChild(s); }
    [12,13,14,22,32,42,52,62,72,82].forEach(i=>{ if(ghost.children[i]) ghost.children[i].style.background="#ffffff33"; });
  })();

  sizeToScreen();
  if(!startClassic){
    if(startScreen) startScreen.style.display='none';
    if(app){
      app.style.display='flex';
      app.style.pointerEvents='auto';
    }
    newGame();
  }
})();
