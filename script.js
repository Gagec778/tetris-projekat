(function(){
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // DOM
  const canvas = document.getElementById('game');
  const ctx = canvas?.getContext('2d', { alpha: true });
  const fx = document.getElementById('fx');
  const fctx = fx?.getContext('2d', { alpha: true });
  if (ctx)  ctx.imageSmoothingEnabled = false;
  if (fctx) fctx.imageSmoothingEnabled = false;

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

  // Config
  const BOARD_SIZE = 8;             // 8×8
  const COMBO_WINDOW = 360;
  const COLORS = [                  // tople i svetle nijanse za staklene blokove
    '#FF9F1C','#FFB703','#F77F00','#FFA62B','#FF6B6B',
    '#F94144','#F3722C','#F8961E','#E56B6F','#FFD166',
    '#F6BD60','#F4A261','#E08E45','#F28482'
  ];

  // LS/Settings
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

  // RNG / audio / haptics
  function RNG(seed){ this.s = seed>>>0; }
  RNG.prototype.next = function(){ this.s=(this.s*1664525+1013904223)>>>0; return this.s/4294967296; };
  let rng=null;
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

  // State
  let state = {
    grid: createGrid(),
    cell: 36,
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

  // Sizing
  function sizeToScreen(){
    if(!canvas || !ctx) return;
    const headerH = document.querySelector('header')?.offsetHeight || 60;
    const trayH   = trayEl?.offsetHeight || 120;
    const chrome  = 28;
    const availH  = Math.max(240, window.innerHeight - headerH - trayH - chrome);
    const availW  = Math.min(document.documentElement.clientWidth, 720) - 32;
    const side    = Math.max(240, Math.min(availW, availH));
    const cell    = Math.floor(side / BOARD_SIZE);
    const px      = cell * BOARD_SIZE;

    canvas.style.width = px+'px'; canvas.style.height = px+'px';
    if(fx){ fx.style.width = px+'px'; fx.style.height = px+'px'; }

    canvas.width = Math.floor(px * DPR); canvas.height = Math.floor(px * DPR);
    if(fx){ fx.width = Math.floor(px * DPR); fx.height = Math.floor(px * DPR); }

    ctx.setTransform(1,0,0,1,0,0); ctx.scale(DPR, DPR);
    if(fctx){ fctx.setTransform(1,0,0,1,0,0); }

    ctx.imageSmoothingEnabled = false;
    if (fctx) fctx.imageSmoothingEnabled = false;

    state.cell = cell;
    requestDraw();
  }
  addEventListener('resize', sizeToScreen, {passive:true});

  // Helpers
  function createGrid(){ return Array.from({length:BOARD_SIZE},()=>Array(BOARD_SIZE).fill(0)); }
  function hexToRgb(hex){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim()); if(!m) return {r:255,g:200,b:150}; return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)}; }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function adjustColor(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r+(255-r)*amt),0,255); const ng=clamp(Math.round(g+(255-g)*amt),0,255); const nb=clamp(Math.round(b+(255-b)*amt),0,255); return `rgb(${nr},${ng},${nb})`; }
  function darkenColor(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r*(1-amt)),0,255); const ng=clamp(Math.round(g*(1-amt)),0,255); const nb=clamp(Math.round(b*(1-amt)),0,255); return `rgb(${nr},${ng},${nb})`; }
  function getCss(v){ return getComputedStyle(document.body).getPropertyValue(v); }
  const snap = (n)=> Math.round(n) + 0.5;
  function rrPath(c,x,y,w,h,r){
    r = Math.min(r, w*0.5, h*0.5);
    const x0 = snap(x), y0 = snap(y), x1 = snap(x+w), y1 = snap(y+h);
    const rr = Math.round(r);
    c.beginPath();
    c.moveTo(x0+rr, y0);
    c.lineTo(x1-rr, y0); c.quadraticCurveTo(x1, y0, x1, y0+rr);
    c.lineTo(x1, y1-rr); c.quadraticCurveTo(x1, y1, x1-rr, y1);
    c.lineTo(x0+rr, y1); c.quadraticCurveTo(x0, y1, x0, y1-rr);
    c.lineTo(x0, y0+rr); c.quadraticCurveTo(x0, y0, x0+rr, y0);
    c.closePath();
  }

  // ===== Aurora pozadina (SVETLIJA) — mirna, bez talasa u CELIJAMA =====
  function drawAurora(c,w,h,t){
    c.save();
    // svetliji dijagonalni gradijent + blage glowing trake
    const bg = c.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0.00, 'rgba(160,210,255,0.30)');
    bg.addColorStop(0.50, 'rgba(220,255,230,0.28)');
    bg.addColorStop(1.00, 'rgba(255,230,180,0.26)');
    c.fillStyle = bg; c.fillRect(0,0,w,h);

    // dve široke “magle” koje se lagano pomeraju — ali POZADINA, ne grid
    c.globalCompositeOperation='screen';
    const band1 = c.createRadialGradient(w*0.25, h*0.35, 10, w*0.25, h*0.35, Math.max(w,h)*0.8);
    band1.addColorStop(0,'rgba(120,200,255,0.32)');
    band1.addColorStop(1,'rgba(120,200,255,0.00)');
    c.fillStyle=band1; c.fillRect(0,0,w,h);

    const band2 = c.createRadialGradient(w*0.75, h*0.70, 10, w*0.75, h*0.70, Math.max(w,h)*0.9);
    band2.addColorStop(0,'rgba(255,210,150,0.28)');
    band2.addColorStop(1,'rgba(255,210,150,0.00)');
    c.fillStyle=band2; c.fillRect(0,0,w,h);

    c.restore();
  }

  // ===== Stakleni blok (glossy) =====
  function drawGlassBlock(c, x, y, s, baseColor, {alpha=1, placed=false}={}){
    c.save();
    c.globalAlpha = alpha;

    // Osnovno telo (poluprovidno staklo)
    rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22));
    const body = c.createLinearGradient(x, y, x, y+s);
    body.addColorStop(0.00, adjustColor(baseColor, .30));
    body.addColorStop(0.50, baseColor);
    body.addColorStop(1.00, darkenColor(baseColor, .28));
    c.fillStyle = body; c.fill();

    // Unutrašnja providnost: blagi multiply shadow ka dnu → osećaj debljine
    const inner = c.createLinearGradient(x, y, x, y+s);
    inner.addColorStop(0.00,'rgba(0,0,0,0)');
    inner.addColorStop(1.00,'rgba(0,0,0,.18)');
    c.save(); c.globalCompositeOperation='multiply';
    rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22));
    c.fillStyle = inner; c.fill();
    c.restore();

    // Refleksija (specular) gore-levo — glossy osećaj
    const spec = c.createLinearGradient(x, y, x+s, y+s);
    spec.addColorStop(0.00,'rgba(255,255,255,.70)');
    spec.addColorStop(0.20,'rgba(255,255,255,.25)');
    spec.addColorStop(0.60,'rgba(255,255,255,0)');
    c.save(); c.globalCompositeOperation='screen';
    rrPath(c, x+2, y+2, s-4, s-4, Math.max(5, s*0.18));
    c.fillStyle = spec; c.fill();
    c.restore();

    // Oštar spoljašnji rub + tanki unutrašnji
    rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22));
    c.lineWidth = Math.max(1, s*.06);
    c.strokeStyle='rgba(0,0,0,.45)';
    c.stroke();

    rrPath(c, x+2, y+2, s-4, s-4, Math.max(5, s*0.18));
    c.lineWidth = Math.max(1, s*.04);
    c.strokeStyle='rgba(255,255,255,.16)';
    c.stroke();

    // Zlatni “rim” ako je položeno na tablu
    if(placed){
      rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22));
      const gold=c.createLinearGradient(x,y,x,y+s);
      gold.addColorStop(0,'rgba(255,220,150,.75)');
      gold.addColorStop(1,'rgba(175,120,40,.45)');
      c.lineWidth=Math.max(1, s*.07); c.strokeStyle=gold; c.stroke();
    }
    c.restore();
  }
  const drawPieceCell  = (c,x,y,s,color,alpha)=> drawGlassBlock(c,x,y,s,color,{alpha});
  const drawPlacedCell = (c,x,y,s)=> drawGlassBlock(c,x,y,s,getCss('--accent')||'#FFD166',{alpha:.98, placed:true});
  function drawPreviewCell(c, x, y, s, baseColor, canPlaceFlag){
    const col = canPlaceFlag ? baseColor : '#c65454';
    drawGlassBlock(c, x, y, s, col, {alpha: canPlaceFlag? 0.97 : 0.90, placed:false});
  }

  // Pieces
  const SHAPES = [
    [[0,0]], [[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[1,0],[2,0],[3,0]],
    [[0,0],[1,0],[2,0],[3,0],[4,0]],
    [[0,0],[0,1]], [[0,0],[0,1],[0,2]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[0,1],[0,2],[0,3],[0,4]],
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[2,0],[0,1]],
    [[0,0],[1,0],[2,0],[0,1],[0,2]],
    [[0,0],[1,0],[2,0],[1,1]],
  ];
  const rndColor=()=>COLORS[Math.floor(rnd()*COLORS.length)];
  function newPiece(){
    const shape=SHAPES[Math.floor(rnd()*SHAPES.length)];
    const color=rndColor();
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

  // Rules
  function canPlace(piece,gx,gy){
    for(const [dx,dy] of piece.blocks){
      const x=gx+dx,y=gy+dy;
      if(x<0||y<0||x>=BOARD_SIZE||y>=BOARD_SIZE) return false;
      if(state.grid[y][x]!==0) return false;
    }
    return true;
  }
  function canFitAnywhere(piece){
    for(let y=0;y<=BOARD_SIZE-piece.h;y++)
      for(let x=0;x<=BOARD_SIZE-piece.w;x++)
        if(canPlace(piece,x,y)) return true;
    return false;
  }
  function anyFits(){ return state.hand.some(p=>!p.used && canFitAnywhere(p)); }

  // DRAW
  function draw(){
    if(!canvas||!ctx) return;
    const s=state.cell, W=s*BOARD_SIZE, H=s*BOARD_SIZE;

    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.scale(DPR, DPR);

    // 1) SVETLIJA AURORA kao pozadina (grid je transparentan — vidi se aurora)
    const t = (performance.now? performance.now(): Date.now())/1000;
    drawAurora(ctx, W, H, t);

    // 2) stakleni okvir panela (ali ćelije ne “talasaju”)
    rrPath(ctx,0,0,W,H,18);
    const glass=ctx.createLinearGradient(0,0,0,H);
    glass.addColorStop(0,'rgba(12,16,24,.18)');
    glass.addColorStop(1,'rgba(12,16,24,.28)');
    ctx.fillStyle=glass; ctx.fill();

    // tanki “polirani” rub panela
    rrPath(ctx,1,1,W-2,H-2,16);
    ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.lineWidth=1; ctx.stroke();

    // 3) GRID: NEMA popune — samo diskretan border da se aurora vidi kroz polja
    for(let y=0;y<BOARD_SIZE;y++){
      for(let x=0;x<BOARD_SIZE;x++){
        const px=x*s, py=y*s, v=state.grid[y][x];
        if(v===1){
          drawPlacedCell(ctx,px,py,s);
        } else if(v===-1){
          // Ako nekad bude prepreka, prikaži je kao mutniji komad stakla
          rrPath(ctx,px+1,py+1,s-2,s-2,9);
          ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fill();
          ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1; ctx.stroke();
        } else {
          // prazno — samo tanak okvir; unutra je aurora
          rrPath(ctx,px+1.5,py+1.5,s-3,s-3,8);
          ctx.strokeStyle='var(--grid-border)'; ctx.lineWidth=1; ctx.stroke();
        }
      }
    }

    // 4) floating preview iznad prsta (bez senke)
    if(state.dragging && state.dragging.px!=null){
      const {piece, px, py, valid} = state.dragging;
      const liftY = 72;
      const offsetX = 8;
      const baseX = px - (piece.w*s)/2 + offsetX;
      const baseY = py - (piece.h*s)/2 - liftY;
      for(const [dx,dy] of piece.blocks){
        drawPreviewCell(ctx, baseX + dx*s, baseY + dy*s, s, piece.color, valid);
      }
    }
  }

  // FX (kao ranije, sitno)
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

  // Scoring / gameplay
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

    if(state.hand.every(p=>p.used)) refillHand();

    if(state.score>state.best){
      state.best=state.score; LS('bp10.best', String(state.best)); if(bestEl) bestEl.textContent=state.best;
      bestEl?.parentElement?.classList.add('best-glow'); setTimeout(()=>bestEl?.parentElement?.classList.remove('best-glow'), 500);
      spawnConfettiBurst(); achievementTick('newbest');
    }
    if(cleared>=2) achievementTick('clear2');
    if(state.combo>=3) achievementTick('combo3');

    if(!anyFits()){
      if(goStats) goStats.textContent = `Score: ${state.score} • Best: ${state.best}`;
      if(gameOver) gameOver.style.display='flex'; beep(220,0.15); hapt(40);
    }
    requestDraw();
  }
  function isBoardEmpty(){ for(let y=0;y<BOARD_SIZE;y++) for(let x=0;x<BOARD_SIZE;x++) if(state.grid[y][x]===1) return false; return true; }

  // Tray render
  function pieceToCanvas(piece){
    const scale=24, pad=6;
    const w=piece.w*scale+pad*2, h=piece.h*scale+pad*2;
    const c=document.createElement('canvas');
    c.width=w*DPR; c.height=h*DPR; c.style.width=w+'px'; c.style.height=h+'px';
    const cx=c.getContext('2d'); cx.scale(DPR,DPR); cx.imageSmoothingEnabled=false;
    for(const [dx,dy] of piece.blocks){
      const x=pad+dx*scale, y=pad+dy*scale;
      drawGlassBlock(cx,x,y,scale-2,piece.color,{alpha:1,placed:false});
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

  // Dragging
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
  function onGlobalPointerMoveRaw(e){
    if(!POINTER.active||!state.dragging) return;
    const {x,y}=getCanvasPosFromClient(e.clientX, e.clientY);
    state.dragging.px = x;
    state.dragging.py = y;

    const s = state.cell;
    const piece = state.dragging.piece;
    const liftY  = 72;
    const offsetX= 8;

    const baseX = x - (piece.w*s)/2 + offsetX;
    const baseY = y - (piece.h*s)/2 - liftY;

    let gx = Math.round(baseX / s);
    let gy = Math.round(baseY / s);

    const maxX=BOARD_SIZE - piece.w;
    const maxY=BOARD_SIZE - piece.h;
    if (gx < 0 || gx > maxX) gx = null;
    if (gy < 0 || gy > maxY) gy = null;

    if(gx!=null && gy!=null){
      const valid = canPlace(piece,gx,gy);
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

  // Basic UI actions
  function showToast(msg){
    let t=document.getElementById('toast');
    if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);
      Object.assign(t.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',background:'rgba(12,14,22,.82)',color:'#e8ecf1',padding:'10px 14px',borderRadius:'12px',boxShadow:'0 10px 30px rgba(0,0,0,.35)',zIndex:99,transition:'opacity .25s',opacity:'0',border:'1px solid rgba(255,255,255,.06)'}); }
    t.textContent=msg; t.style.opacity='1'; setTimeout(()=>{ t.style.opacity='0'; }, 1600);
  }

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

  resetBtn?.addEventListener('click', ()=> newGame());
  backBtn?.addEventListener('click', ()=> goHome());
  settingsBtn?.addEventListener('click', ()=> settingsModal.style.display='flex');
  closeSettings?.addEventListener('click', ()=> settingsModal.style.display='none');
  settingsModal?.querySelector('.backdrop')?.addEventListener('click', ()=> settingsModal.style.display='none');
  setTheme?.addEventListener('click', ()=>{ settings.theme=settings.theme==='dark'?'light':'dark'; LS('bp10.theme',settings.theme); applyTheme(settings.theme); });
  setSound?.addEventListener('click', ()=>{ settings.sound=!settings.sound; LS('bp10.sound', settings.sound?'1':'0'); updateSoundLabel(); });
  setMode?.addEventListener('click', ()=>{ showToast('Classic'); });
  resetBest?.addEventListener('click', ()=>{ localStorage.removeItem('bp10.best'); state.best=0; if(bestEl) bestEl.textContent=0; showToast('Best resetovan'); });
  runTestsBtn?.addEventListener('click', ()=>{ const {passed,failed}=runTests(); showToast(`Testovi: ${passed} ✅ / ${failed} ❌`); });

  startClassic?.addEventListener('click', ()=> startGame('classic'));
  achMenuBtn?.addEventListener('click', ()=>{ showToast('Dostignuća u izradi'); });

  function startGame(mode){
    settings.mode=mode; LS('bp10.mode',mode);
    rng=null;
    if(startScreen) startScreen.style.display='none';
    if(app){ app.style.display='flex'; app.style.pointerEvents='auto'; }
    sizeToScreen();
    newGame();
  }
  function goHome(){
    if(app) app.style.display='none';
    if(startScreen) startScreen.style.display='flex';
    if(gameOver) gameOver.style.display='none';
    if(onboarding) onboarding.style.display='none';
    state.dragging=null;
  }

  function updateModeLabel(){ if(setMode) setMode.textContent = 'Classic'; }
  function updateSoundLabel(){ if(setSound) setSound.textContent = settings.sound?'🔈 On':'🔇 Off'; }
  function applyTheme(t){ document.body.classList.toggle('light', t==='light'); }

  function newGame(){
    state.grid=createGrid();
    state.score=0; if(scoreEl) scoreEl.textContent=0;
    state.hand=[]; state.combo=0; state.comboTimer=0;
    state.powerups={hammer:1, shuffle:1, bomb:1};
    state.using=null; comboFlash=0; comboFlashText=''; pcFlash=0; confetti.length=0; rings.length=0;
    refillHand(); requestDraw();
    loadAchievements();
    showToast('Classic');
  }

  // Tests
  function runTests(){
    const results=[]; const log=(n,ok)=>{ results.push({n,ok}); (ok?console.log:console.error)(`[TEST] ${n}: ${ok?'PASS':'FAIL'}`); };
    try{
      log('anyFits defined', typeof anyFits==='function');
      const p={blocks:[[0,0],[1,0]], w:2,h:1,color:'#fff',id:'t'};
      log('canPlace rejects OOB', canPlace(p,-1,0)===false);
      state.grid=createGrid(); for(let x=0;x<BOARD_SIZE-1;x++) state.grid[0][x]=1;
      const s0=state.score; place({blocks:[[0,0]],w:1,h:1,color:'#fff',id:'t2'}, BOARD_SIZE-1, 0);
      log('row clear adds points', state.score>s0);
    }catch(e){ console.error(e); }
    return {passed:results.filter(r=>r.ok).length, failed:results.filter(r=>!r.ok).length};
  }

  // Draw loop
  let drawQueued=false;
  function requestDraw(){ if(!drawQueued){ drawQueued=true; requestAnimationFrame(()=>{ drawQueued=false; draw(); }); } }

  // Ghost mini-board na startu (dekor)
  (function initGhost(){
    if(!ghost) return; ghost.innerHTML='';
    const cells = 100;
    for(let i=0;i<cells;i++){ const s=document.createElement('span'); ghost.appendChild(s); }
    [12,13,14,22,32,42,52,62,72,82].forEach(i=>{ if(ghost.children[i]) ghost.children[i].style.background="#ffffff33"; });
  })();

  // Start immediately if no menu present
  sizeToScreen();
  if(!startClassic){
    if(startScreen) startScreen.style.display='none';
    if(app){ app.style.display='flex'; app.style.pointerEvents='auto'; }
    newGame();
  }
})();
