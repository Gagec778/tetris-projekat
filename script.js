(function(){
  'use strict';

  // ============================================================================
  //  BLOCK PUZZLE 8×8 — STABLE BUILD
  //  - Aurora background (start + board)
  //  - 8×8 grid (no "waves" inside cells)
  //  - 3 pieces in tray; refill after used
  //  - Drag above finger (no shadow), invalid = red preview
  //  - Mat 3D blocks for placed & preview
  //  - Modes: Classic, Obstacles, Zen
  //  - Score + Best per mode (localStorage)
  //  - Settings: theme toggle, sound toggle, reset best
  //  - Game Over overlay (except Zen)
  //  - Test harness with basic checks
  //
  //  NOTE: This is intentionally verbose and well-commented to match the
  //        "full-length" stable feel you asked for. No aggressive refactors.
  // ============================================================================

  // ----------------------------------------------------------------------------
  // DOM LOOKUP
  // ----------------------------------------------------------------------------
  const canvas = document.getElementById('game');
  const ctx    = canvas?.getContext('2d', { alpha: true });
  const fxCnv  = document.getElementById('fx');
  const fctx   = fxCnv?.getContext('2d', { alpha: true });
  const app    = document.getElementById('app');
  const start  = document.getElementById('startScreen');
  const bg     = document.getElementById('bg');

  const trayEl = document.getElementById('tray');
  const scoreEl= document.getElementById('score');
  const bestEl = document.getElementById('best');
  const bestClassicEl   = document.getElementById('bestClassic');
  const bestObstaclesEl = document.getElementById('bestObstacles');
  const bestZenEl       = document.getElementById('bestZen');

  const resetBtn = document.getElementById('reset');
  const backBtn  = document.getElementById('backBtn');

  const settingsBtn   = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const setTheme      = document.getElementById('setTheme');
  const setSound      = document.getElementById('setSound');
  const resetBest     = document.getElementById('resetBest');
  const closeSettings = document.getElementById('closeSettings');
  const runTestsBtn   = document.getElementById('runTests');

  const achBtn   = document.getElementById('achBtn');
  const gameOver = document.getElementById('gameOver');
  const goStats  = document.getElementById('goStats');
  const playAgain= document.getElementById('playAgain');
  const goMenu   = document.getElementById('goMenu');

  const startClassic   = document.getElementById('startClassic');
  const startObstacles = document.getElementById('startObstacles');
  const startZen       = document.getElementById('startZen');

  // Defensive: ensure contexts
  if(ctx){ ctx.imageSmoothingEnabled = false; }
  if(fctx){ fctx.imageSmoothingEnabled = false; }

  // ----------------------------------------------------------------------------
  // CONFIG
  // ----------------------------------------------------------------------------
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const BOARD_SIZE = 8;               // 8×8 stable
  const MAX_TRAY = 3;                 // always 3 pieces
  const COLORS = [                    // warm & strong
    '#FF6B6B','#F94144','#F3722C','#F8961E','#F9844A',
    '#FFD166','#F6BD60','#7BD389','#70C1B3','#4D9DE0',
    '#5B8CFF','#C97FFF','#E56B6F','#FF9F1C'
  ];
  const OBSTACLE_COLOR = '#3a404d';   // fixed blocks in Obstacles mode

  // ----------------------------------------------------------------------------
  // SETTINGS / LOCAL STORAGE
  // ----------------------------------------------------------------------------
  const LS=(k,v)=> (v===undefined? localStorage.getItem(k) : localStorage.setItem(k,v));

  const settings = {
    theme: LS('bp8.theme') || 'dark',
    sound: LS('bp8.sound')!==null ? LS('bp8.sound')==='1' : true,
  };
  applyTheme(settings.theme);
  updateSoundLabel();

  const bestByMode = loadBest() || {classic:0, obstacles:0, zen:0};
  updateBestBoard();

  // ----------------------------------------------------------------------------
  // AUDIO / HAPTICS
  // ----------------------------------------------------------------------------
  let audioCtx=null;
  function ensureAudio(){ if(!audioCtx){ try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } }
  function beep(freq=600, dur=0.06, type='sine', gain=0.18){
    if(!settings.sound) return;
    ensureAudio(); if(!audioCtx) return;
    const t=audioCtx.currentTime, osc=audioCtx.createOscillator(), g=audioCtx.createGain();
    osc.type=type; osc.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(gain,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    osc.connect(g); g.connect(audioCtx.destination); osc.start(t); osc.stop(t+dur);
  }
  function hapt(ms=15){ if(!settings.sound) return; if(navigator.vibrate) navigator.vibrate(ms); }

  // ----------------------------------------------------------------------------
  // STATE
  // ----------------------------------------------------------------------------
  const state = {
    grid: createGrid(BOARD_SIZE),
    cell: 36,            // will be resized
    score: 0,
    mode: 'classic',
    best: bestByMode,
    hand: [],
    dragging: null,      // {piece, px, py, gx, gy, valid}
  };

  // ----------------------------------------------------------------------------
  // LAYOUT / RESIZE
  // ----------------------------------------------------------------------------
  function sizeToScreen(){
    if(!canvas||!ctx) return;
    const headerH = document.querySelector('header')?.offsetHeight || 60;
    const trayH   = trayEl?.offsetHeight || 120;
    const chrome  = 28;
    const availH  = Math.max(260, window.innerHeight - headerH - trayH - chrome);
    const availW  = Math.min(document.documentElement.clientWidth, 720) - 32;
    const side    = Math.max(240, Math.min(availW, availH));
    const cell    = Math.floor(side/BOARD_SIZE);
    const px      = cell*BOARD_SIZE;

    // canvas pixel sizes (scaled by DPR) + CSS size
    canvas.style.width=px+'px'; canvas.style.height=px+'px';
    canvas.width=Math.floor(px*DPR); canvas.height=Math.floor(px*DPR);
    if(fxCnv){
      fxCnv.style.width=px+'px'; fxCnv.style.height=px+'px';
      fxCnv.width=Math.floor(px*DPR); fxCnv.height=Math.floor(px*DPR);
    }
    // set transforms
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(DPR,DPR);
    if(fctx){ fctx.setTransform(1,0,0,1,0,0); }

    state.cell=cell;

    // background canvas (start aurora)
    if(bg){
      bg.width=Math.floor(window.innerWidth*DPR);
      bg.height=Math.floor(window.innerHeight*DPR);
    }
    requestDraw();
  }
  addEventListener('resize', sizeToScreen, {passive:true});

  // ----------------------------------------------------------------------------
  // UTILITIES
  // ----------------------------------------------------------------------------
  function createGrid(n){ return Array.from({length:n},()=>Array(n).fill(0)); }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function hexToRgb(hex){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim()); if(!m) return {r:255,g:200,b:150}; return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)}; }
  function adjustColor(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r+(255-r)*amt),0,255); const ng=clamp(Math.round(g+(255-g)*amt),0,255); const nb=clamp(Math.round(b+(255-b)*amt),0,255); return `rgb(${nr},${ng},${nb})`; }
  function darkenColor(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r*(1-amt)),0,255); const ng=clamp(Math.round(g*(1-amt)),0,255); const nb=clamp(Math.round(b*(1-amt)),0,255); return `rgb(${nr},${ng},${nb})`; }
  function rrPath(c,x,y,w,h,r){ r=Math.min(r,w*.5,h*.5);
    c.beginPath();
    c.moveTo(x+r,y);
    c.arcTo(x+w,y,x+w,y+h,r);
    c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r);
    c.arcTo(x,y,x+w,y,r);
    c.closePath();
  }

  function getCss(v){ return getComputedStyle(document.body).getPropertyValue(v); }

  // ----------------------------------------------------------------------------
  // AURORA BACKGROUND
  // ----------------------------------------------------------------------------
  function drawAurora(c,w,h){
    c.save();
    const bg = c.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0.00, 'rgba(160,210,255,0.33)');
    bg.addColorStop(0.55, 'rgba(220,255,230,0.31)');
    bg.addColorStop(1.00, 'rgba(255,210,160,0.29)');
    c.fillStyle=bg; c.fillRect(0,0,w,h);

    c.globalCompositeOperation='screen';
    const g1 = c.createRadialGradient(w*0.25, h*0.35, 10, w*0.25, h*0.35, Math.max(w,h)*0.8);
    g1.addColorStop(0,'rgba(120,200,255,0.34)'); g1.addColorStop(1,'rgba(120,200,255,0)');
    c.fillStyle=g1; c.fillRect(0,0,w,h);
    const g2 = c.createRadialGradient(w*0.75, h*0.70, 10, w*0.75, h*0.70, Math.max(w,h)*0.9);
    g2.addColorStop(0,'rgba(255,180,150,0.30)'); g2.addColorStop(1,'rgba(255,180,150,0)');
    c.fillStyle=g2; c.fillRect(0,0,w,h);
    c.restore();
  }
  function drawStartAurora(){
    if(!bg) return;
    const b=bg.getContext('2d');
    b.setTransform(1,0,0,1,0,0); b.scale(DPR,DPR);
    b.clearRect(0,0,bg.width,bg.height);
    drawAurora(b, window.innerWidth, window.innerHeight);
    requestAnimationFrame(drawStartAurora);
  }

  // ----------------------------------------------------------------------------
  // PIECES / SHAPES
  // ----------------------------------------------------------------------------
  const SHAPES = (function(){
    // Basic lines, squares, L, T variants — trimmed to top-left origin
    const raw = [
      [[0,0]],
      [[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[1,0],[2,0],[3,0]], [[0,0],[1,0],[2,0],[3,0],[4,0]],
      [[0,0],[0,1]], [[0,0],[0,1],[0,2]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[0,1],[0,2],[0,3],[0,4]],
      [[0,0],[1,0],[0,1],[1,1]], // square
      [[0,0],[1,0],[2,0],[0,1]], // L small
      [[0,0],[1,0],[2,0],[1,1]], // T small
      [[0,0],[1,0],[0,1],[0,2]], // L tall
      [[0,0],[1,0],[1,1],[1,2]], // skewed
    ];
    return raw.map(shape=>{
      const minx=Math.min(...shape.map(b=>b[0]));
      const miny=Math.min(...shape.map(b=>b[1]));
      const blocks=shape.map(([x,y])=>[x-minx,y-miny]);
      const w=Math.max(...blocks.map(b=>b[0]))+1;
      const h=Math.max(...blocks.map(b=>b[1]))+1;
      return {blocks,w,h};
    });
  })();

  function rndColor(){ return COLORS[Math.floor(Math.random()*COLORS.length)]; }
  function newPiece(){
    const s = SHAPES[Math.floor(Math.random()*SHAPES.length)];
    return {
      blocks: s.blocks.map(b=>[b[0],b[1]]),
      w: s.w, h: s.h, color: rndColor(), used:false, id: Math.random().toString(36).slice(2)
    };
  }

  // ----------------------------------------------------------------------------
  // RULES
  // ----------------------------------------------------------------------------
  function canPlace(piece,gx,gy){
    for(const [dx,dy] of piece.blocks){
      const x=gx+dx, y=gy+dy;
      if(x<0||y<0||x>=BOARD_SIZE||y>=BOARD_SIZE) return false;
      if(state.grid[y][x]!==0) return false;
    }
    return true;
  }
  function canFitAnywhere(piece){
    for(let y=0;y<=BOARD_SIZE-piece.h;y++){
      for(let x=0;x<=BOARD_SIZE-piece.w+x;++x){}
    }
    for(let y=0;y<=BOARD_SIZE-piece.h;y++){
      for(let x=0;x<=BOARD_SIZE-piece.w;x++){
        if(canPlace(piece,x,y)) return true;
      }
    }
    return false;
  }
  function anyFits(){
    return state.hand.some(p=>!p.used && canFitAnywhere(p));
  }

  // ----------------------------------------------------------------------------
  // DRAW HELPERS — MAT 3D BLOCKS
  // ----------------------------------------------------------------------------
  function drawMatBlock(c, x, y, s, baseColor, {alpha=1, placed=false}={}){
    c.save(); c.globalAlpha=alpha;
    rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22));
    const body=c.createLinearGradient(x,y,x,y+s);
    body.addColorStop(0, adjustColor(baseColor,.12));
    body.addColorStop(1, darkenColor(baseColor,.16));
    c.fillStyle=body; c.fill();

    const inner=c.createLinearGradient(x,y,x+s,y+s);
    inner.addColorStop(0,'rgba(0,0,0,.10)'); inner.addColorStop(0.5,'rgba(0,0,0,0)');
    rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22));
    c.save(); c.globalCompositeOperation='multiply'; c.fillStyle=inner; c.fill(); c.restore();

    const light=c.createLinearGradient(x,y,x+s,y+s);
    light.addColorStop(0,'rgba(255,255,255,.18)');
    light.addColorStop(0.35,'rgba(255,255,255,.06)');
    light.addColorStop(1,'rgba(255,255,255,0)');
    rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22)); c.fillStyle=light; c.fill();

    rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22)); c.lineWidth=Math.max(1,s*.06); c.strokeStyle='rgba(0,0,0,.40)'; c.stroke();
    rrPath(c, x+2, y+2, s-4, s-4, Math.max(5, s*0.18)); c.lineWidth=Math.max(1,s*.04); c.strokeStyle='rgba(255,255,255,.10)'; c.stroke();

    if(placed){
      rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22));
      const gold=c.createLinearGradient(x,y,x,y+s); gold.addColorStop(0,'rgba(255,220,150,.70)'); gold.addColorStop(1,'rgba(175,120,40,.35)');
      c.lineWidth=Math.max(1, s*.07); c.strokeStyle=gold; c.stroke();
    }
    c.restore();
  }
  function drawPlacedCell(c,x,y,s){
    drawMatBlock(c,x,y,s,getCss('--accent')||'#FFD166',{alpha:.98, placed:true});
  }
  function drawPreviewCell(c,x,y,s,col,ok){
    const color = ok ? col : '#c65454';
    drawMatBlock(c,x,y,s,color,{alpha: ok? .96 : .88, placed:false});
  }

  // ----------------------------------------------------------------------------
  // TRAY RENDER
  // ----------------------------------------------------------------------------
  function drawPieceToCanvas(piece){
    const scale=24, pad=6, w=piece.w*scale+pad*2, h=piece.h*scale+pad*2;
    const c=document.createElement('canvas'); c.width=w*DPR; c.height=h*DPR; c.style.width=w+'px'; c.style.height=h+'px';
    const cx=c.getContext('2d'); cx.scale(DPR,DPR); cx.imageSmoothingEnabled=false;
    for(const [dx,dy] of piece.blocks){ drawMatBlock(cx, pad+dx*scale, pad+dy*scale, scale-2, piece.color, {alpha:1}); }
    return c;
  }
  function renderTray(){
    if(!trayEl) return; trayEl.innerHTML='';
    state.hand.forEach((p,i)=>{
      const div=document.createElement('div');
      const fits=canFitAnywhere(p);
      div.className='slot'+(p.used?' used':'')+(p.used?'':(fits?' good':' bad'));
      div.dataset.index=String(i);
      div.appendChild(drawPieceToCanvas(p));
      if(!p.used) div.addEventListener('pointerdown', startDragFromSlot, {passive:false});
      trayEl.appendChild(div);
    });
  }

  // ----------------------------------------------------------------------------
  // BOARD DRAW
  // ----------------------------------------------------------------------------
  function draw(){
    if(!canvas||!ctx) return;
    const s=state.cell, W=s*BOARD_SIZE, H=s*BOARD_SIZE;
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.scale(DPR,DPR);

    // 1) aurora on board
    drawAurora(ctx, W, H);

    // 2) glass panel to soften aurora
    rrPath(ctx,0,0,W,H,18);
    const panel=ctx.createLinearGradient(0,0,0,H);
    panel.addColorStop(0,'rgba(12,16,24,.18)'); panel.addColorStop(1,'rgba(12,16,24,.24)');
    ctx.fillStyle=panel; ctx.fill();
    rrPath(ctx,1,1,W-2,H-2,16); ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.lineWidth=1; ctx.stroke();

    // 3) cells
    for(let y=0;y<BOARD_SIZE;y++){
      for(let x=0;x<BOARD_SIZE;x++){
        const px=x*s, py=y*s, v=state.grid[y][x];
        rrPath(ctx,px+1,py+1,s-2,s-2,9);
        if(v===1){
          drawPlacedCell(ctx,px,py,s);
        } else if(v===2){
          // obstacle (fixed)
          rrPath(ctx,px+1,py+1,s-2,s-2,9);
          ctx.fillStyle=OBSTACLE_COLOR; ctx.fill();
        } else {
          const fill=ctx.createLinearGradient(px,py,px,py+s);
          fill.addColorStop(0,'rgba(255,255,255,.06)');
          fill.addColorStop(1,'rgba(0,0,0,.10)');
          ctx.fillStyle=fill; ctx.fill();
          rrPath(ctx,px+1.5,py+1.5,s-3,s-3,8);
          ctx.strokeStyle='var(--grid-border)'; ctx.lineWidth=1; ctx.stroke();
        }
      }
    }

    // 4) dragging preview (above finger)
    if(state.dragging && state.dragging.px!=null){
      const {piece, px, py, valid} = state.dragging;
      const liftY=72, offsetX=8;
      const baseX = px - (piece.w*s)/2 + offsetX;
      const baseY = py - (piece.h*s)/2 - liftY;
      for(const [dx,dy] of piece.blocks){
        drawPreviewCell(ctx, baseX + dx*s, baseY + dy*s, s, piece.color, valid);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // FX
  // ----------------------------------------------------------------------------
  const particles=[]; const scorePopups=[];
  function spawnParticles(cells){
    if(!fxCnv||!fctx) return;
    const s=state.cell, d=DPR;
    for(const [x,y] of cells){
      for(let j=0;j<6;j++){ particles.push({x:(x+0.5)*s*d, y:(y+0.5)*s*d, vx:(Math.random()-0.5)*2, vy:(-Math.random()*2-0.5), life:40}); }
    }
  }
  function stepFX(){
    if(!fxCnv||!fctx){ requestAnimationFrame(stepFX); return; }
    fctx.setTransform(1,0,0,1,0,0); fctx.clearRect(0,0,fxCnv.width,fxCnv.height);
    fctx.fillStyle='#ffffffaa';
    for(let i=0;i<particles.length;i++){ const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.life--; fctx.globalAlpha=Math.max(0,p.life/40); fctx.beginPath(); fctx.arc(p.x,p.y,2,0,Math.PI*2); fctx.fill(); }
    for(let i=particles.length-1;i>=0;i--) if(particles[i].life<=0) particles.splice(i,1);
    for(let i=0;i<scorePopups.length;i++){ const p=scorePopups[i]; p.y-=0.4; p.life--; const a=Math.max(0,p.life/40); fctx.globalAlpha=a; fctx.font=`${Math.max(12,12*DPR)}px system-ui,sans-serif`; fctx.textAlign='center'; fctx.fillStyle='rgba(255,215,130,.95)'; fctx.fillText(p.txt, p.x, p.y); }
    for(let i=scorePopups.length-1;i>=0;i--) if(scorePopups[i].life<=0) scorePopups.splice(i,1);
    requestAnimationFrame(stepFX);
  }
  requestAnimationFrame(stepFX);

  // ----------------------------------------------------------------------------
  // PLACEMENT / SCORING
  // ----------------------------------------------------------------------------
  function scoreForClear(c){ return c*10 + (c>1 ? (c-1)*5 : 0); }
  function place(piece,gx,gy){
    for(const [dx,dy] of piece.blocks){ state.grid[gy+dy][gx+dx]=1; }

    // find full rows/columns (ignore obstacles)
    const fullRows=[], fullCols=[];
    for(let y=0;y<BOARD_SIZE;y++){
      let ok=true;
      for(let x=0;x<BOARD_SIZE;x++){ if(state.grid[y][x]!==1){ ok=false; break; } }
      if(ok) fullRows.push(y);
    }
    for(let x=0;x<BOARD_SIZE;x++){
      let ok=true;
      for(let y=0;y<BOARD_SIZE;y++){ if(state.grid[y][x]!==1){ ok=false; break; } }
      if(ok) fullCols.push(x);
    }

    const cleared=fullRows.length+fullCols.length;
    if(cleared>0){
      const cells=[];
      for(const r of fullRows){ for(let x=0;x<BOARD_SIZE;x++){ cells.push([x,r]); } state.grid[r]=Array(BOARD_SIZE).fill(0); }
      for(const c of fullCols){ for(let y=0;y<BOARD_SIZE;y++){ cells.push([c,y]); state.grid[y][c]=0; } }
      spawnParticles(cells); beep(760,.08,'triangle',0.22); hapt(28);
    } else { beep(520,.05,'sine',0.16); hapt(12); }

    const baseGain=piece.blocks.length, clearBonus=scoreForClear(cleared);
    state.score += baseGain + clearBonus; scoreEl && (scoreEl.textContent=state.score);

    // update best (per mode)
    const currentBest = state.best[state.mode] || 0;
    if(state.score>currentBest){
      state.best[state.mode]=state.score; saveBest(state.best); updateBestBoard();
      if(bestEl) bestEl.textContent=state.score;
    }

    piece.used=true; state.hand=state.hand.map(p=>p.id===piece.id? {...p,used:true}:p);
    renderTray();
    if(state.hand.every(p=>p.used)) refillHand();

    // Game over check (not in Zen)
    if(state.mode!=='zen' && !anyFits()){
      goStats && (goStats.textContent=`Score: ${state.score} • Best: ${state.best[state.mode]||0}`);
      gameOver && (gameOver.style.display='flex'); beep(220,0.15); hapt(40);
    }
    requestDraw();
  }

  function refillHand(){ state.hand=[newPiece(),newPiece(),newPiece()]; renderTray(); }

  // ----------------------------------------------------------------------------
  // DRAGGING
  // ----------------------------------------------------------------------------
  const POINTER={active:false,fromSlotIndex:null};
  function getCanvasPosFromClient(clientX, clientY){ const r=canvas.getBoundingClientRect(); return {x:(clientX-r.left), y:(clientY-r.top)}; }
  function startDragFromSlot(e){
    const idx=Number(e.currentTarget.dataset.index), piece=state.hand[idx]; if(!piece||piece.used) return;
    POINTER.active=true; POINTER.fromSlotIndex=idx;
    state.dragging={piece,gx:null,gy:null,valid:false,px:null,py:null};
    e.currentTarget.classList.add('used');
    try{ e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); }catch(_){}
    document.body.style.cursor='grabbing'; e.preventDefault(); e.stopPropagation();
  }
  function onPointerMove(e){
    if(!POINTER.active||!state.dragging) return;
    const {x,y}=getCanvasPosFromClient(e.clientX, e.clientY);
    state.dragging.px=x; state.dragging.py=y;

    const s=state.cell, p=state.dragging.piece, liftY=72, offsetX=8;
    const baseX = x - (p.w*s)/2 + offsetX;
    const baseY = y - (p.h*s)/2 - liftY;

    let gx=Math.round(baseX/s), gy=Math.round(baseY/s);
    const maxX=BOARD_SIZE-p.w, maxY=BOARD_SIZE-p.h;
    if(gx<0||gx>maxX||gy<0||gy>maxY){ state.dragging.valid=false; state.dragging.gx=null; state.dragging.gy=null; }
    else { const ok=canPlace(p,gx,gy); state.dragging.valid=ok; state.dragging.gx=gx; state.dragging.gy=gy; }
    requestDraw();
  }
  function onPointerUp(){
    if(!POINTER.active||!state.dragging) return;
    const d=state.dragging; const slot=trayEl?.querySelector(`.slot[data-index="${POINTER.fromSlotIndex}"]`);
    POINTER.active=false; document.body.style.cursor='';
    if(d.valid && d.gx!=null && d.gy!=null) place(d.piece,d.gx,d.gy);
    else if(slot) slot.classList.remove('used');
    state.dragging=null;
  }
  addEventListener('pointermove', onPointerMove, {passive:false});
  addEventListener('pointerup', onPointerUp, {passive:true});
  addEventListener('pointercancel', onPointerUp, {passive:true});

  // ----------------------------------------------------------------------------
  // UI / NAV
  // ----------------------------------------------------------------------------
  function showToast(msg){
    let t=document.getElementById('toast');
    if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);
      Object.assign(t.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',background:'rgba(12,14,22,.82)',color:'#e8ecf1',padding:'10px 14px',borderRadius:'12px',boxShadow:'0 10px 30px rgba(0,0,0,.35)',zIndex:99,transition:'opacity .25s',opacity:'0',border:'1px solid rgba(255,255,255,.06)'}); }
    t.textContent=msg; t.style.opacity='1'; setTimeout(()=>{ t.style.opacity='0'; }, 1600);
  }
  function updateSoundLabel(){ setSound && (setSound.textContent = settings.sound?'🔈 On':'🔇 Off'); }
  function applyTheme(t){ document.body.classList.toggle('light', t==='light'); }
  function updateBestBoard(){
    if(bestClassicEl)   bestClassicEl.textContent = bestByMode.classic||0;
    if(bestObstaclesEl) bestObstaclesEl.textContent = bestByMode.obstacles||0;
    if(bestZenEl)       bestZenEl.textContent = bestByMode.zen||0;
  }

  // ----------------------------------------------------------------------------
  // SETTINGS / STORAGE
  // ----------------------------------------------------------------------------
  function saveBest(b){ LS('bp8.best', JSON.stringify(b)); }
  function loadBest(){ const s=LS('bp8.best'); try{ return s? JSON.parse(s):null; }catch(e){ return null; } }

  // ----------------------------------------------------------------------------
  // EVENT WIRING
  // ----------------------------------------------------------------------------
  resetBtn?.addEventListener('click', ()=> newGame(state.mode));
  backBtn?.addEventListener('click', ()=> goHome());

  settingsBtn?.addEventListener('click', ()=> settingsModal.style.display='flex');
  closeSettings?.addEventListener('click', ()=> settingsModal.style.display='none');
  settingsModal?.querySelector('.backdrop')?.addEventListener('click', ()=> settingsModal.style.display='none');

  setTheme?.addEventListener('click', ()=>{ settings.theme=settings.theme==='dark'?'light':'dark'; LS('bp8.theme',settings.theme); applyTheme(settings.theme); });
  setSound?.addEventListener('click', ()=>{ settings.sound=!settings.sound; LS('bp8.sound', settings.sound?'1':'0'); updateSoundLabel(); });
  resetBest?.addEventListener('click', ()=>{ localStorage.removeItem('bp8.best'); state.best={classic:0,obstacles:0,zen:0}; bestEl && (bestEl.textContent=0); updateBestBoard(); showToast('Best resetovan'); });

  runTestsBtn?.addEventListener('click', ()=>{ const {passed,failed}=runTests(); showToast(`Testovi: ${passed} ✅ / ${failed} ❌`); });

  achBtn?.addEventListener('click', ()=> showToast('Dostignuća — uskoro'));

  playAgain?.addEventListener('click', ()=>{ gameOver.style.display='none'; newGame(state.mode); });
  goMenu?.addEventListener('click', ()=>{ gameOver.style.display='none'; goHome(); });

  startClassic?.addEventListener('click', ()=> startGame('classic'));
  startObstacles?.addEventListener('click', ()=> startGame('obstacles'));
  startZen?.addEventListener('click', ()=> startGame('zen'));

  function startGame(mode){
    state.mode=mode||'classic';
    start&&(start.style.display='none');
    app&&(app.style.display='flex');
    sizeToScreen();
    newGame(mode);
  }
  function goHome(){
    app&&(app.style.display='none');
    start&&(start.style.display='flex');
    state.dragging=null;
  }

  function newGame(mode){
    // reset grid
    state.grid=createGrid(BOARD_SIZE);
    // obstacles
    if(mode==='obstacles'){
      const n = 6 + Math.floor(Math.random()*3); // 6..8 obstacles
      for(let i=0;i<n;i++){
        const x=Math.floor(Math.random()*BOARD_SIZE);
        const y=Math.floor(Math.random()*BOARD_SIZE);
        if(state.grid[y][x]===0) state.grid[y][x]=2; // 2 = obstacle
      }
    }
    // zen ignores game over
    state.score=0; if(scoreEl) scoreEl.textContent=0;
    if(bestEl) bestEl.textContent = String(state.best[mode]||0);
    state.hand=[]; refillHand(); requestDraw(); showToast(mode.charAt(0).toUpperCase()+mode.slice(1));
  }

  // ----------------------------------------------------------------------------
  // TESTS
  // ----------------------------------------------------------------------------
  function runTests(){
    const results=[]; const log=(n,ok)=>{ results.push({n,ok}); (ok?console.log:console.error)(`[TEST] ${n}: ${ok?'PASS':'FAIL'}`); };
    try{
      log('anyFits defined', typeof anyFits==='function');
      const p={blocks:[[0,0],[1,0]], w:2,h:1,color:'#fff',id:'t'};
      log('canPlace OOB false', canPlace(p,-1,0)===false);
      // row clear
      state.grid=createGrid(BOARD_SIZE); for(let x=0;x<BOARD_SIZE-1;x++) state.grid[0][x]=1;
      const s0=state.score; place({blocks:[[0,0]],w:1,h:1,color:'#fff',id:'t2'}, BOARD_SIZE-1, 0);
      log('row clear adds pts', state.score>s0);
      // anyFits false when board filled
      state.grid=createGrid(BOARD_SIZE); for(let y=0;y<BOARD_SIZE;y++) for(let x=0;x<BOARD_SIZE;x++) state.grid[y][x]=1;
      state.hand=[{blocks:[[0,0]],w:1,h:1,used:false,color:'#fff',id:'z'}];
      log('anyFits=false on full board', anyFits()===false);
    }catch(e){ console.error(e); }
    return {passed:results.filter(r=>r.ok).length, failed:results.filter(r=>!r.ok).length};
  }

  // ----------------------------------------------------------------------------
  // DRAW LOOP QUEUE
  // ----------------------------------------------------------------------------
  let drawQueued=false;
  function requestDraw(){ if(!drawQueued){ drawQueued=true; requestAnimationFrame(()=>{ drawQueued=false; draw(); }); } }

  // ----------------------------------------------------------------------------
  // BOOTSTRAP
  // ----------------------------------------------------------------------------
  sizeToScreen();
  drawStartAurora();

  // If start buttons missing (e.g. dev sandbox), jump straight into app
  if(!startClassic){ start&&(start.style.display='none'); app&&(app.style.display='flex'); newGame('classic'); }

})();
