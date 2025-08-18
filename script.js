/** Puzzle Universe — Final single-file JS (Test gems + Ads stub) **/

const Storage = {
  load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

// --------- ECONOMY & SHOP DATA ---------
const ECONOMY = {
  TEST_GEMS: 100000,
  DAILY_REWARD_AMOUNT: 50,
  PREMIUM_ADS_REQUIRED: 50,
};

// Tematske klase mapirane na CSS varijante tela
const THEMES = [
  { id:"dark",   name:"Dark",    price:1500,  type:"normal",  img:"assets/themes/dark.svg", className:"dark-theme" },
  { id:"light",  name:"Light",   price:1500,  type:"normal",  img:"assets/themes/light.svg", className:"light-theme" },
  { id:"neon",   name:"Neon",    price:5000,  type:"normal",  img:"assets/themes/neon.svg", className:"neon-theme" },
  { id:"gold",   name:"Gold",    price:8000,  type:"normal",  img:"assets/themes/gold.svg", className:"gold-theme" },
  { id:"retrowave",name:"Retrowave", price:9000, type:"normal", img:"assets/themes/retrowave.svg", className:"retrowave-theme" },
  { id:"aurora", name:"Aurora (Premium)", type:"premium", adsRequired: ECONOMY.PREMIUM_ADS_REQUIRED, img:"assets/themes/aurora-premium.svg", className:"neon-theme" }
];

const BLOCKS = [
  { id:"default", name:"Default", price:0, type:"normal", img:"assets/blocks/default.svg", className:"block-style-default" },
  { id:"glass",   name:"Glass",   price:1500, type:"normal", img:"assets/blocks/glass.svg", className:"block-style-glass" },
  { id:"wood",    name:"Wood",    price:4000, type:"normal", img:"assets/blocks/wood.svg", className:"block-style-wood" },
  { id:"retro",   name:"Retro",   price:5000, type:"normal", img:"assets/blocks/retro.svg", className:"block-style-retro" },
  { id:"obsidian",name:"Obsidian (Premium)", type:"premium", adsRequired: ECONOMY.PREMIUM_ADS_REQUIRED, img:"assets/blocks/obsidian-premium.svg", className:"block-style-glass" }
];

// --------- RUNTIME STATE ---------
const state = Storage.load("PU_state", {
  gems: ECONOMY.TEST_GEMS,
  ownedThemes: { dark:true }, activeTheme:"dark",
  ownedBlocks: { default:true }, activeBlocks:"default",
  premiumProgress: {},
  achievements: {},
  haptics: true
});

// ---------- UTIL ----------
function $(sel){ return document.querySelector(sel);}
function $all(sel){ return [...document.querySelectorAll(sel)];}
function toast(msg, ms=2500){
  const area = $("#notification-area");
  const n = document.createElement("div");
  n.className = "notification";
  n.textContent = msg;
  n.style.background = "var(--card)";
  n.style.border = "1px solid var(--border)";
  n.style.padding = ".8rem 1rem";
  n.style.borderRadius = "12px";
  n.style.marginTop = ".3rem";
  n.style.maxWidth = "90vw";
  area.appendChild(n);
  setTimeout(()=>n.remove(), ms);
}
function save(){ Storage.save("PU_state", state); }

// ---------- ECONOMY UI ----------
const gemBalanceEl = $("#gem-balance");
function renderGemBalance(){ gemBalanceEl.textContent = state.gems.toLocaleString("sr-RS"); }
renderGemBalance();

// ---------- NAV ----------
const Screens = {
  show(id){
    $all(".screen").forEach(s => s.classList.remove("active"));
    $(id).classList.add("active");
  }
};
$("#shop-btn").addEventListener("click", ()=>{ Screens.show("#shop-screen"); });
$("#achievements-btn").addEventListener("click", ()=>{ Screens.show("#achievements-screen"); });
$("#settings-btn").addEventListener("click", ()=>{ Screens.show("#settings-screen"); });
$("#back-from-shop").addEventListener("click", ()=>Screens.show("#main-menu-screen"));
$("#back-from-ach").addEventListener("click", ()=>Screens.show("#main-menu-screen"));
$("#back-from-settings").addEventListener("click", ()=>Screens.show("#main-menu-screen"));
$("#back-from-game").addEventListener("click", ()=>Screens.show("#main-menu-screen"));

// ---------- THEMES SELECT IN SETTINGS ----------
const themeSelect = $("#theme-select");
function rebuildThemeSelect(){
  themeSelect.innerHTML = "";
  THEMES.forEach(t=>{
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = `${t.name}${state.ownedThemes[t.id] ? "" : " (nije kupljeno)"}`;
    if (t.id === state.activeTheme) opt.selected = true;
    themeSelect.appendChild(opt);
  });
}
themeSelect.addEventListener("change", (e)=>{
  const id = e.target.value;
  if (!state.ownedThemes[id]){ toast("Nije kupljeno."); rebuildThemeSelect(); return; }
  applyTheme(id);
  save(); renderMainPreviews();
});
$("#reset-btn").addEventListener("click", ()=>{
  localStorage.removeItem("PU_state");
  location.reload();
});
const hapticsBtn = $("#haptics-toggle-btn");
function renderHaptics(){ hapticsBtn.classList.toggle("active", state.haptics); hapticsBtn.textContent = state.haptics? "ON":"OFF"; }
hapticsBtn.addEventListener("click", ()=>{ state.haptics = !state.haptics; save(); renderHaptics(); });
renderHaptics();

// ---------- APPLY THEME / BLOCKS ----------
function applyTheme(id){
  const t = THEMES.find(x=>x.id===id) || THEMES[0];
  document.body.classList.remove(...THEMES.map(x=>x.className));
  document.body.classList.add(t.className);
  state.activeTheme = id;
}
function applyBlocks(id){
  const b = BLOCKS.find(x=>x.id===id) || BLOCKS[0];
  document.body.classList.remove(...BLOCKS.map(x=>x.className));
  document.body.classList.add(b.className);
  state.activeBlocks = id;
}
applyTheme(state.activeTheme);
applyBlocks(state.activeBlocks);
rebuildThemeSelect();

// ---------- MAIN PREVIEWS ----------
function renderMainPreviews(){
  // Theme swatch
  const p = $("#theme-preview");
  p.innerHTML = "";
  const img = new Image();
  const actT = THEMES.find(t=>t.id===state.activeTheme);
  img.src = actT.img;
  img.alt = actT.name;
  img.style.height = "52px";
  p.appendChild(img);

  // Block 3 preview
  const bprev = $("#block-preview");
  bprev.querySelectorAll(".game-block").forEach((el, i)=>{
    el.style.opacity = 1 - i*0.15;
  });
}
renderMainPreviews();

// ---------- SHOP RENDER ----------
function makeShopCard(item, kind){
  const owned = (kind==="themes") ? !!state.ownedThemes[item.id] : !!state.ownedBlocks[item.id];
  const card = document.createElement("div");
  card.className = "shop-item" + (item.type==="premium" ? " premium": "");
  card.innerHTML = `
    <div class="thumb">${svgImgTag(item.img)}</div>
    <div class="title">${item.name}</div>
    ${item.type==="premium" ? `<div class="progressbar"><span style="width:${getProgress(item.id)}%"></span></div>` : ""}
    <div class="price">
      ${item.type==="premium"
        ? `<small>Reklame: ${getWatched(item.id)}/${item.adsRequired}</small>`
        : `<span class="diamond"></span><span>${item.price.toLocaleString("sr-RS")}</span>`}
    </div>
    <div class="actions">
      ${owned ? `<button data-act="apply" class="primary-btn">Primeni</button>`
              : (item.type==="premium"
                  ? `<button data-act="watch" class="primary-btn">Gledaj (x1)</button>`
                  : `<button data-act="buy" class="primary-btn">Kupi</button>`)
      }
    </div>
  `;

  card.querySelector(".thumb").addEventListener("click", ()=>{
    if (kind==="themes") { applyTheme(item.id); } else { applyBlocks(item.id); }
    renderMainPreviews(); save();
    toast("Pregled primenjen na glavnom ekranu (nije sačuvano ako nije kupljeno).");
  });

  card.addEventListener("click",(e)=>{
    const btn = e.target.closest("button");
    if(!btn) return;
    const act = btn.dataset.act;
    if (act==="apply"){
      if (kind==="themes") applyTheme(item.id); else applyBlocks(item.id);
      save(); renderMainPreviews(); toast("Primenjeno.");
      rebuildThemeSelect();
    } else if (act==="buy"){
      if (state.gems < item.price){ toast("Nemaš dovoljno dijamanata."); return; }
      state.gems -= item.price;
      if (kind==="themes") state.ownedThemes[item.id]=true; else state.ownedBlocks[item.id]=true;
      save(); renderGemBalance(); renderShop(); toast(`Kupljeno: ${item.name}`);
      updateAchievementsProgress("buy_any",1);
    } else if (act==="watch"){
      watchAd().then(()=>{
        const w = (state.premiumProgress[item.id] || 0) + 1;
        state.premiumProgress[item.id] = w;
        if (w >= (item.adsRequired||ECONOMY.PREMIUM_ADS_REQUIRED)){
          if (kind==="themes") state.ownedThemes[item.id]=true; else state.ownedBlocks[item.id]=true;
          toast(`Otključano: ${item.name}`);
          updateAchievementsProgress("watch_ads",1);
        } else {
          toast(`Odgledano. Preostalo: ${item.adsRequired - w}`);
        }
        save(); renderShop();
      });
    }
  });
  return card;
}
function svgImgTag(src){ return `<img src="${src}" alt="" width="50" height="50" />`; }
function getWatched(id){ return state.premiumProgress[id]||0; }
function getProgress(id){
  const item = [...THEMES, ...BLOCKS].find(x=>x.id===id);
  const need = item?.adsRequired || ECONOMY.PREMIUM_ADS_REQUIRED;
  return Math.min(100, Math.round(100*(getWatched(id)/need)));
}
function renderShop(){
  const tWrap = $("#shop-themes-container");
  const bWrap = $("#shop-blocks-container");
  tWrap.innerHTML = ""; bWrap.innerHTML = "";

  THEMES.forEach(t => tWrap.appendChild( makeShopCard(t,"themes") ));
  BLOCKS.forEach(b => bWrap.appendChild( makeShopCard(b,"blocks") ));
}
renderShop();
$all(".shop-tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $all(".shop-tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    $all(".shop-grid").forEach(g=>g.classList.remove("active"));
    if (tab==="themes") $("#shop-themes-container").classList.add("active");
    else $("#shop-blocks-container").classList.add("active");
  });
});

