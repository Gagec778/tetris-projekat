(function(){
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // ===== DOM =====
  const canvas = document.getElementById('game');
  const ctx    = canvas?.getContext('2d', { alpha: true });
  const fx     = document.getElementById('fx');
  const fctx   = fx?.getContext('2d', { alpha: true });
  const app    = document.getElementById('app');
  const startScreen = document.getElementById('startScreen');
  const bgCnv  = document.getElementById('bg');

  if (ctx)  ctx.imageSmoothingEnabled = false;
  if (fctx) fctx.imageSmoothingEnabled = false;

  // UI
  const trayEl   = document.getElementById('tray');
  const scoreEl  = document.getElementById('score');
  const bestEl   = document.getElementById('best');
  const resetBtn = document.getElementById('reset');
  const backBtn  = document.getElementById('backBtn');

  const settingsBtn   = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const setTheme      = document.getElementById('setTheme');
  const setSound      = document.getElementById('setSound');
  const setMode       = document.getElementById('setMode');
  const resetBest     = document.getElementById('resetBest');
  const closeSettings = document.getElementById('closeSettings');
  const runTestsBtn   = document.getElementById('runTests');

  const startClassic  = document.getElementById('startClassic');
  const achMenuBtn    = document.getElementById('achBtn');

  const hud = document.querySelector('.hud');
  const goStats  = document.getElementById('goStats');
  const playAgain= document.getElementById('playAgain');
  const goMenu   = document.getElementById('goMenu');
  const gameOver = document.getElementById('gameOver');

  // ===== CONFIG =====
  const BOARD_SIZE = 8;
  const COMBO_WINDOW = 360;
  const COLORS = [ // tople, svetle, premium
    '#FF9F1C','#FFB703','#F77F00','#FFA62B','#FF6B6B',
    '#F94144','#F3722C','#F8961E','#FFD166','#F6BD60',
    '#F28482','#E56B6F','#F08A5D','#FFC15E'
  ];

  // ===== SETTINGS / LS =====
  const LS=(k,v)=> (v===undefined? localStorage.getItem(k) : localStorage.setItem(k,v));
  const settings = {
    theme: LS('bp10.theme') || 'dark',
    sound: LS('bp10.sound')!==null ? LS('bp10.sound')==='1' : true,
    mode:  LS('bp10.mode') || 'classic',
  };
  applyTheme(settings.theme); updateSoundLabel(); updateModeLabel();

  // ===== RNG / Audio / Haptics =====
  const rnd = ()=> Math.random();
  let audioCtx=null;
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

  // ===== STATE =====
  let state = {
    grid: createGrid(),
    cell: 36,
    score: 0, best: Number(LS('bp10.best')||0),
    hand: [], dragging: null,
    combo: 0, comboTimer: 0,
  };
  bestEl && (bestEl.textContent = state.best);

  // ===== SIZE / LAYOUT =====
  function sizeToScreen(){
    if(!canvas || !ctx) return;
    const headerH = document.querySelector('header')?.offsetHeight || 60;
    const trayH   = trayEl?.offsetHeight || 120;
    const chrome  = 28;
    const availH  = Math.max(260, window.innerHeight - headerH - trayH - chrome);
    const availW  = Math.min(document.documentElement.clientWidth, 720) - 32;
    const side    = Math.max(240, Math.min(availW, availH));
    const cell    = Math.floor(side / BOARD_SIZE);
    const px      = cell * BOARD_SIZE;

    // game canvas
    canvas.style.width = px+'px'; canvas.style.height = px+'px';
    if(fx){ fx.style.width = px+'px'; fx.style.height = px+'px'; }
    canvas.width = Math.floor(px * DPR); canvas.height = Math.floor(px * DPR);
    if(fx){ fx.width = Math.floor(px * DPR); fx.height = Math.floor(px * DPR); }
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(DPR, DPR);
    if(fctx){ fctx.setTransform(1,0,0,1,0,0); }

    // start aurora bg
    if(bgCnv){
      bgCnv.width  = Math.floor(window.innerWidth * DPR);
      bgCnv.height = Math.floor(window.innerHeight * DPR);
    }

    state.cell = cell;
    requestDraw();
  }
  addEventListener('resize', sizeToScreen, {passive:true});

  // ===== HELPERS =====
  function createGrid(){ return Array.from({length:BOARD_SIZE},()=>Array(BOARD_SIZE).fill(0)); }
  function hexToRgb(hex){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim()); if(!m) return {r:255,g:200,b:150}; return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)}; }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function adjustColor(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r+(255-r)*amt),0,255); const ng=clamp(Math.round(g+(255-g)*amt),0,255); const nb=clamp(Math.round(b+(255-b)*amt),0,255); return `rgb(${nr},${ng},${nb})`; }
  function darkenColor(hex,amt){ const {r,g,b}=hexToRgb(hex); const nr=clamp(Math.round(r*(1-amt)),0,255); const ng=clamp(Math.round(g*(1-amt)),0,255); const nb=clamp(Math.round(b*(1-amt)),0,255); return `rgb(${nr},${ng},${nb})`; }
  function getCss(v){ return getComputedStyle(document.body).getPropertyValue(v); }
  const snap=(n)=>Math.round(n)+0.5;
  function rrPath(c,x,y,w,h,r){
    r = Math.min(r, w*0.5, h*0.5);
    const x0=snap(x), y0=snap(y), x1=snap(x+w), y1=snap(y+h), rr=Math.round(r);
    c.beginPath();
    c.moveTo(x0+rr,y0); c.lineTo(x1-rr,y0); c.quadraticCurveTo(x1,y0,x1,y0+rr);
    c.lineTo(x1,y1-rr); c.quadraticCurveTo(x1,y1,x1-rr,y1);
    c.lineTo(x0+rr,y1); c.quadraticCurveTo(x0,y1,x0,y1-rr);
    c.lineTo(x0,y0+rr); c.quadraticCurveTo(x0,y0,x0+rr,y0);
    c.closePath();
  }

  // ===== AURORA (svetlija) =====
  function drawAurora(c,w,h){
    c.save();
    const bg = c.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0.00, 'rgba(160,210,255,0.32)');
    bg.addColorStop(0.50, 'rgba(220,255,230,0.30)');
    bg.addColorStop(1.00, 'rgba(255,210,160,0.28)');
    c.fillStyle = bg; c.fillRect(0,0,w,h);

    c.globalCompositeOperation='screen';
    const g1 = c.createRadialGradient(w*0.25, h*0.35, 10, w*0.25, h*0.35, Math.max(w,h)*0.8);
    g1.addColorStop(0,'rgba(120,200,255,0.34)'); g1.addColorStop(1,'rgba(120,200,255,0)');
    c.fillStyle=g1; c.fillRect(0,0,w,h);
    const g2 = c.createRadialGradient(w*0.75, h*0.70, 10, w*0.75, h*0.70, Math.max(w,h)*0.9);
    g2.addColorStop(0,'rgba(255,180,150,0.30)'); g2.addColorStop(1,'rgba(255,180,150,0)');
    c.fillStyle=g2; c.fillRect(0,0,w,h);
    c.restore();
  }

  // Start-screen aurora animator
  function drawStartAurora(){
    if(!bgCnv) return;
    const b = bgCnv.getContext('2d');
    b.setTransform(1,0,0,1,0,0);
    b.scale(DPR,DPR);
    b.clearRect(0,0,bgCnv.width,bgCnv.height);
    drawAurora(b, window.innerWidth, window.innerHeight);
    requestAnimationFrame(drawStartAurora);
  }

  // ===== GLASS BLOCK =====
  function drawGlassBlock(c, x, y, s, baseColor, {alpha=1, placed=false}={}){
    c.save(); c.globalAlpha = alpha;

    // telo
    rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22));
    const body = c.createLinearGradient(x, y, x, y+s);
    body.addColorStop(0.00, adjustColor(baseColor, .35));
    body.addColorStop(0.50, baseColor);
    body.addColorStop(1.00, darkenColor(baseColor, .28));
    c.fillStyle = body; c.fill();

    // debljina (multiply)
    const inner = c.createLinearGradient(x, y, x, y+s);
    inner.addColorStop(0.00,'rgba(0,0,0,0)');
    inner.addColorStop(1.00,'rgba(0,0,0,.18)');
    c.save(); c.globalCompositeOperation='multiply';
    rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22));
    c.fillStyle = inner; c.fill(); c.restore();

    // specular
    const spec = c.createLinearGradient(x, y, x+s, y+s);
    spec.addColorStop(0.00,'rgba(255,255,255,.70)');
    spec.addColorStop(0.18,'rgba(255,255,255,.25)');
    spec.addColorStop(0.55,'rgba(255,255,255,0)');
    c.save(); c.globalCompositeOperation='screen';
    rrPath(c, x+2, y+2, s-4, s-4, Math.max(5, s*0.18));
    c.fillStyle = spec; c.fill(); c.restore();

    // rubovi
    rrPath(c, x+1, y+1, s-2, s-2, Math.max(6, s*0.22));
    c.lineWidth = Math.max(1, s*.06); c.strokeStyle='rgba(0,0,0,.45)'; c.stroke();
    rrPath(c, x+2, y+2, s-4, s-4, Math.max(5, s*0.18));
    c.lineWidth = Math.max(1, s*.04); c.strokeStyle='rgba(255,255,255,.16)'; c.stroke();

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
  function drawPreviewCell(c, x, y, s, baseColor, ok){
    drawGlassBlock(c, x, y, s, ok ? baseColor : '#c65454', {alpha: ok? .97 : .90});
  }

  // ===== SHAPES =====
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
  function refillHand(){ state.hand=[newPiece(),newPiece(),newPiece()]; renderTray(); }

  // ===== RULES =====
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

  // ===== DRAW =====
  function draw(){
    if(!canvas||!ctx) return;
    const s=state.cell, W=s*BOARD_SIZE, H=s*BOARD_SIZE;

    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.scale(DPR, DPR);

    // 1) Aurora kao pozadina canvasa
    drawAurora(ctx, W, H);

    // 2) Stakleni panel (prigušava auroru taman toliko da grid/komadi budu čitljivi)
    rrPath(ctx,0,0,W,H,18);
    const panel=ctx.createLinearGradient(0,0,0,H);
    panel.addColorStop(0,'rgba(12,16,24,.18)');
    panel.addColorStop(1,'rgba(12,16,24,.24)');
    ctx.fillStyle=panel; ctx.fill();

    rrPath(ctx,1,1,W-2,H-2,16);
    ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.lineWidth=1; ctx.stroke();

    // 3) GRID — prazne ćelije: transparentne (aurora se vidi) + diskretan okvir i vrlo blaga popuna
    for(let y=0;y<BOARD_SIZE;y++){
      for(let x=0;x<BOARD_SIZE;x++){
        const px=x*s, py=y*s, v=state.grid[y][x];
        if(v===1){
          drawPlacedCell(ctx,px,py,s);
        } else {
          // blaga, jednolična popuna (5%): rasterećuje oko, ali i dalje „aurora”
          rrPath(ctx,px+1,py+1,s-2,s-2,9);
          const fill=ctx.createLinearGradient(px,py,px,py+s);
          fill.addColorStop(0,'rgba(255,255,255,.05)');
          fill.addColorStop(1,'rgba(0,0,0,.06)');
          ctx.fillStyle=fill; ctx.fill();

          // tanak unutrašnji border
          rrPath(ctx,px+1.5,py+1.5,s-3,s-3,8);
          ctx.strokeStyle='var(--grid-border)'; ctx.lineWidth=1; ctx.stroke();
        }
      }
    }

    // 4) preview iznad prsta (bez senke)
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

  // ===== FX (lagano) =====
  const particles=[]; const scorePopups=[]; let comboFlash=0, comboFlashText='';
  function spawnParticles(cells){
    if(!fx||!fctx) return;
    const s=state.cell, d=DPR;
    for(const [x,y] of cells){
      for(let j=0;j<6;j++){
        particles.push({ x:(x+0.5)*s*d, y:(y+0.5)*s*d, vx:(Math.random()-0.5)*2, vy:(-Math.random()*2-0.5), life:40 });
      }
    }
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

    // score pop
    for(let i=0;i<scorePopups.length;i++){
      const p=scorePopups[i]; p.y-=0.4; p.life--; const a=Math.max(0,p.life/40);
      fctx.globalAlpha=a; fctx.font=`${Math.max(12,12*DPR)}px system-ui,sans-serif`;
      fctx.textAlign='center'; fctx.fillStyle='rgba(255,215,130,.95)'; fctx.fillText(p.txt, p.x, p.y);
    }
    for(let i=scorePopups.length-1;i>=0;i--) if(scorePopups[i].life<=0) scorePopups.splice(i,1);

    requestAnimationFrame(stepFX);
  }
  requestAnimationFrame(stepFX);

  // ===== GAMEPLAY =====
  function scoreForClear(c){ return c*10 + (c>1 ? (c-1)*5 : 0); }
  function place(piece,gx,gy){
    for(const [dx,dy] of piece.blocks){ state.grid[gy+dy][gx+dx]=1; }

    const fullRows=[], fullCols=[];
    for(let y=0;y<BOARD_SIZE;y++){ if(state.grid[y].every(v=>v===1)) fullRows.push(y); }
    for(let x=0;x<BOARD_SIZE;x++){ let ok=true; for(let y=0;y<BOARD_SIZE;y++){ if(state.grid[y][x]!==1){ ok=false; break; } } if(ok) fullCols.push(x); }

    const cleared=fullRows.length+fullCols.length;
    if(cleared>0){
      const cells=[];
      for(const r of fullRows){ for(let x=0;x<BOARD_SIZE;x++){ cells.push([x,r]); } state.grid[r]=Array(BOARD_SIZE).fill(0); }
      for(const c of fullCols){ for(let y=0;y<BOARD_SIZE;y++){ cells.push([c,y]); state.grid[y][c]=0; } }
      spawnParticles(cells);
      beep(760,.08,'triangle',0.22); hapt(28);
    } else { beep(520,.05,'sine',0.16); hapt(12); }

    const baseGain=piece.blocks.length, clearBonus=scoreForClear(cleared);
    let comboMult=1;
    if(cleared>0){
      state.combo=Math.min(state.combo+1,9); state.comboTimer=COMBO_WINDOW; comboMult=Math.max(1,state.combo);
      comboFlash=48; comboFlashText=`x${comboMult}`;
    } else state.combo=0;

    const gainNow=(baseGain+clearBonus)*comboMult;
    state.score+=gainNow; scoreEl && (scoreEl.textContent=state.score);

    if(fx){ const cx=(gx+piece.w/2)*state.cell*DPR, cy=(gy+piece.h/2)*state.cell*DPR; scorePopups.push({x:cx,y:cy,txt:(cleared>0&&comboMult>1)?`+${gainNow} ×${comboMult}`:`+${gainNow}`,life:40}); }

    if(state.score>state.best){ state.best=state.score; LS('bp10.best', String(state.best)); bestEl && (bestEl.textContent=state.best); }

    piece.used=true;
    state.hand = state.hand.map(p => p.id===piece.id ? {...p, used:true} : p);
    renderTray();

    if(state.hand.every(p=>p.used)) refillHand();
    if(!anyFits()){ goStats && (goStats.textContent=`Score: ${state.score} • Best: ${state.best}`); gameOver && (gameOver.style.display='flex'); beep(220,0.15); hapt(40); }
    requestDraw();
  }

  // ===== TRAY =====
  function drawPieceToCanvas(piece){
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
      div.appendChild(drawPieceToCanvas(p));
      if(!p.used) div.addEventListener('pointerdown', startDragFromSlot, {passive:false});
      trayEl.appendChild(div);
    });
  }

  // ===== DRAGGING =====
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
    state.dragging={piece,gx:null,gy:null,valid:false,px:null,py:null};
    target.classList.add('used');
    try{ target.setPointerCapture && target.setPointerCapture(e.pointerId); }catch(_){}
    document.body.style.cursor='grabbing';
    e.preventDefault(); e.stopPropagation();
  }
  function onPointerMove(e){
    if(!POINTER.active||!state.dragging) return;
    const {x,y}=getCanvasPosFromClient(e.clientX, e.clientY);
    state.dragging.px = x; state.dragging.py = y;

    const s = state.cell;
    const p = state.dragging.piece;
    const liftY=72, offsetX=8;
    const baseX = x - (p.w*s)/2 + offsetX;
    const baseY = y - (p.h*s)/2 - liftY;

    let gx = Math.round(baseX / s);
    let gy = Math.round(baseY / s);
    const maxX=BOARD_SIZE - p.w, maxY=BOARD_SIZE - p.h;
    if(gx<0||gx>maxX||gy<0||gy>maxY){ state.dragging.valid=false; state.dragging.gx=null; state.dragging.gy=null; }
    else { const ok = canPlace(p,gx,gy); state.dragging.valid=ok; state.dragging.gx=gx; state.dragging.gy=gy; }

    requestDraw();
  }
  function onPointerUp(){
    if(!POINTER.active||!state.dragging) return;
    const d=state.dragging;
    const slot=trayEl?.querySelector(`.slot[data-index="${POINTER.fromSlotIndex}"]`);
    POINTER.active=false; document.body.style.cursor='';
    if(d.valid && d.gx!=null && d.gy!=null){ place(d.piece,d.gx,d.gy); }
    else { if(slot) slot.classList.remove('used'); }
    state.dragging=null;
  }
  window.addEventListener('pointermove', onPointerMove, {passive:false});
  window.addEventListener('pointerup', onPointerUp, {passive:true});
  window.addEventListener('pointercancel', onPointerUp, {passive:true});

  // ===== UI NAV =====
  function showToast(msg){
    let t=document.getElementById('toast');
    if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);
      Object.assign(t.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',background:'rgba(12,14,22,.82)',color:'#e8ecf1',padding:'10px 14px',borderRadius:'12px',boxShadow:'0 10px 30px rgba(0,0,0,.35)',zIndex:99,transition:'opacity .25s',opacity:'0',border:'1px solid rgba(255,255,255,.06)'}); }
    t.textContent=msg; t.style.opacity='1'; setTimeout(()=>{ t.style.opacity='0'; }, 1600);
  }
  function updateModeLabel(){ setMode && (setMode.textContent='Classic'); }
  function updateSoundLabel(){ setSound && (setSound.textContent = settings.sound?'🔈 On':'🔇 Off'); }
  function applyTheme(t){ document.body.classList.toggle('light', t==='light'); }

  resetBtn?.addEventListener('click', ()=> newGame());
  backBtn?.addEventListener('click', ()=> goHome());
  settingsBtn?.addEventListener('click', ()=> settingsModal.style.display='flex');
  closeSettings?.addEventListener('click', ()=> settingsModal.style.display='none');
  settingsModal?.querySelector('.backdrop')?.addEventListener('click', ()=> settingsModal.style.display='none');
  setTheme?.addEventListener('click', ()=>{ settings.theme=settings.theme==='dark'?'light':'dark'; LS('bp10.theme',settings.theme); applyTheme(settings.theme); });
  setSound?.addEventListener('click', ()=>{ settings.sound=!settings.sound; LS('bp10.sound', settings.sound?'1':'0'); updateSoundLabel(); });
  setMode?.addEventListener('click', ()=> showToast('Classic'));
  resetBest?.addEventListener('click', ()=>{ localStorage.removeItem('bp10.best'); state.best=0; bestEl && (bestEl.textContent=0); showToast('Best resetovan'); });
  runTestsBtn?.addEventListener('click', ()=>{ const {passed,failed}=runTests(); showToast(`Testovi: ${passed} ✅ / ${failed} ❌`); });

  startClassic?.addEventListener('click', ()=> startGame());
  achMenuBtn?.addEventListener('click', ()=> showToast('Dostignuća — uskoro'));

  playAgain?.addEventListener('click', ()=>{ gameOver.style.display='none'; newGame(); });
  goMenu?.addEventListener('click', ()=>{ gameOver.style.display='none'; goHome(); });

  function startGame(){
    startScreen && (startScreen.style.display='none');
    app && (app.style.display='flex');
    sizeToScreen();
    newGame();
  }
  function goHome(){
    app && (app.style.display='none');
    startScreen && (startScreen.style.display='flex');
    state.dragging=null;
  }

  function newGame(){
    state.grid=createGrid();
    state.score=0; scoreEl && (scoreEl.textContent=0);
    state.hand=[]; state.combo=0; state.comboTimer=0;
    refillHand(); requestDraw();
    showToast('Classic');
  }

  // ===== TESTS =====
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

  // ===== DRAW LOOP =====
  let drawQueued=false;
  function requestDraw(){ if(!drawQueued){ drawQueued=true; requestAnimationFrame(()=>{ drawQueued=false; draw(); }); } }

  // ===== STARTUP =====
  sizeToScreen();
  drawStartAurora();
  if(!startClassic){ // fallback ako nema menija
    startScreen && (startScreen.style.display='none');
    app && (app.style.display='flex');
    newGame();
  }
})();
