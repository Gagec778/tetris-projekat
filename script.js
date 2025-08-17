/* =========================
   Puzzle Universe – FINAL TEST BUILD
   ========================= */

(() => {
  // ---------- UTIL ----------
  const $ = (sel, parent = document) => parent.querySelector(sel);
  const $$ = (sel, parent = document) => [...parent.querySelectorAll(sel)];

  const Sound = {
    play: () => {}, // stub
    vibrate: (ms = 10) => { if (navigator.vibrate) navigator.vibrate(ms); }
  };

  const toast = (msg, cls='') => {
    const area = $('#notification-area');
    const t = document.createElement('div');
    t.className = `notification ${cls}`;
    t.textContent = msg;
    area.appendChild(t);
    setTimeout(()=> t.remove(), 2500);
  };

  // ---------- ECONOMY / STORAGE ----------
  const Storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch { return fallback; }
    },
    set(key, val) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  };

  const Economy = {
    get gems(){ return Storage.get('gems', 100000); }, // TEST BUDGET
    set gems(v){ Storage.set('gems', Math.max(0, Math.floor(v))); UI.updateGems(); },

    add(n){ this.gems = this.gems + n; },
    spend(n){
      if (this.gems < n) return false;
      this.gems = this.gems - n; return true;
    }
  };

  // ---------- AD SDK STUB ----------
  const Ads = {
    async showRewarded(label='ad'){
      // simulate watch with 1.2s delay
      await new Promise(r=>setTimeout(r,1200));
      return true; // rewarded
    }
  };

  // ---------- SHOP DATA ----------
  const ShopData = {
    themes: [
      { id:'dark', name:'Dark', applyClass:'dark-theme', price: 2500, rarity:'Common' },
      { id:'neon', name:'Neon', applyClass:'neon-theme', price: 8000, rarity:'Rare' },
      { id:'gold', name:'Gold', applyClass:'gold-theme', price: 20000, rarity:'Epic' },
    ],
    blocks: [
      { id:'default', name:'Default', applyClass:'block-style-default', price: 1500, rarity:'Common' },
      { id:'neon', name:'Neon', applyClass:'block-style-neon', price: 9000, rarity:'Rare' },
      { id:'wood', name:'Wood', applyClass:'block-style-wood', price: 12000, rarity:'Rare' },
      { id:'retro', name:'Retro', applyClass:'block-style-retro', price: 16000, rarity:'Epic' },
    ]
  };

  const Inventory = {
    ownedThemes: Storage.get('ownedThemes', { dark:true }),
    ownedBlocks: Storage.get('ownedBlocks', { default:true }),
    activeTheme: Storage.get('activeTheme', 'dark'),
    activeBlock: Storage.get('activeBlock', 'default'),

    save(){
      Storage.set('ownedThemes', this.ownedThemes);
      Storage.set('ownedBlocks', this.ownedBlocks);
      Storage.set('activeTheme', this.activeTheme);
      Storage.set('activeBlock', this.activeBlock);
    }
  };

  const UI = {
    el: {
      screens: {
        main: $('#main-menu-screen'),
        shop: $('#shop-screen'),
        achievements: $('#achievements-screen'),
        game: $('#game-screen'),
        post: $('#post-game-screen')
      },
      buttons: {
        shop: $('#shop-btn'), ach: $('#achievements-btn'),
        daily: $('#daily-reward-btn'), settings: $('#settings-btn')
      },
      tetris: {
        area: $('#tetris-game-area'),
        board: $('#tetris-board'),
        score: $('#tetris-score'),
        best: $('#tetris-best-score'),
        lines: $('#tetris-lines'),
        level: $('#tetris-level'),
        next: $('#tetris-next-piece'),
        back: $('#back-btn-tetris'),
        pause: $('#pause-btn-tetris')
      },
      puzzle: {
        area: $('#puzzle-game-area'),
        board: $('#puzzle-board'),
        score: $('#puzzle-score'),
        pieces: $('#puzzle-pieces-container'),
        pause: $('#pause-btn-puzzle'),
        timer: $('#game-timer')
      },
      gems: $('#gem-balance'),
      shopTabs: $$('.shop-tab'),
      shopThemes: $('#shop-themes-container'),
      shopBlocks: $('#shop-blocks-container'),
      achievementsContainer: $('#achievements-container'),
      modals: {
        daily: $('#daily-reward-center-modal'),
        settings: $('#settings-modal'),
        confirm: $('#confirm-modal')
      },
      post: {
        title: $('#post-game-title'),
        score: $('#post-game-score'),
        bestBanner: $('#post-game-new-best'),
        stats: $('#post-game-stats'),
        restart: $('#restart-btn-pogs'),
        back: $('#back-to-menu-btn-pogs')
      }
    },

    switchScreen(target){
      $$('.screen').forEach(s=>s.classList.remove('active'));
      target.classList.add('active');
    },

    updateGems(){
      UI.el.gems.textContent = Economy.gems.toLocaleString('sr-RS');
    },

    applyThemeBlock(){
      document.body.classList.remove('dark-theme','neon-theme','gold-theme');
      document.body.classList.add(ShopData.themes.find(t=>t.id===Inventory.activeTheme).applyClass);

      document.body.classList.remove('block-style-default','block-style-neon','block-style-wood','block-style-retro');
      document.body.classList.add(ShopData.blocks.find(b=>b.id===Inventory.activeBlock).applyClass);
    }
  };

  // ---------- ACHIEVEMENTS ----------
  const Ach = {
    // One-time achievements (claim once)
    list: [
      { id:'tetris_1k', title:'First 1,000', desc:'Osvoji 1,000 poena u Tetrisu', goal:1000, game:'tetris', reward:120, },
      { id:'tetris_10_lines', title:'Line Rookie', desc:'Očisti 10 linija', goal:10, metric:'lines', game:'tetris', reward:150 },
      { id:'puzzle_2k', title:'Puzzle Apprentice', desc:'Osvoji 2,000 poena u Puzzle', goal:2000, game:'puzzle', reward:140 },
      { id:'sessions_3', title:'Back Again', desc:'Pokreni igru 3 dana', goal:3, game:'meta', metric:'sessions', reward:160 },
      { id:'shop_first', title:'Shopper', desc:'Kupi bilo šta u shopu', goal:1, game:'meta', metric:'purchases', reward:180 },
    ],
    state: Storage.get('ach_state', {}),

    save(){ Storage.set('ach_state', this.state); },

    progress: {
      tetris:{ score:0, lines:0 },
      puzzle:{ score:0 },
      meta: { sessions: Storage.get('sessions_count', 0), purchases: Storage.get('purchases_count', 0) }
    },

    incSession(){
      this.progress.meta.sessions += 1;
      Storage.set('sessions_count', this.progress.meta.sessions);
      this.render();
    },

    incPurchase(){
      this.progress.meta.purchases += 1;
      Storage.set('purchases_count', this.progress.meta.purchases);
      this.render();
    },

    addScore(game, points){
      this.progress[game].score = Math.max(this.progress[game].score, points);
      this.render();
    },
    addLines(n){
      this.progress.tetris.lines += n;
      this.render();
    },

    isUnlocked(a){
      let cur = 0;
      if (a.metric==='lines') cur = this.progress.tetris.lines;
      else if (a.metric==='sessions') cur = this.progress.meta.sessions;
      else if (a.metric==='purchases') cur = this.progress.meta.purchases;
      else cur = this.progress[a.game].score;
      return cur >= a.goal;
    },

    render(){
      const c = UI.el.achievementsContainer;
      c.innerHTML = '';
      this.list.forEach(a=>{
        const unlocked = this.isUnlocked(a);
        const claimed = this.state[a.id]?.claimed;
        const card = document.createElement('div');
        card.className = 'achievement-card';
        if (unlocked && !claimed) card.classList.add('pulse');

        const badge = document.createElement('div');
        badge.className = 'badge';
        badge.textContent = unlocked ? (claimed ? 'CLAIMED' : 'UNLOCKED') : `${this.progressText(a)}`;
        card.appendChild(badge);

        const h3 = document.createElement('h3'); h3.textContent = a.title;
        const p = document.createElement('p'); p.textContent = a.desc;
        const r = document.createElement('div'); r.textContent = `Reward: 💎 ${a.reward}`;
        const acts = document.createElement('div'); acts.className='achievement-actions';

        const claim = document.createElement('button');
        claim.className='primary-btn';
        claim.textContent = claimed ? 'Claimed' : (unlocked ? 'Claim' : 'Locked');
        claim.disabled = !unlocked || claimed;
        claim.addEventListener('click', async ()=>{
          // Optional: double via 2 ads
          const wantDouble = confirm('Gledaj 2 reklame za duplu nagradu?');
          if (wantDouble){
            await Ads.showRewarded('ach1'); await Ads.showRewarded('ach2');
            Economy.add(a.reward*2);
          } else {
            Economy.add(a.reward);
          }
          this.state[a.id] = { claimed:true, ts: Date.now() };
          this.save();
          this.render();
          toast(`🏆 Preuzeto: ${a.title}`, 'toast-success');
        });

        acts.appendChild(claim);
        card.appendChild(h3); card.appendChild(p); card.appendChild(r); card.appendChild(acts);
        c.appendChild(card);
      });
    },

    progressText(a){
      let cur = 0;
      if (a.metric==='lines') cur = this.progress.tetris.lines;
      else if (a.metric==='sessions') cur = this.progress.meta.sessions;
      else if (a.metric==='purchases') cur = this.progress.meta.purchases;
      else cur = this.progress[a.game].score;
      return `${Math.min(cur, a.goal)} / ${a.goal}`;
    }
  };

  // ---------- SHOP RENDER ----------
  function renderShop(){
    // Tabs
    UI.el.shopTabs.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        UI.el.shopTabs.forEach(b=>b.classList.remove('active')); btn.classList.add('active');
        $('#shop-themes-container').classList.toggle('active', btn.dataset.tab==='themes');
        $('#shop-blocks-container').classList.toggle('active', btn.dataset.tab==='blocks');
      });
    });

    // THEME ITEMS
    UI.el.shopThemes.innerHTML = '';
    ShopData.themes.forEach(t=>{
      const item = document.createElement('div');
      item.className='shop-item';
      if (Inventory.activeTheme===t.id) item.classList.add('active-item');
      const prev = document.createElement('div');
      prev.className='shop-item-preview';
      // Mini preview board with colored cells
      const mini = document.createElement('div');
      mini.style.display='grid';
      mini.style.gridTemplateColumns='repeat(6, 16px)';
      mini.style.gridGap='2px';
      mini.style.padding='6px';
      mini.style.borderRadius='6px';
      mini.style.background = 'rgba(255,255,255,0.06)';
      const tmpClass = document.body.className;
      document.body.classList.remove('dark-theme','neon-theme','gold-theme');
      document.body.classList.add(t.applyClass);
      for(let i=0;i<12;i++){
        const cell = document.createElement('div');
        cell.className='game-block';
        cell.style.width='16px'; cell.style.height='16px';
        mini.appendChild(cell);
      }
      document.body.className = tmpClass;
      prev.appendChild(mini);

      const name = document.createElement('div'); name.textContent = `${t.name} • ${t.rarity}`;
      const price = document.createElement('div'); price.className='shop-item-price'; price.textContent = `💎 ${t.price}`;
      const btn = document.createElement('button'); btn.className='shop-item-btn';
      const owned = !!Inventory.ownedThemes[t.id];
      btn.textContent = owned ? 'Apply' : 'Buy';

      btn.addEventListener('click', ()=>{
        if (!Inventory.ownedThemes[t.id]){
          if (!Economy.spend(t.price)) { toast('Nemaš dovoljno 💎', 'toast-warn'); return; }
          Inventory.ownedThemes[t.id] = true; Inventory.save();
          Storage.set('purchases_count', (Storage.get('purchases_count',0)+1)); Ach.incPurchase();
        }
        Inventory.activeTheme = t.id; Inventory.save(); UI.applyThemeBlock(); renderShop();
        toast(`Tema primenjena: ${t.name}`, 'toast-success');
      });

      item.appendChild(prev); item.appendChild(name); item.appendChild(price); item.appendChild(btn);
      UI.el.shopThemes.appendChild(item);
    });

    // BLOCK ITEMS
    UI.el.shopBlocks.innerHTML = '';
    ShopData.blocks.forEach(b=>{
      const item = document.createElement('div');
      item.className='shop-item';
      if (Inventory.activeBlock===b.id) item.classList.add('active-item');
      const prev = document.createElement('div'); prev.className='shop-item-preview';
      const palette = document.createElement('div');
      palette.style.display='grid';
      palette.style.gridTemplateColumns='repeat(5, 18px)';
      palette.style.gridGap='3px';
      palette.style.padding='6px';

      const tmpClass2 = document.body.className;
      document.body.classList.remove('block-style-default','block-style-neon','block-style-wood','block-style-retro');
      document.body.classList.add(b.applyClass);
      for(let i=0;i<10;i++){
        const block = document.createElement('div'); block.className='game-block';
        block.style.width='18px'; block.style.height='18px';
        palette.appendChild(block);
      }
      document.body.className = tmpClass2;

      prev.appendChild(palette);
      const name = document.createElement('div'); name.textContent = `${b.name} • ${b.rarity}`;
      const price = document.createElement('div'); price.className='shop-item-price'; price.textContent = `💎 ${b.price}`;
      const btn = document.createElement('button'); btn.className='shop-item-btn';
      const owned = !!Inventory.ownedBlocks[b.id];
      btn.textContent = owned ? 'Apply' : 'Buy';

      btn.addEventListener('click', ()=>{
        if (!Inventory.ownedBlocks[b.id]){
          if (!Economy.spend(b.price)) { toast('Nemaš dovoljno 💎', 'toast-warn'); return; }
          Inventory.ownedBlocks[b.id] = true; Inventory.save();
          Storage.set('purchases_count', (Storage.get('purchases_count',0)+1)); Ach.incPurchase();
        }
        Inventory.activeBlock = b.id; Inventory.save(); UI.applyThemeBlock(); renderShop();
        toast(`Blok skin primenjen: ${b.name}`, 'toast-success');
      });

      item.appendChild(prev); item.appendChild(name); item.appendChild(price); item.appendChild(btn);
      UI.el.shopBlocks.appendChild(item);
    });
  }

  // ---------- NAV ----------
  function bindNav(){
    $('.menu-item[data-game="tetris"]').addEventListener('click', ()=>{
      startTetris();
      UI.switchScreen(UI.el.screens.game);
      UI.el.tetris.area.classList.add('active');
      UI.el.puzzle.area.classList.remove('active');
    });

    $('.menu-item[data-game="block-puzzle"]').addEventListener('click', ()=>{
      startPuzzle();
      UI.switchScreen(UI.el.screens.game);
      UI.el.puzzle.area.classList.add('active');
      UI.el.tetris.area.classList.remove('active');
    });

    UI.el.buttons.shop.addEventListener('click', ()=>{ renderShop(); UI.switchScreen(UI.el.screens.shop); });
    UI.el.buttons.ach.addEventListener('click', ()=>{ Ach.render(); UI.switchScreen(UI.el.screens.achievements); });
    UI.el.buttons.daily.addEventListener('click', ()=>{
      UI.el.modals.daily.classList.add('active');
    });

    $$('#shop-screen .back-to-main-menu, #achievements-screen .back-to-main-menu').forEach(b=>
      b.addEventListener('click', ()=> UI.switchScreen(UI.el.screens.main))
    );

    // Daily modal controls
    UI.el.modals.daily.querySelector('.close-modal').addEventListener('click', ()=> UI.el.modals.daily.classList.remove('active'));
    $('#claim-ad-reward-btn').addEventListener('click', async ()=>{
      const ok = await Ads.showRewarded('daily');
      if (ok){
        const btn = $('#claim-challenge-reward-btn');
        btn.disabled = false;
        toast('Ad watched ✔', 'toast-success');
      }
    });
    $('#claim-challenge-reward-btn').addEventListener('click', ()=>{
      Economy.add(350);
      $('#claim-challenge-reward-btn').disabled = true;
      toast('+350 💎', 'toast-success');
    });

    // Post screen
    UI.el.post.back.addEventListener('click', ()=> UI.switchScreen(UI.el.screens.main));
    UI.el.post.restart.addEventListener('click', ()=>{
      if (UI.el.tetris.area.classList.contains('active')) startTetris();
      if (UI.el.puzzle.area.classList.contains('active')) startPuzzle();
      UI.switchScreen(UI.el.screens.game);
    });
  }

  // ---------- TETRIS ----------
  const Tetris = (function(){
    const W = 10, H = 20;
    const shapes = {
      I:[[1,1,1,1]],
      O:[[1,1],[1,1]],
      T:[[0,1,0],[1,1,1]],
      S:[[0,1,1],[1,1,0]],
      Z:[[1,1,0],[0,1,1]],
      J:[[1,0,0],[1,1,1]],
      L:[[0,0,1],[1,1,1]]
    };
    const colors = ['#00bcd4','#ff9800','#4caf50','#e91e63','#9c27b0','#3f51b5','#ffc107'];

    let board, piece, next, score, lines, level, loopId, dropInterval, lastTime;
    let isPaused=false, gameOver=false;

    // Touch control state
    let touchStartX=0, touchStartY=0, lastTouchY=0, touchStartTime=0, initialPieceX=0;
    const BLOCK_SIZE = 28;
    const HARD_DROP_MIN_Y_DISTANCE = 60;
    const FLICK_MAX_DURATION = 180;
    const TAP_MAX_DURATION = 200;
    const TAP_MAX_DISTANCE = 12;

    function emptyBoard(){ return Array.from({length:H}, ()=> Array(W).fill(0)); }

    function spawnPiece(){
      const keys = Object.keys(shapes);
      const type = keys[Math.floor(Math.random()*keys.length)];
      const shape = shapes[type].map(r=>r.slice());
      const color = colors[Math.floor(Math.random()*colors.length)];
      return { x: Math.floor(W/2)-2, y: 0, shape, color };
    }

    function rotate(mat){
      const M = mat.length, N = mat[0].length;
      const res = Array.from({length:N}, (_,c)=> Array(M).fill(0));
      for(let r=0;r<M;r++) for(let c=0;c<N;c++) res[c][M-1-r] = mat[r][c];
      return res;
    }

    function canMove(dx,dy,shape=piece.shape, px=piece.x, py=piece.y){
      for(let r=0;r<shape.length;r++){
        for(let c=0;c<shape[r].length;c++){
          if (!shape[r][c]) continue;
          const x = px + c + dx, y = py + r + dy;
          if (x<0 || x>=W || y>=H) return false;
          if (y>=0 && board[y][x]) return false;
        }
      }
      return true;
    }

    function mergePiece(){
      for(let r=0;r<piece.shape.length;r++){
        for(let c=0;c<piece.shape[r].length;c++){
          if (piece.shape[r][c]){
            const x = piece.x + c, y = piece.y + r;
            if (y>=0) board[y][x] = {color: piece.color};
          }
        }
      }
    }

    function clearLines(){
      let cleared=0;
      for(let r=H-1;r>=0;r--){
        if (board[r].every(v=>v)){
          board.splice(r,1);
          board.unshift(Array(W).fill(0));
          cleared++; r++;
        }
      }
      if (cleared>0){
        lines += cleared;
        score += cleared * 100; // conservative scoring to slow down achievements
        UI.el.tetris.lines.textContent = lines;
        UI.el.tetris.score.textContent = score;
        Ach.addLines(cleared);
      }
    }

    function hardDrop(){
      while (canMove(0,1)) piece.y++;
      step(); // lock immediately
    }

    function step(time){
      if (gameOver || isPaused) return;
      if (!lastTime) lastTime = performance.now();
      const delta = (performance.now() - lastTime);
      if (delta > dropInterval){
        lastTime = performance.now();
        if (canMove(0,1)) piece.y++;
        else {
          mergePiece();
          clearLines();
          piece = next; next = spawnPiece();
          if (!canMove(0,0,piece.shape, piece.x, piece.y)){
            gameOver = true;
            endGame({game:'tetris', score, lines});
            return;
          }
          renderNext();
        }
        draw();
      }
      loopId = requestAnimationFrame(step);
    }

    function draw(){
      const b = UI.el.tetris.board;
      b.innerHTML='';
      for(let r=0;r<H;r++){
        for(let c=0;c<W;c++){
          const cell = document.createElement('div');
          cell.className = 'tetris-cell';
          if (board[r][c]){
            const blk = document.createElement('div');
            blk.className = 'game-block';
            blk.style.width='100%'; blk.style.height='100%';
            blk.style.backgroundColor = board[r][c].color;
            cell.appendChild(blk);
          }
          b.appendChild(cell);
        }
      }
      // draw piece and ghost
      const ghostY = ghostDropY();
      for(let r=0;r<piece.shape.length;r++){
        for(let c=0;c<piece.shape[r].length;c++){
          if (!piece.shape[r][c]) continue;
          const gx = piece.x + c, gy = ghostY + r;
          const gi = gy*W + gx;
          if (gy>=0){
            const gcell = b.children[gi];
            if (gcell){ gcell.classList.add('ghost'); if (!gcell.firstChild){ const gblk = document.createElement('div'); gblk.className='game-block'; gblk.style.width='100%'; gblk.style.height='100%'; gblk.style.backgroundColor=piece.color; gcell.appendChild(gblk);} }
          }
        }
      }
      for(let r=0;r<piece.shape.length;r++){
        for(let c=0;c<piece.shape[r].length;c++){
          if (!piece.shape[r][c]) continue;
          const x = piece.x + c, y = piece.y + r;
          if (y<0) continue;
          const i = y*W + x;
          const cell = b.children[i];
          if (cell){
            const blk = document.createElement('div');
            blk.className='game-block';
            blk.style.width='100%'; blk.style.height='100%';
            blk.style.backgroundColor = piece.color;
            cell.innerHTML='';
            cell.appendChild(blk);
          }
        }
      }
    }

    function ghostDropY(){
      let gy = piece.y;
      while (canMove(0,1,piece.shape,piece.x,gy)) gy++;
      return gy;
    }

    function renderNext(){
      const n = UI.el.tetris.next;
      n.innerHTML='';
      const w = Math.max(...next.shape.map(r=>r.length));
      n.style.gridTemplateColumns = `repeat(${w}, 12px)`;
      next.shape.forEach(row=>{
        row.forEach(v=>{
          const d = document.createElement('div');
          d.style.width='12px'; d.style.height='12px';
          if (v){ const blk = document.createElement('div'); blk.className='game-block'; blk.style.width='12px'; blk.style.height='12px'; blk.style.backgroundColor=next.color; d.appendChild(blk); }
          n.appendChild(d);
        });
      });
    }

    // Touch controls (user provided, adapted)
    function handleTouchStart(e){
      if (isPaused || gameOver || !piece) return;
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      lastTouchY = touchStartY;
      touchStartTime = performance.now();
      initialPieceX = piece.x;
      window.addEventListener('touchmove', handleTouchMove, {passive:false});
      window.addEventListener('touchend', handleTouchEnd, {passive:false});
    }
    function handleTouchMove(e){
      if (isPaused || gameOver || !piece) return;
      e.preventDefault();
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartX;
      if (currentY - lastTouchY > BLOCK_SIZE){
        if (canMove(0,1)) piece.y++;
        lastTouchY = currentY;
      }
      const blocksMoved = Math.round(deltaX / BLOCK_SIZE);
      const newX = initialPieceX + blocksMoved;
      if (newX !== piece.x){
        if (canMove(newX - piece.x,0)) piece.x = newX;
      }
    }
    function handleTouchEnd(e){
      if (isPaused || gameOver || !piece) return;
      if (e.changedTouches.length===0) return;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      e.preventDefault();
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const touchDuration = performance.now() - touchStartTime;
      if (deltaY > 60 && touchDuration < 180){ piece.x = initialPieceX; hardDrop(); return; }
      if (touchDuration < 200 && Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12){
        // rotate
        const rs = rotate(piece.shape);
        if (canMove(0,0,rs)) piece.shape = rs;
      }
    }

    function start(){
      board = emptyBoard(); piece = spawnPiece(); next = spawnPiece();
      score=0; lines=0; level=1; dropInterval=650; lastTime=0; gameOver=false; isPaused=false;
      UI.el.tetris.score.textContent='0'; UI.el.tetris.lines.textContent='0'; UI.el.tetris.level.textContent='1';
      renderNext(); draw();
      cancelAnimationFrame(loopId); loopId=requestAnimationFrame(step);
      // Input
      UI.el.tetris.pause.onclick = ()=>{ isPaused=!isPaused; if(!isPaused) { lastTime=0; loopId=requestAnimationFrame(step); } };
      UI.el.tetris.back.onclick = ()=>{ cancelAnimationFrame(loopId); UI.switchScreen(UI.el.screens.main); };
      UI.el.tetris.board.addEventListener('touchstart', handleTouchStart, {passive:false});
      // Keyboard (optional on desktop)
      window.onkeydown = (e)=>{
        if (gameOver || isPaused) return;
        if (e.key==='ArrowLeft' && canMove(-1,0)) piece.x--;
        else if (e.key==='ArrowRight' && canMove(1,0)) piece.x++;
        else if (e.key==='ArrowDown' && canMove(0,1)) piece.y++;
        else if (e.key==='ArrowUp'){ const rs=rotate(piece.shape); if (canMove(0,0,rs)) piece.shape=rs; }
        else if (e.key===' '){ hardDrop(); }
        draw();
      };
    }

    return { start };
  })();

  function startTetris(){ Tetris.start(); }

  // ---------- BLOCK PUZZLE ----------
  const BlockPuzzle = (function(){
    const size = 10;
    const board = Array.from({length:size}, ()=> Array(size).fill(0));
    const colors = ['#00bcd4','#ff9800','#4caf50','#e91e63','#9c27b0','#3f51b5','#ffc107'];
    const shapes = [
      [[1]], [[1,1]], [[1,1,1]], [[1,1,1,1]], [[1,1,1,1,1]],
      [[1,1],[1,1]],
      [[0,1,0],[1,1,1],[0,1,0]],
      [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]],
      [[1,1,1],[1,0,0]], [[1,1,1],[0,0,1]],
      [[1,0,1],[1,1,1]], [[1,1],[0,1],[0,1]],
    ];
    let score=0, curPieces=[], dragging=null, ghostCells=[];

    function renderBoard(){
      const b = UI.el.puzzle.board; b.innerHTML='';
      for(let r=0;r<size;r++){
        for(let c=0;c<size;c++){
          const cell = document.createElement('div');
          cell.className='puzzle-cell';
          if (board[r][c]){
            const blk = document.createElement('div'); blk.className='game-block';
            blk.style.width='100%'; blk.style.height='100%';
            blk.style.backgroundColor = board[r][c].color;
            cell.appendChild(blk);
          }
          b.appendChild(cell);
        }
      }
    }

    function genPieces(){
      curPieces = [];
      UI.el.puzzle.pieces.innerHTML='';
      for(let i=0;i<3;i++){
        const shape = shapes[Math.floor(Math.random()*shapes.length)].map(r=>r.slice());
        const color = colors[Math.floor(Math.random()*colors.length)];
        const id = `p${Date.now()}_${i}`;
        curPieces.push({id, shape, color});
        renderPiece(id, shape, color);
      }
    }

    function renderPiece(id, shape, color){
      const el = document.createElement('div');
      el.className='puzzle-piece';
      el.dataset.id = id;
      const w = Math.max(...shape.map(r=>r.length));
      el.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
      shape.forEach(row=>{
        for(let i=0;i<w;i++){
          const v = row[i]||0;
          const cell = document.createElement('div');
          cell.className='puzzle-piece-cell';
          if (v){
            const blk = document.createElement('div'); blk.className='game-block';
            blk.style.width='100%'; blk.style.height='100%';
            blk.style.backgroundColor = color;
            cell.appendChild(blk);
          }
          el.appendChild(cell);
        }
      });
      UI.el.puzzle.pieces.appendChild(el);

      el.addEventListener('touchstart', dragStart, {passive:false});
      el.addEventListener('mousedown', dragStart);
    }

    function getDropRC(dragRect){
      const boardRect = UI.el.puzzle.board.getBoundingClientRect();
      const cellSize = boardRect.width/size;
      const x = dragRect.left - boardRect.left;
      const y = dragRect.top - boardRect.top;
      return {
        r: Math.round(y/cellSize),
        c: Math.round(x/cellSize)
      };
    }

    function canPlace(piece, r, c){
      for(let pr=0;pr<piece.shape.length;pr++){
        for(let pc=0;pc<piece.shape[pr].length;pc++){
          if (!piece.shape[pr][pc]) continue;
          const rr=r+pr, cc=c+pc;
          if (rr<0||cc<0||rr>=size||cc>=size) return false;
          if (board[rr][cc]) return false;
        }
      }
      return true;
    }

    function place(piece, r, c){
      for(let pr=0;pr<piece.shape.length;pr++){
        for(let pc=0;pc<piece.shape[pr].length;pc++){
          if (!piece.shape[pr][pc]) continue;
          const rr=r+pr, cc=c+pc;
          board[rr][cc] = { color: piece.color };
        }
      }
      score += piece.shape.flat().reduce((a,b)=>a+b,0);
      UI.el.puzzle.score.textContent = score;
      clearLines();
      renderBoard();
    }

    function clearLines(){
      const fullRows=[], fullCols=[];
      for(let r=0;r<size;r++){
        if (board[r].every(v=>v)) fullRows.push(r);
      }
      for(let c=0;c<size;c++){
        let ok=true; for(let r=0;r<size;r++) if(!board[r][c]){ ok=false; break; }
        if (ok) fullCols.push(c);
      }
      fullRows.forEach(r=> board[r]=Array(size).fill(0));
      fullCols.forEach(c=> { for(let r=0;r<size;r++) board[r][c]=0; });
      if (fullRows.length || fullCols.length){
        score += (fullRows.length+fullCols.length) * 10;
        UI.el.puzzle.score.textContent=score;
      }
    }

    function dragStart(e){
      e.preventDefault();
      const pieceEl = e.currentTarget;
      const id = pieceEl.dataset.id;
      const piece = curPieces.find(p=>p.id===id);
      dragging = { piece, originEl: pieceEl };
      const clone = pieceEl.cloneNode(true);
      clone.classList.add('dragging');
      document.body.appendChild(clone);
      const rect = pieceEl.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      const offX = touch.clientX - rect.left;
      const offY = touch.clientY - rect.top;

      pieceEl.style.opacity='0.3';

      function move(ev){
        const t = ev.touches ? ev.touches[0] : ev;
        clone.style.left = `${t.clientX - offX}px`;
        clone.style.top  = `${t.clientY - offY}px`;
        renderGhost(piece, clone.getBoundingClientRect());
      }
      function end(){
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', end);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', end);

        clearGhost();

        clone.remove();
        pieceEl.style.opacity='1';

        const {r,c} = getDropRC(clone.getBoundingClientRect());
        if (canPlace(piece, r, c)){
          place(piece, r, c);
          pieceEl.remove();
          curPieces = curPieces.filter(p=>p.id!==piece.id);
          if (curPieces.length===0) genPieces();
        } else {
          pieceEl.classList.add('bad-move'); setTimeout(()=> pieceEl.classList.remove('bad-move'), 250);
          Sound.vibrate(40);
        }
        dragging=null;
      }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', end);
      document.addEventListener('touchmove', move, {passive:false});
      document.addEventListener('touchend', end, {passive:false});
    }

    function renderGhost(piece, dragRect){
      clearGhost();
      const {r,c} = getDropRC(dragRect);
      for(let pr=0;pr<piece.shape.length;pr++){
        for(let pc=0;pc<piece.shape[pr].length;pc++){
          if (!piece.shape[pr][pc]) continue;
          const rr=r+pr, cc=c+pc;
          if (rr<0||cc<0||rr>=size||cc>=size) continue;
          const idx = rr*size + cc;
          const cell = UI.el.puzzle.board.children[idx];
          if (cell){
            cell.classList.add('ghost');
            const blk = document.createElement('div');
            blk.className='game-block'; blk.style.width='100%'; blk.style.height='100%'; blk.style.backgroundColor = piece.color;
            cell.appendChild(blk);
            ghostCells.push(cell);
          }
        }
      }
    }
    function clearGhost(){
      ghostCells.forEach(c=>{ c.classList.remove('ghost'); if (c.lastChild && c.lastChild.classList.contains('game-block') && !c.firstChild) c.innerHTML=''; });
      ghostCells = [];
    }

    function start(){
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) board[r][c]=0;
      score=0; UI.el.puzzle.score.textContent='0';
      renderBoard(); genPieces();
      UI.el.puzzle.pause.onclick = ()=>{ toast('Pause je stub u ovoj verziji.'); };
    }

    return { start };
  })();

  function startPuzzle(){ BlockPuzzle.start(); }

  // ---------- END GAME (shared) ----------
  function endGame({game, score, lines=0}){
    UI.switchScreen(UI.el.screens.post);
    UI.el.post.title.textContent = game==='tetris' ? 'Tetris Over' : 'Puzzle Over';
    UI.el.post.score.textContent = score;
    UI.el.post.bestBanner.style.display = 'none';
    UI.el.post.stats.innerHTML = '';
    const addStat = (k,v)=>{
      const row = document.createElement('div');
      row.className='stat-line';
      row.innerHTML = `<span>${k}</span><span>${v}</span>`;
      UI.el.post.stats.appendChild(row);
    };
    if (game==='tetris'){ addStat('Lines', lines); }
    Ach.addScore(game, score);
  }

  // ---------- INIT ----------
  function init(){
    UI.updateGems();
    UI.applyThemeBlock();
    bindNav();
    renderShop();
    Ach.render();
    Ach.incSession();
  }

  init();
})();