// ---------- ACHIEVEMENTS ----------
const ACH_DEF = [
  { id:"open_shop", name:"Window Shopper", desc:"Otvori prodavnicu", target:1, reward:50 },
  { id:"buy_any", name:"Prva kupovina", desc:"Kupi bilo šta", target:1, reward:75 },
  { id:"watch_ads", name:"Gledalac", desc:"Gledaj 5 reklama", target:5, reward:100 },
  { id:"score_500", name:"Prvi skor", desc:"Osvoji 500 poena u Block Puzzle", target:500, reward:150, counter:"puzzleScore" }
];
function getAchState(id){ return state.achievements[id] || {progress:0, claimed:false}; }
function setAchState(id, data){ state.achievements[id] = {...getAchState(id), ...data}; save(); }
function isAchClaimable(def){
  const st = getAchState(def.id);
  return !st.claimed && st.progress >= def.target;
}
function updateAchievementsProgress(id, amount){
  const def = ACH_DEF.find(a=>a.id===id);
  if (!def){ return; }
  const st = getAchState(id);
  st.progress = Math.min(def.target, (st.progress||0) + amount);
  setAchState(id, st);
  renderAchievements();
}
function maybePulseAch(){
  const anyClaim = ACH_DEF.some(def=>isAchClaimable(def));
  $("#ach-pulse").hidden = !anyClaim;
}
function renderAchievements(){
  const wrap = $("#achievements-container");
  wrap.innerHTML = "";
  ACH_DEF.forEach(def=>{
    const st = getAchState(def.id);
    const card = document.createElement("div");
    card.className = "ach-card" + (isAchClaimable(def) ? " claimable": "");
    card.innerHTML = `
      <div class="title"><strong>${def.name}</strong></div>
      <div class="desc">${def.desc}</div>
      <div class="progressbar"><span style="width:${Math.min(100, Math.round((st.progress/def.target)*100))}%"></span></div>
      <small>${st.progress} / ${def.target}</small>
      <div class="ach-actions">
        ${st.claimed ? `<span class="badge">Preuzeto</span>` :
          isAchClaimable(def) ? `<button class="primary-btn" data-claim="${def.id}">Preuzmi ${def.reward} 💎</button>
                                 <button class="icon-btn" data-double="${def.id}">x2 uz 2 reklame</button>`
          : `<button class="primary-btn secondary" disabled>Zaključano</button>`}
      </div>
    `;
    wrap.appendChild(card);
  });
  maybePulseAch();
}
$("#achievements-container").addEventListener("click",(e)=>{
  const bC = e.target.closest("button[data-claim]");
  const bD = e.target.closest("button[data-double]");
  if (bC){
    const id = bC.dataset.claim;
    const def = ACH_DEF.find(a=>a.id===id);
    if (!def) return;
    const st = getAchState(id);
    if (st.claimed || st.progress<def.target) return;
    state.gems += def.reward;
    setAchState(id, {claimed:true});
    save(); renderGemBalance(); renderAchievements();
    toast(`+${def.reward} 💎`);
  } else if (bD){
    const id = bD.dataset.double;
    const def = ACH_DEF.find(a=>a.id===id);
    if (!def) return;
    const st = getAchState(id);
    if (st.claimed || st.progress<def.target) return;
    watchAd().then(()=> watchAd().then(()=>{
      state.gems += def.reward * 2;
      setAchState(id, {claimed:true});
      save(); renderGemBalance(); renderAchievements();
      toast(`Dupla nagrada! +${def.reward*2} 💎`);
    }));
  }
});
renderAchievements();

$("#shop-btn").addEventListener("click", ()=> updateAchievementsProgress("open_shop",1));

// ---------- ADS STUB ----------
function watchAd(){
  return new Promise((resolve)=>{
    const modal = $("#ad-modal");
    const bar = $("#ad-progress");
    modal.classList.add("active");
    bar.style.width = "0%";
    let t = 0;
    const tick = setInterval(()=>{
      t += 10;
      bar.style.width = `${t}%`;
      if (t>=100){
        clearInterval(tick);
        modal.classList.remove("active");
        resolve();
      }
    }, 300);
    $("#close-ad-modal").onclick = ()=>{ /* disallow closing in test */ };
  });
}

// ========== BLOCK PUZZLE GAME ==========
let Puzzle = {
  board: [], size: 10, score: 0, currentPieces: [], lastPlaced: null, hammerActive: false,

  init() {
    this.board = this.createEmptyGrid();
    this.score = 0;

    this.boardEl = document.getElementById("puzzle-board");
    this.piecesContainer = document.getElementById("puzzle-pieces-container");
    this.scoreEl = document.getElementById("puzzle-score");

    this.scoreEl.textContent = "0";
    this.renderBoard();
    this.spawnPieces();

    document.getElementById("undo-btn").disabled = true;
    document.getElementById("hammer-btn").disabled = false;
    document.getElementById("bomb-btn").disabled = false;

    document.getElementById("undo-btn").onclick = () => {
      if (this.lastPlaced) {
        this.undoLastMove();
        document.getElementById("undo-btn").disabled = true;
      }
    };

    document.getElementById("bomb-btn").onclick = () => {
      if (confirm("Obriši celu tablu? (-100 poena)")) {
        this.clearBoard();
        document.getElementById("bomb-btn").disabled = true;
      }
    };

    document.getElementById("hammer-btn").onclick = () => {
      this.hammerActive = true;
      document.getElementById("hammer-btn").disabled = true;
      toast("Klikni na tablu da obrišeš red i kolonu", 3000);
    };

    this.boardEl.onclick = (e) => {
      if (this.hammerActive) {
        const boardRect = this.boardEl.getBoundingClientRect();
        const cellSize = boardRect.width / this.size;
        const col = Math.floor((e.clientX - boardRect.left) / cellSize);
        const row = Math.floor((e.clientY - boardRect.top) / cellSize);
        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
          this.clearRowAndCol(row, col);
          this.hammerActive = false;
        }
      }
    };
  },

  createEmptyGrid() {
    return Array.from({ length: this.size }, () => Array(this.size).fill(0));
  },

  renderBoard() {
    this.boardEl.innerHTML = "";
    this.board.forEach(row => {
      row.forEach(cell => {
        const d = document.createElement("div");
        d.className = "puzzle-cell";
        if (cell) {
          const b = document.createElement("div");
          b.className = "game-block";
          b.style.background = cell.color;
          d.appendChild(b);
        }
        this.boardEl.appendChild(d);
      });
    });
  },

  spawnPieces() {
    this.piecesContainer.innerHTML = "";
    this.currentPieces = [];
    for (let i = 0; i < 3; i++) {
      const shape = JSON.parse(JSON.stringify(SHAPES[Math.floor(Math.random() * SHAPES.length)]));
      const col = COLORS[Math.floor(Math.random() * COLORS.length)];
      const id = `p-${Date.now()}-${i}`;
      const data = { id, shape, color: col };
      this.currentPieces.push(data);
      const el = this.renderPieceEl(data);
      this.piecesContainer.appendChild(el);
    }
  },

  renderPieceEl(piece) {
    const el = document.createElement("div");
    el.className = "puzzle-piece";
    const w = Math.max(...piece.shape.map(r => r.length));
    el.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
    piece.shape.forEach(row => {
      for (let i = 0; i < w; i++) {
        const v = row[i] || 0;
        const cell = document.createElement("div");
        if (v) {
          cell.className = "game-block";
          cell.style.width = "28px";
          cell.style.height = "28px";
          cell.style.background = piece.color;
        } else {
          cell.style.width = "28px";
          cell.style.height = "28px";
        }
        el.appendChild(cell);
      }
    });
    el.dataset.id = piece.id;
    el.addEventListener("touchstart", (e) => this.onDragStart(e, piece, el), { passive: false });
    el.addEventListener("mousedown", (e) => this.onDragStart(e, piece, el));
    return el;
  },

  onDragStart(e, piece, el) {
    e.preventDefault();
    const ghost = el.cloneNode(true);
    ghost.classList.add("dragging");
    document.body.appendChild(ghost);
    const rect = el.getBoundingClientRect();
    const pt = e.touches ? e.touches[0] : e;
    const offX = pt.clientX - rect.left;
    const offY = pt.clientY - rect.top;
    el.style.opacity = ".25";

    const move = (ev) => {
      const m = ev.touches ? ev.touches[0] : ev;
      ghost.style.left = (m.clientX - offX) + "px";
      ghost.style.top = (m.clientY - offY) + "px";
      this.renderGhost(piece, ghost);
    };

    const end = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchend", end);
      ghost.remove();
      this.boardEl.querySelectorAll(".ghost-path").forEach(c => c.classList.remove("ghost-path"));
      const drop = this.getDropCoord(piece, ghost);
      if (drop && this.canPlace(piece, drop.r, drop.c)) {
        this.placePiece(piece, drop.r, drop.c);
        el.remove();
        this.currentPieces = this.currentPieces.filter(p => p.id !== piece.id);
        if (this.currentPieces.length === 0) {
          this.spawnPieces();
        }
        document.getElementById("undo-btn").disabled = false;
      } else {
        el.style.opacity = "1";
        el.classList.add("bad-move");
        setTimeout(() => el.classList.remove("bad-move"), 200);
      }
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", end);
    window.addEventListener("touchend", end);
  },

  getDropCoord(piece, ghost) {
    const boardRect = this.boardEl.getBoundingClientRect();
    const ghostRect = ghost.getBoundingClientRect();
    const cellSize = boardRect.width / this.size;
    const col = Math.floor((ghostRect.left - boardRect.left) / cellSize);
    const row = Math.floor((ghostRect.top - boardRect.top) / cellSize);
    return { r: row, c: col };
  },

  renderGhost(piece, ghost) {
    this.boardEl.querySelectorAll(".ghost-path").forEach(c => c.classList.remove("ghost-path"));
    const boardRect = this.boardEl.getBoundingClientRect();
    const ghostRect = ghost.getBoundingClientRect();
    const cellSize = boardRect.width / this.size;
    const baseCol = Math.floor((ghostRect.left - boardRect.left) / cellSize);
    const baseRow = Math.floor((ghostRect.top - boardRect.top) / cellSize);

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const row = baseRow + r;
        const col = baseCol + c;
        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
          const idx = row * this.size + col;
          const cellEl = this.boardEl.children[idx];
          if (cellEl && !this.board[row][col]) {
            cellEl.classList.add("ghost-path");
          }
        }
      }
    }
  },

  canPlace(piece, r0, c0) {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const R = r0 + r, C = c0 + c;
        if (R < 0 || C < 0 || R >= this.size || C >= this.size) return false;
        if (this.board[R][C]) return false;
      }
    }
    return true;
  },

  placePiece(piece, r0, c0) {
    piece.shape.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v) this.board[r0 + r][c0 + c] = { color: piece.color };
      });
    });
    this.score += piece.shape.flat().reduce((a, b) => a + b, 0);
    this.scoreEl.textContent = this.score;
    this.clearLines();
    this.renderBoard();
    this.lastPlaced = { piece, r0, c0 };

    const st = getAchState("score_500");
    if (this.score > st.progress) setAchState("score_500", { progress: Math.min(500, this.score) });
    renderAchievements();
  },

  clearLines() {
    let rowsToClear = [];
    for (let r = 0; r < this.size; r++) {
      if (this.board[r].every(x => x)) rowsToClear.push(r);
    }
    let colsToClear = [];
    for (let c = 0; c < this.size; c++) {
      let full = true;
      for (let r = 0; r < this.size; r++) { if (!this.board[r][c]) { full = false; break; } }
      if (full) colsToClear.push(c);
    }
    rowsToClear.forEach(r => this.board[r] = Array(this.size).fill(0));
    colsToClear.forEach(c => {
      for (let r = 0; r < this.size; r++) this.board[r][c] = 0;
    });
    const cleared = rowsToClear.length + colsToClear.length;
    if (cleared > 0) {
      this.score += cleared * cleared * 10;
      this.scoreEl.textContent = this.score;
    }
  },

  undoLastMove() {
    if (!this.lastPlaced) return;
    const { piece, r0, c0 } = this.lastPlaced;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          this.board[r0 + r][c0 + c] = 0;
        }
      }
    }
    this.score = Math.max(0, this.score - piece.shape.flat().reduce((a, b) => a + b, 0));
    this.scoreEl.textContent = this.score;
    this.renderBoard();
    this.currentPieces.push(piece);
    const pieceEl = this.renderPieceEl(piece);
    this.piecesContainer.appendChild(pieceEl);
    this.lastPlaced = null;
  },

  clearBoard() {
    this.board = this.createEmptyGrid();
    this.score = Math.max(0, this.score - 100);
    this.scoreEl.textContent = this.score;
    this.renderBoard();
  },

  clearRowAndCol(r, c) {
    for (let i = 0; i < this.size; i++) {
      this.board[r][i] = 0;
      this.board[i][c] = 0;
    }
    this.score = Math.max(0, this.score - 50);
    this.scoreEl.textContent = this.score;
    this.renderBoard();
  }
};

// Start Puzzle from menu
$("#start-puzzle").addEventListener("click", () => {
  Screens.show("#game-screen");
  setTimeout(() => Puzzle.init(), 100);
});

// Initial apply owned selections
applyTheme(state.activeTheme);
applyBlocks(state.activeBlocks);
renderGemBalance();
renderShop();
renderAchievements();
renderMainPreviews();

// ========== COLORS & SHAPES FOR PUZZLE ==========
const COLORS = ["#22c55e","#3b82f6","#a855f7","#ef4444","#eab308","#06b6d4","#f97316"];
const SHAPES = [
  [[1]], [[1]][[1]], [[1]][[1]][[1]], [[1]][[1]][[1]][[1]], [[1]][[1]][[1]][[1]][[1]],
  [[1],[1]], [[1],[1],[1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1],[0,1,0]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,1],[1,0,1]]
];
