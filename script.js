(function(){
'use strict';

/* ===== DOM REFS ===== */
var canvas = document.getElementById('game');
var ctx    = (canvas && canvas.getContext) ? canvas.getContext('2d', {alpha:true}) : null;
var fxCnv  = document.getElementById('fx');
var fctx   = (fxCnv && fxCnv.getContext) ? fxCnv.getContext('2d', {alpha:true}) : null;
var app    = document.getElementById('app');
var start  = document.getElementById('startScreen');
var bg     = document.getElementById('bg');
var trayEl = document.getElementById('tray');
var scoreEl= document.getElementById('score');
var bestEl = document.getElementById('best');
var levelPill = document.getElementById('levelPill');
var lvlEl  = document.getElementById('lvl');
var resetBtn = document.getElementById('reset');
var backBtn  = document.getElementById('backBtn');

var settingsBtn   = document.getElementById('settingsBtn');
var settingsModal = document.getElementById('settingsModal');
var setThemeBtn   = document.getElementById('setTheme');
var setSound      = document.getElementById('setSound');
var resetBest     = document.getElementById('resetBest');
var closeSettings = document.getElementById('closeSettings');
var runTestsBtn   = document.getElementById('runTests');

var achBtn   = document.getElementById('achBtn');
var achievementsModal = document.getElementById('achievementsModal');
var achPrev = document.getElementById('achPrev');
var achNext = document.getElementById('achNext');
var achList = document.getElementById('achList');
var achPageLbl = document.getElementById('achPageLbl');
var msTitle = document.getElementById('msTitle');
var msDesc  = document.getElementById('msDesc');
var msBar   = document.getElementById('msBar');
var msCounters = document.getElementById('msCounters');
var msBlockProg = document.getElementById('msBlockProg');
var btnWatchAd = document.getElementById('btnWatchAd');
var btnClaim   = document.getElementById('btnClaim');
var closeAch = document.getElementById('closeAch');

/* Kolekcija (tabs) */
var collectionBtn   = document.getElementById('collectionBtn');
var collectionModal = document.getElementById('collectionModal');
var themesGrid = document.getElementById('themesGrid');
var skinsGrid  = document.getElementById('skinsGrid');
var closeCollection = document.getElementById('closeCollection');
var tabThemes = document.getElementById('tabThemes');
var tabSkins  = document.getElementById('tabSkins');
var panelThemes = document.getElementById('panelThemes');
var panelSkins  = document.getElementById('panelSkins');

/* Game Over */
var gameOver = document.getElementById('gameOver');
var goStats  = document.getElementById('goStats');
var playAgain= document.getElementById('playAgain');
var goMenu   = document.getElementById('goMenu');

/* Mode dugmad */
var startClassic   = document.getElementById('startClassic');
var startObstacles = document.getElementById('startObstacles');

/* Drag overlay */
var dragLayer = document.getElementById('dragLayer');
var dragCtx   = dragLayer ? dragLayer.getContext('2d') : null;

/* ===== SAFETY ===== */
if(ctx){ ctx.imageSmoothingEnabled=false; }
if(fctx){ fctx.imageSmoothingEnabled=false; }
if(dragCtx){ dragCtx.imageSmoothingEnabled=false; }

/* ===== CONSTS & STATE ===== */
var DPR=Math.min(window.devicePixelRatio||1,2);
var BOARD=8;

/* Paleta boja za blokove */
var COLORS=['#ffd089','#ffb3c6','#ffd1a1','#d4af37','#c0c0c0','#ff9e7d','#ffc06a','#f6a6ff'];

/* Prepreke */
var OBSTACLE_COLOR='#2a3344';

/* safe localStorage wrapper */
function makeSafeStorage(){
  try{ localStorage.setItem('_t','1'); localStorage.removeItem('_t'); return localStorage; }
  catch(e){ return {getItem:function(){return null;}, setItem:function(){}, removeItem:function(){}}; }
}
var SAFE = makeSafeStorage();
function LS(k,v){ return (v===undefined ? SAFE.getItem(k) : SAFE.setItem(k,v)); }

/* Settings */
var settings = { theme: (LS('bp8.theme')||'dark'), sound: (LS('bp8.sound')!==null ? LS('bp8.sound')==='1' : true) };
applyTheme(settings.theme); updateSoundLabel();

/* Best */
var bestByMode = loadBest() || {classic:0, obstacles:0};
var maxLevelSaved = parseInt(LS('bp8.level.max')||'1',10);

/* State */
var state = {
  grid:createGrid(BOARD), cell:36, score:0,
  mode:'classic', best:bestByMode, hand:[],
  dragging:null, level:1, maxLevel: Math.max(1,maxLevelSaved)
};

/* Stats — odmah otključaj sve teme/skinove */
var stats = loadStats() || { totalScore:0, blocksPlaced:0, linesCleared:0, externalAds:0, themesUnlocked:999, skinsUnlocked:999 };

/* ===== TEME & SKINOVI ===== */
var THEMES = [
  { id:'t00', name:'Starter Aurora', accent:'#2ec5ff', palette:'starterAurora' },
  { id:'t01', name:'Aurora Blue+',  accent:'#35d7ff', palette:'auroraPlus'     },
  { id:'t02', name:'Sunset Bloom',  accent:'#ff8e6b', palette:'sunset' },
  { id:'t03', name:'Noir Gold',     accent:'#d4af37', palette:'noirGold' },
  { id:'t04', name:'Neon Drift',    accent:'#00ffd9', palette:'neon' },
  { id:'t05', name:'Ivory Pearl',   accent:'#d9c8a1', palette:'ivory' },
  { id:'t06', name:'Emerald Mist',  accent:'#59e3a7', palette:'emerald' },
  { id:'t07', name:'Royal Purple',  accent:'#b18cff', palette:'royal' },
  { id:'t08', name:'Ocean Depths',  accent:'#7bd0ff', palette:'ocean' },
  { id:'t09', name:'Desert Dune',   accent:'#d7a257', palette:'desert' },
  { id:'t10', name:'Crimson Pulse', accent:'#ff6b6b', palette:'crimson' }
];

var SKINS = [
  { id:'s00', name:'Starter Classic', style:'metal' },
  { id:'s01', name:'Glass Lux',      style:'glass' },
  { id:'s02', name:'Metallic Matte', style:'metal' },
  { id:'s03', name:'Gem Cut',        style:'gem' },
  { id:'s04', name:'Satin Candy',    style:'satin' },
  { id:'s05', name:'Liquid Chrome',  style:'chrome' },
  { id:'s06', name:'Porcelain',      style:'porcelain' },
  { id:'s07', name:'Carbon Weave',   style:'carbon' },
  { id:'s08', name:'Frosted Ice',    style:'frost' },
  { id:'s09', name:'Velvet Glow',    style:'velvet' },
  { id:'s10', name:'Stone Marble',   style:'marble' }
];

var applied = loadApplied() || { theme:'t00', skin:'s00' };
applyAccentFromTheme(applied.theme);

/* Achievements */
var ach = loadAch() || createAchievementsModel();
var achPage = 1;

/* ===== Utils ===== */
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function createGrid(n){ var arr=[]; for(var i=0;i<n;i++){ var row=[]; for(var j=0;j<n;j++) row.push(0); arr.push(row);} return arr; }
function rr(c,x,y,w,h,r){ r=Math.min(r,w*.5,h*.5); c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function getCss(v){ return getComputedStyle(document.documentElement).getPropertyValue(v); }
  /* ===== Aurora BG ===== */
function drawAurora(c,w,h){
  var pal=(function(){ for(var i=0;i<THEMES.length;i++){ if(THEMES[i].id===applied.theme) return THEMES[i].palette; } return 'starterAurora'; })();
  c.save();
  var base=c.createLinearGradient(0,0,w,h);
  switch(pal){
    case 'starterAurora': base.addColorStop(0,'rgba(8,14,28,0.88)'); base.addColorStop(1,'rgba(10,20,40,0.92)'); break;
    case 'auroraPlus':    base.addColorStop(0,'rgba(6,12,22,0.92)'); base.addColorStop(1,'rgba(10,26,46,0.94)'); break;
    case 'royal':         base.addColorStop(0,'rgba(20,10,30,0.92)'); base.addColorStop(1,'rgba(40,18,70,0.94)'); break;
    case 'sunset':        base.addColorStop(0,'rgba(28,10,10,0.90)'); base.addColorStop(1,'rgba(40,18,10,0.92)'); break;
    case 'noirGold':      base.addColorStop(0,'rgba(14,12,8,0.92)');  base.addColorStop(1,'rgba(26,20,10,0.94)'); break;
    case 'neon':          base.addColorStop(0,'rgba(6,16,18,0.92)');  base.addColorStop(1,'rgba(8,26,28,0.94)');  break;
    case 'ivory':         base.addColorStop(0,'rgba(22,22,20,0.90)'); base.addColorStop(1,'rgba(28,28,24,0.92)'); break;
    case 'emerald':       base.addColorStop(0,'rgba(8,20,14,0.92)');  base.addColorStop(1,'rgba(12,32,22,0.94)'); break;
    case 'ocean':         base.addColorStop(0,'rgba(8,16,28,0.92)');  base.addColorStop(1,'rgba(10,26,44,0.94)'); break;
    case 'desert':        base.addColorStop(0,'rgba(26,18,10,0.92)'); base.addColorStop(1,'rgba(34,24,12,0.94)'); break;
    case 'crimson':       base.addColorStop(0,'rgba(26,8,12,0.92)');  base.addColorStop(1,'rgba(40,10,14,0.94)'); break;
    default:              base.addColorStop(0,'rgba(8,12,20,0.92)');  base.addColorStop(1,'rgba(10,18,28,0.92)');
  }
  c.fillStyle=base; c.fillRect(0,0,w,h);
  c.globalCompositeOperation='screen';
  function blob(cx,cy,r,color,a1,a0){ if(a1===void 0)a1=0.40; if(a0===void 0)a0=0;
    var g=c.createRadialGradient(cx,cy,10,cx,cy,r);
    g.addColorStop(0,'rgba('+color+','+a1+')'); g.addColorStop(1,'rgba('+color+','+a0+')');
    c.fillStyle=g; c.fillRect(0,0,w,h);
  }
  switch(pal){
    case 'starterAurora': blob(w*.34,h*.42,Math.max(w,h)*.75,'60,140,255',0.38); blob(w*.70,h*.70,Math.max(w,h)*.65,'30,220,255',0.30); break;
    case 'auroraPlus':    blob(w*.28,h*.36,Math.max(w,h)*.85,'60,160,255',0.52); blob(w*.72,h*.70,Math.max(w,h)*.95,'0,220,255',0.42); blob(w*.18,h*.86,Math.max(w,h)*.65,'120,80,255',0.38); break;
    case 'royal':         blob(w*.32,h*.40,Math.max(w,h)*.85,'150,80,255',0.50); blob(w*.74,h*.72,Math.max(w,h)*.90,'210,150,255',0.35); break;
    case 'sunset':        blob(w*.30,h*.38,Math.max(w,h)*.90,'255,120,80',0.46); blob(w*.76,h*.70,Math.max(w,h)*.80,'255,200,120',0.34); break;
    case 'noirGold':      blob(w*.28,h*.36,Math.max(w,h)*.80,'220,180,80',0.36); blob(w*.70,h*.74,Math.max(w,h)*.85,'255,220,150',0.26); break;
    case 'neon':          blob(w*.30,h*.40,Math.max(w,h)*.90,'0,255,200',0.42); blob(w*.72,h*.68,Math.max(w,h)*.85,'0,180,255',0.30); break;
    case 'emerald':       blob(w*.30,h*.42,Math.max(w,h)*.90,'60,255,180',0.40); blob(w*.72,h*.70,Math.max(w,h)*.85,'30,220,150',0.32); break;
    case 'ivory':         blob(w*.34,h*.44,Math.max(w,h)*.80,'255,240,200',0.32); blob(w*.70,h*.72,Math.max(w,h)*.80,'250,220,160',0.26); break;
    case 'ocean':         blob(w*.34,h*.42,Math.max(w,h)*.85,'80,180,255',0.40); blob(w*.72,h*.70,Math.max(w,h)*.90,'0,120,255',0.28); break;
    case 'desert':        blob(w*.34,h*.42,Math.max(w,h)*.85,'255,200,120',0.38); blob(w*.72,h*.70,Math.max(w,h)*.90,'255,160,80',0.30); break;
    case 'crimson':       blob(w*.32,h*.40,Math.max(w,h)*.85,'255,80,100',0.46); blob(w*.74,h*.72,Math.max(w,h)*.90,'255,150,160',0.32); break;
    default:              blob(w*.30,h*.35,Math.max(w,h)*.80,'60,150,255',0.40); blob(w*.75,h*.72,Math.max(w,h)*.90,'0,220,255',0.32);
  }
  c.restore();
}

/* BG petlja */
if(bg){
  (function loopBG(){
    var b=bg.getContext('2d');
    if(!b){ requestAnimationFrame(loopBG); return; }
    var w=window.innerWidth, h=window.innerHeight;
    if(bg.width!==Math.floor(w*DPR) || bg.height!==Math.floor(h*DPR)){ bg.width=Math.floor(w*DPR); bg.height=Math.floor(h*DPR); }
    b.setTransform(1,0,0,1,0,0); b.scale(DPR,DPR); b.clearRect(0,0,w,h);
    drawAurora(b, w, h);
    requestAnimationFrame(loopBG);
  })();
}

/* ===== Shapes / Pieces ===== */
var SHAPES=(function(){
  var raw=[
    [[0,0]],
    [[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[1,0],[2,0],[3,0]], [[0,0],[1,0],[2,0],[3,0],[4,0]],
    [[0,0],[0,1]], [[0,0],[0,1],[0,2]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[0,1],[0,2],[0,3],[0,4]],
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[2,0],[0,1]],
    [[0,0],[1,0],[2,0],[1,1]],
    [[0,0],[1,0],[0,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]]
  ];
  return raw.map(function(shape){
    var minx=Infinity,miny=Infinity,i;
    for(i=0;i<shape.length;i++){ if(shape[i][0]<minx)minx=shape[i][0]; if(shape[i][1]<miny)miny=shape[i][1]; }
    var blocks=shape.map(function(b){ return [b[0]-minx,b[1]-miny]; });
    var w=0,h=0; for(i=0;i<blocks.length;i++){ if(blocks[i][0]>w)w=blocks[i][0]; if(blocks[i][1]>h)h=blocks[i][1]; }
    return {blocks:blocks,w:w+1,h:h+1};
  });
})();
function rndColor(){ return COLORS[Math.floor(Math.random()*COLORS.length)]; }
function newPiece(){ var s=SHAPES[Math.floor(Math.random()*SHAPES.length)];
  return { blocks:s.blocks.map(function(b){return [b[0],b[1]];}), w:s.w, h:s.h, color:rndColor(), used:false, id:Math.random().toString(36).slice(2) };
}

/* ===== Pravila ===== */
function canPlace(piece,gx,gy){
  for(var i=0;i<piece.blocks.length;i++){
    var x=gx+piece.blocks[i][0], y=gy+piece.blocks[i][1];
    if(x<0||y<0||x>=BOARD||y>=BOARD) return false;
    if(state.grid[y][x]!==0) return false;
  } return true;
}
function canFitAnywhere(piece){
  for(var y=0;y<=BOARD-piece.h;y++) for(var x=0;x<=BOARD-piece.w;x++) if(canPlace(piece,x,y)) return true;
  return false;
}
function anyFits(){
  for(var i=0;i<state.hand.length;i++){ var p=state.hand[i]; if(!p.used && canFitAnywhere(p)) return true; }
  return false;
}

/* ===== GRID overlay & rim ===== */
function isAuroraPlus(){ return applied.theme==='t01'; }
function drawPanelAndGridOverlay(c, W, H, s){
  c.save();
  c.lineWidth=1;
  c.strokeStyle='rgba(255,255,255,.16)';
  for(var y=0;y<BOARD;y++){
    for(var x=0;x<BOARD;x++){
      var px=x*s, py=y*s;
      rr(c,px+1.5,py+1.5,s-3,s-3,8);
      c.stroke();
    }
  }
  var accent = getCss('--accent') || '#2ec5ff';
  var outerColor = isAuroraPlus() ? '#d4af37' : (accent.trim() || '#2ec5ff');
  c.lineWidth = isAuroraPlus() ? Math.max(2.2, s*0.10) : Math.max(2, s*0.08);
  c.strokeStyle = outerColor;
  rr(c, 1.0, 1.0, W-2.0, H-2.0, 14);
  c.stroke();
  c.restore();
}

/* ===== SKIN render – bez okvira ===== */
var SHOW_BLOCK_RIM=false;

var patternCache=new Map();
function makePatternCanvas(drawFn,size){ if(size==null) size=24; var key=(drawFn&&drawFn.name?drawFn.name:'p')+':'+size; if(patternCache.has(key)) return patternCache.get(key); var c=document.createElement('canvas'); c.width=c.height=size; var g=c.getContext('2d'); g.clearRect(0,0,size,size); drawFn(g,size); var pat=g.createPattern(c,'repeat'); patternCache.set(key,pat); return pat; }
function patGlass(g,s){ g.strokeStyle='rgba(255,255,255,0.18)'; g.lineWidth=0.9; g.beginPath(); g.moveTo(0, s*0.22); g.lineTo(s, 0); g.stroke(); g.beginPath(); g.moveTo(0, s*0.62); g.lineTo(s, s*0.38); g.stroke(); }
function patBrushed(g,s){ g.strokeStyle='rgba(255,255,255,0.10)'; g.lineWidth=0.9; for(var x=0;x<s;x+=3){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,s); g.stroke(); } }
function patFacet(g,s){ g.strokeStyle='rgba(255,255,255,0.16)'; g.lineWidth=1.0; g.beginPath(); g.moveTo(0,0); g.lineTo(s,s); g.stroke(); g.beginPath(); g.moveTo(s*0.2,0); g.lineTo(s, s*0.8); g.stroke(); g.beginPath(); g.moveTo(0, s*0.3); g.lineTo(s*0.7, s); g.stroke(); }
function patSatin(g,s){ g.strokeStyle='rgba(255,255,255,0.10)'; g.lineWidth=1.2; g.beginPath(); g.moveTo(0,s*0.3); g.bezierCurveTo(s*0.3,s*0.2, s*0.6,s*0.5, s,s*0.42); g.stroke(); }
function patChrome(g,s){ var grd=g.createLinearGradient(0,s*0.28,0,s*0.72); grd.addColorStop(0,'rgba(255,255,255,0.45)'); grd.addColorStop(0.5,'rgba(255,255,255,0.00)'); grd.addColorStop(1,'rgba(255,255,255,0.45)'); g.fillStyle=grd; g.fillRect(0,0,s,s); }
function patSpeckle(g,s){ g.fillStyle='rgba(255,255,255,0.08)'; for(var i=0;i<Math.floor(s*1.0);i++){ g.fillRect(Math.random()*s, Math.random()*s, 1,1); } }
function patWeave(g,s){ g.strokeStyle='rgba(255,255,255,0.08)'; g.lineWidth=1; for(var x=0;x<s;x+=4){ g.beginPath(); g.moveTo(x,0); g.lineTo(x+2,s); g.stroke(); } for(var y=0;y<s;y+=4){ g.beginPath(); g.moveTo(0,y); g.lineTo(s,y+2); g.stroke(); } }
function patCrackle(g,s){ g.strokeStyle='rgba(255,255,255,0.12)'; g.lineWidth=0.8; for(var i=0;i<3;i++){ g.beginPath(); g.moveTo(Math.random()*s, Math.random()*s); for(var k=0;k<3;k++){ g.lineTo(Math.random()*s, Math.random()*s); } g.stroke(); } }
function patBubbles(g,s){ g.strokeStyle='rgba(255,255,255,0.12)'; g.lineWidth=0.8; for(var i=0;i<3;i++){ var r=2+Math.random()*3, x=Math.random()*s, y=Math.random()*s; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.stroke(); } }
function patVeins(g,s){ g.strokeStyle='rgba(255,255,255,0.16)'; g.lineWidth=1.0; for(var i=0;i<2;i++){ g.beginPath(); g.moveTo(0, Math.random()*s); g.bezierCurveTo(s*0.3,Math.random()*s, s*0.6,Math.random()*s, s,Math.random()*s); g.stroke(); } }
function getSkinPattern(style){ switch(style){ case 'glass':return makePatternCanvas(patGlass,28); case 'metal':return makePatternCanvas(patBrushed,24); case 'gem':return makePatternCanvas(patFacet,24); case 'satin':return makePatternCanvas(patSatin,28); case 'chrome':return makePatternCanvas(patChrome,24); case 'porcelain':return makePatternCanvas(patSpeckle,24); case 'carbon':return makePatternCanvas(patWeave,24); case 'frost':return makePatternCanvas(patCrackle,28); case 'velvet':return makePatternCanvas(patBubbles,28); case 'marble':return makePatternCanvas(patVeins,28); default:return null; } }
function shade(hex,amt){ var m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); if(!m) return hex; var r=parseInt(m[1],16),g=parseInt(m[2],16),b=parseInt(m[3],16); r=Math.max(0,Math.min(255,r+amt)); g=Math.max(0,Math.min(255,g+amt)); b=Math.max(0,Math.min(255,b+amt)); return 'rgb('+r+','+g+','+b+')'; }
function currentSkinStyle(){ for(var i=0;i<SKINS.length;i++){ if(SKINS[i].id===applied.skin) return SKINS[i].style; } return 'metal'; }
function drawBlockStyle(c,x,y,s,baseHex,style,opt){
  var placed = opt && opt.placed;
  var R=Math.max(6, s*.22);
  function rrS(){ rr(c,x+1,y+1,s-2,s-2,R); }
  function glint(ox,oy,rad,a){ if(a==null)a=0.35; var g=c.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,rad); g.addColorStop(0,'rgba(255,255,255,'+a+')'); g.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=g; rrS(); c.fill(); }

  var styleNow = style||'metal';

  if(styleNow==='glass'){
    var body=c.createLinearGradient(x,y,x,y+s);
    body.addColorStop(0,'rgba(255,255,255,0.30)');
    body.addColorStop(0.35, baseHex);
    body.addColorStop(1, shade(baseHex,-22));
    rrS(); c.fillStyle=body; c.fill();
    var pat=getSkinPattern('glass'); if(pat){ c.save(); rrS(); c.fillStyle=pat; c.globalAlpha=0.32; c.fill(); c.restore(); }
    glint(s*0.25, s*0.22, s*0.46, 0.28);
  } else if(styleNow==='metal'){
    var body2=c.createLinearGradient(x,y,x,y+s);
    body2.addColorStop(0, shade(baseHex,14));
    body2.addColorStop(1, shade(baseHex,-26));
    rrS(); c.fillStyle=body2; c.fill();
    var pat2=getSkinPattern('metal'); if(pat2){ c.save(); rrS(); c.fillStyle=pat2; c.globalAlpha=0.55; c.fill(); c.restore(); }
  } else if(styleNow==='gem'){
    var body3=c.createLinearGradient(x,y,x+s,y+s);
    body3.addColorStop(0, shade(baseHex,30));
    body3.addColorStop(0.5, baseHex);
    body3.addColorStop(1, shade(baseHex,-30));
    rrS(); c.fillStyle=body3; c.fill();
    var pat3=getSkinPattern('gem'); if(pat3){ c.save(); rrS(); c.fillStyle=pat3; c.globalAlpha=0.38; c.fill(); c.restore(); }
  } else if(styleNow==='satin'){
    var body4=c.createLinearGradient(x,y,x,y+s);
    body4.addColorStop(0, shade(baseHex,12));
    body4.addColorStop(0.5, baseHex);
    body4.addColorStop(1, shade(baseHex,-12));
    rrS(); c.fillStyle=body4; c.fill();
    var pat4=getSkinPattern('satin'); if(pat4){ c.save(); rrS(); c.fillStyle=pat4; c.globalAlpha=0.26; c.fill(); c.restore(); }
  } else if(styleNow==='chrome'){
    var body5=c.createLinearGradient(x,y,x,y+s);
    body5.addColorStop(0,'rgba(255,255,255,.65)');
    body5.addColorStop(0.2, shade(baseHex,28));
    body5.addColorStop(0.5, shade(baseHex,-22));
    body5.addColorStop(0.8, shade(baseHex,24));
    body5.addColorStop(1,'rgba(255,255,255,.48)');
    rrS(); c.fillStyle=body5; c.fill();
    var pat5=getSkinPattern('chrome'); if(pat5){ c.save(); rrS(); c.fillStyle=pat5; c.globalAlpha=0.38; c.fill(); c.restore(); }
    glint(s*0.5, s*0.25, s*0.55, 0.24);
  } else if(styleNow==='porcelain'){
    var body6=c.createLinearGradient(x,y,x,y+s);
    body6.addColorStop(0, shade(baseHex,10));
    body6.addColorStop(1, shade(baseHex,-10));
    rrS(); c.fillStyle=body6; c.fill();
    var pat6=getSkinPattern('porcelain'); if(pat6){ c.save(); rrS(); c.fillStyle=pat6; c.globalAlpha=0.24; c.fill(); c.restore(); }
  } else if(styleNow==='carbon'){
    var body7=c.createLinearGradient(x,y,x,y+s);
    body7.addColorStop(0, shade(baseHex,8));
    body7.addColorStop(1, shade(baseHex,-18));
    rrS(); c.fillStyle=body7; c.fill();
    var pat7=getSkinPattern('carbon'); if(pat7){ c.save(); rrS(); c.fillStyle=pat7; c.globalAlpha=0.42; c.fill(); c.restore(); }
  } else if(styleNow==='frost'){
    var body8=c.createLinearGradient(x,y,x,y+s);
    body8.addColorStop(0, shade(baseHex,18));
    body8.addColorStop(1, shade(baseHex,-26));
    rrS(); c.fillStyle=body8; c.fill();
    var pat8=getSkinPattern('frost'); if(pat8){ c.save(); rrS(); c.fillStyle=pat8; c.globalAlpha=0.26; c.fill(); c.restore(); }
  } else if(styleNow==='velvet'){
    var body9=c.createLinearGradient(x,y,x,y+s);
    body9.addColorStop(0, shade(baseHex,16));
    body9.addColorStop(1, shade(baseHex,-16));
    rrS(); c.fillStyle=body9; c.fill();
    var pat9=getSkinPattern('velvet'); if(pat9){ c.save(); rrS(); c.fillStyle=pat9; c.globalAlpha=0.22; c.fill(); c.restore(); }
  } else if(styleNow==='marble'){
    var body10=c.createLinearGradient(x,y,x,y+s);
    body10.addColorStop(0, shade(baseHex,8));
    body10.addColorStop(1, shade(baseHex,-16));
    rrS(); c.fillStyle=body10; c.fill();
    var pat10=getSkinPattern('marble'); if(pat10){ c.save(); rrS(); c.fillStyle=pat10; c.globalAlpha=0.28; c.fill(); c.restore(); }
  } else {
    var body11=c.createLinearGradient(x,y,x,y+s);
    body11.addColorStop(0, baseHex);
    body11.addColorStop(1, shade(baseHex,-18));
    rrS(); c.fillStyle=body11; c.fill();
  }
  if(placed){
    rr(c,x+1.2,y+1.2,s-2.4,s-2.4,Math.max(5, R-1));
    c.lineWidth=Math.max(1, s*.06);
    c.strokeStyle='rgba(255,255,255,.12)';
    // okvir isključen
  }
}
function drawPlaced(c,x,y,s){ drawBlockStyle(c,x,y,s,getCss('--accent')||'#2ec5ff', currentSkinStyle(), {placed:true}); }
function drawPreview(c,x,y,s,col,ok){ drawBlockStyle(c,x,y,s, ok?col:'#ff5a5a', currentSkinStyle()); }

/* ===== Tray render ===== */
function drawPieceToCanvas(piece){
  var scale=24, pad=6, w=piece.w*scale+pad*2, h=piece.h*scale+pad*2;
  var c=document.createElement('canvas'); c.width=w*DPR; c.height=h*DPR; c.style.width=w+'px'; c.style.height=h+'px';
  var cx=c.getContext('2d'); cx.scale(DPR,DPR); cx.imageSmoothingEnabled=false;
  for(var i=0;i<piece.blocks.length;i++){ var dx=piece.blocks[i][0],dy=piece.blocks[i][1]; drawBlockStyle(cx, pad+dx*scale, pad+dy*scale, scale-2, piece.color, currentSkinStyle()); }
  return c;
}
function renderTray(){
  if(!trayEl) return;
  trayEl.innerHTML='';
  for(var i=0;i<state.hand.length;i++){
    var p=state.hand[i];
    var div=document.createElement('div');
    var fits=canFitAnywhere(p);
    div.className='slot'+(p.used?' used':'')+(p.used?'':(fits?' good':' bad'));
    div.setAttribute('data-index', String(i));
    var pieceCanvas = drawPieceToCanvas(p);
    div.appendChild(pieceCanvas);
    if(!p.used){
      var handler = function(e){ startDragFromSlot(e); };
      div.addEventListener('pointerdown', handler, {passive:false});
      pieceCanvas.addEventListener('pointerdown', handler, {passive:false});
      div.style.touchAction='none';
      pieceCanvas.style.touchAction='none';
    }
    trayEl.appendChild(div);
  }
}

/* ===== Scoring & Obstacles ===== */
var SCORE_CFG = { perBlock: 8, lineBase: 300, comboStep: 0.3, levelStep: 0.05 };
function levelMultiplier(){ return 1 + (state.level - 1) * SCORE_CFG.levelStep; }
function scoreForClear(lines){ if(lines<=0) return 0; var combo = 1 + (lines - 1) * SCORE_CFG.comboStep; return Math.round(SCORE_CFG.lineBase * lines * combo * levelMultiplier()); }
var LEVELS_MAX = 100; var LEVEL_STEP_SCORE = 10000;
function obstaclesForLevel(lvl){ var maxCells = BOARD*BOARD; return Math.min(Math.round(3 + lvl*1.2), Math.round(maxCells*0.15)); }
function applyObstacles(n){ var p=0,g=0; while(p<n && g<400){ g++; var x=Math.floor(Math.random()*BOARD), y=Math.floor(Math.random()*BOARD); if(state.grid[y][x]===0){ state.grid[y][x]=2; p++; } } }
function checkLevelUp(){ var need = state.level * LEVEL_STEP_SCORE; if(state.score >= need && state.level < LEVELS_MAX && state.mode==='obstacles'){ state.level++; state.maxLevel = Math.max(state.maxLevel, state.level); LS('bp8.level.max', String(state.maxLevel)); applyObstacles(Math.max(1, Math.floor(obstaclesForLevel(state.level)*0.6))); if(lvlEl) lvlEl.textContent = state.level; showToast('Level UP → '+state.level); requestDraw(); } }

/* ===== Draw (grid) ===== */
function draw(){
  if(!ctx || !canvas) return;
  var s=state.cell, W=s*BOARD, H=s*BOARD;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.scale(DPR,DPR);

  drawPanelAndGridOverlay(ctx, W, H, s);

  for(var y=0;y<BOARD;y++){
    for(var x=0;x<BOARD;x++){
      var v=state.grid[y][x];
      var px=x*s, py=y*s;
      if(v===1){ drawPlaced(ctx,px,py,s); }
      else if(v===2){ rr(ctx,px+1,py+1,s-2,s-2,9); ctx.fillStyle=OBSTACLE_COLOR; ctx.fill(); }
    }
  }
}

/* ===== FX ===== */
var particles=[];
function spawnParticles(cells){ if(!fctx) return; var s=state.cell,d=DPR; for(var i=0;i<cells.length;i++){ var xy=cells[i], bx=xy[0], by=xy[1]; for(var j=0;j<6;j++){ var base={x:(bx+0.5)*s*d,y:(by+0.5)*s*d,vx:(Math.random()-0.5)*2,vy:(-Math.random()*2-0.5),life:40,r:2,color:'#ffffffaa',shape:'dot'}; particles.push(base);} } }
function stepFX(){ if(!fctx || !fxCnv){ requestAnimationFrame(stepFX); return; } fctx.setTransform(1,0,0,1,0,0); fctx.clearRect(0,0,fxCnv.width,fxCnv.height); for(var i=0;i<particles.length;i++){ var p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.life--; fctx.globalAlpha=Math.max(0,p.life/40); fctx.fillStyle=p.color; fctx.beginPath(); fctx.arc(p.x,p.y,p.r,0,Math.PI*2); fctx.fill(); } for(i=particles.length-1;i>=0;i--) if(particles[i].life<=0) particles.splice(i,1); requestAnimationFrame(stepFX); }
requestAnimationFrame(stepFX);

/* ===== Place / Refill / Game over ===== */
function place(piece,gx,gy){
  var placedBlocks = piece.blocks.length;
  for(var i=0;i<piece.blocks.length;i++){ var dx=piece.blocks[i][0], dy=piece.blocks[i][1]; state.grid[gy+dy][gx+dx]=1; }

  var fullRows=[], fullCols=[], x,y,ok;
  for(y=0;y<BOARD;y++){ ok=true; for(x=0;x<BOARD;x++){ if(state.grid[y][x]!==1){ ok=false; break; } } if(ok) fullRows.push(y); }
  for(x=0;x<BOARD;x++){ ok=true; for(y=0;y<BOARD;y++){ if(state.grid[y][x]!==1){ ok=false; break; } } if(ok) fullCols.push(x); }

  var cells=[];
  for(var r=0;r<fullRows.length;r++){ var ry=fullRows[r]; for(x=0;x<BOARD;x++){ cells.push([x,ry]); } state.grid[ry]=[]; for(x=0;x<BOARD;x++) state.grid[ry][x]=0; }
  for(var c=0;c<fullCols.length;c++){ var cx=fullCols[c]; for(y=0;y<BOARD;y++){ cells.push([cx,y]); state.grid[y][cx]=0; } }
  if(cells.length) spawnParticles(cells);

  var linesCleared = fullRows.length + fullCols.length;
  var placePts = 8 * placedBlocks;
  var clearPts = scoreForClear(linesCleared);
  var gained = (placePts + clearPts);

  state.score += gained; if(scoreEl) scoreEl.textContent=state.score;
  stats.totalScore += gained; stats.blocksPlaced += placedBlocks; stats.linesCleared += linesCleared; saveStats(stats);

  if(state.score>(state.best[state.mode]||0)){ state.best[state.mode]=state.score; saveBest(state.best); if(bestEl) bestEl.textContent=state.score; }

  achievementsTick();

  piece.used=true;
  for(var i=0;i<state.hand.length;i++){ if(state.hand[i].id===piece.id){ state.hand[i]={blocks:piece.blocks,w:piece.w,h:piece.h,color:piece.color,used:true,id:piece.id}; } }
  renderTray();
  var allUsed=true; for(i=0;i<state.hand.length;i++){ if(!state.hand[i].used){ allUsed=false; break; } }
  if(allUsed) refillHand();

  if(state.mode!=='obstacles' && !anyFits()){
    if(goStats) goStats.textContent='Score: '+state.score+' • Best: '+(state.best[state.mode]||0);
    if(gameOver) gameOver.style.display='flex';
  }
  if(state.mode==='obstacles') checkLevelUp();
  requestDraw();
}
function refillHand(){ state.hand=[newPiece(),newPiece(),newPiece()]; renderTray(); }

/* ===== Drag preko celog ekrana (dragLayer) ===== */
var POINTER={active:false,fromSlotIndex:null};
function getViewportPos(e){ return {x:e.clientX, y:e.clientY}; }
function getGridGxGyFromPoint(px,py){
  var r=canvas.getBoundingClientRect();
  var s=state.cell;
  // pozicija prevučenog bloka kao da je centriran iznad prsta, malo podignut
  var offsetX=8, liftY=72;
  var baseX = (px - r.left) - (s*0.5) + offsetX;
  var baseY = (py - r.top)  - (s*0.5) - liftY;
  var gx=Math.round(baseX/s), gy=Math.round(baseY/s);
  return {gx:gx, gy:gy};
}
function renderDragLayer(){
  if(!dragCtx || !dragLayer || !state.dragging) return;
  var w=dragLayer.width/DPR, h=dragLayer.height/DPR;
  dragCtx.setTransform(1,0,0,1,0,0);
  dragCtx.clearRect(0,0,dragLayer.width,dragLayer.height);
  dragCtx.scale(DPR,DPR);

  var d=state.dragging, piece=d.piece, px=d.vx, py=d.vy, valid=d.valid;
  var s=state.cell;
  var liftY=72, offsetX=8;
  var baseX = px - (piece.w*s)/2 + offsetX;
  var baseY = py - (piece.h*s)/2 - liftY;

  for(var i=0;i<piece.blocks.length;i++){
    var dx=piece.blocks[i][0], dy=piece.blocks[i][1];
    drawPreview(dragCtx, baseX+dx*s, baseY+dy*s, s, piece.color, valid);
  }
}
function startDragFromSlot(e){
  var target = e.currentTarget || e.target;
  var parentSlot = target.closest ? target.closest('.slot') : null;
  var idx = parentSlot ? Number(parentSlot.getAttribute('data-index')) : Number(target.getAttribute('data-index'));
  var piece=state.hand[idx]; if(!piece||piece.used) return;

  POINTER.active=true; POINTER.fromSlotIndex=idx;
  state.dragging={piece:piece,gx:null,gy:null,valid:false,px:null,py:null,vx:null,vy:null};

  if(parentSlot && parentSlot.classList) parentSlot.classList.add('used');
  try{ if(parentSlot && parentSlot.setPointerCapture && e.pointerId!=null) parentSlot.setPointerCapture(e.pointerId); }catch(_){}
  document.body.style.cursor='grabbing';
  if(e.preventDefault) e.preventDefault(); if(e.stopPropagation) e.stopPropagation();

  // inicijalno iscrtavanje
  var pos=getViewportPos(e);
  state.dragging.vx=pos.x; state.dragging.vy=pos.y;
  var gxy=getGridGxGyFromPoint(pos.x,pos.y);
  var p=state.dragging.piece, maxX=BOARD-p.w, maxY=BOARD-p.h;
  if(gxy.gx<0||gxy.gx>maxX||gxy.gy<0||gxy.gy>maxY){ state.dragging.valid=false; state.dragging.gx=null; state.dragging.gy=null; }
  else { var ok=canPlace(p,gxy.gx,gxy.gy); state.dragging.valid=ok; state.dragging.gx=gxy.gx; state.dragging.gy=gxy.gy; }
  renderDragLayer();
}
function onPointerMove(e){
  if(!POINTER.active||!state.dragging) return;
  var pos=getViewportPos(e);
  state.dragging.vx=pos.x; state.dragging.vy=pos.y;
  var gxy=getGridGxGyFromPoint(pos.x,pos.y);
  var p=state.dragging.piece, maxX=BOARD-p.w, maxY=BOARD-p.h;
  if(gxy.gx<0||gxy.gx>maxX||gxy.gy<0||gxy.gy>maxY){ state.dragging.valid=false; state.dragging.gx=null; state.dragging.gy=null; }
  else { var ok=canPlace(p,gxy.gx,gxy.gy); state.dragging.valid=ok; state.dragging.gx=gxy.gx; state.dragging.gy=gxy.gy; }
  renderDragLayer();
}
function onPointerUp(){
  if(!POINTER.active||!state.dragging) return;
  var d=state.dragging;
  var sel='.slot[data-index="'+POINTER.fromSlotIndex+'"]';
  var slot = (trayEl && trayEl.querySelector) ? trayEl.querySelector(sel) : null;
  POINTER.active=false; document.body.style.cursor='';
  if(d.valid && d.gx!=null && d.gy!=null) place(d.piece,d.gx,d.gy);
  else if(slot && slot.classList) slot.classList.remove('used');
  state.dragging=null;
  // očisti drag overlay
  if(dragCtx) { dragCtx.setTransform(1,0,0,1,0,0); dragCtx.clearRect(0,0,dragLayer.width,dragLayer.height); }
  requestDraw();
}
function onPointerCancel(){
  if(!POINTER.active||!state.dragging) return;
  var sel='.slot[data-index="'+POINTER.fromSlotIndex+'"]';
  var slot = (trayEl && trayEl.querySelector) ? trayEl.querySelector(sel) : null;
  POINTER.active=false; document.body.style.cursor='';
  if(slot && slot.classList) slot.classList.remove('used');
  state.dragging=null;
  if(dragCtx) { dragCtx.setTransform(1,0,0,1,0,0); dragCtx.clearRect(0,0,dragLayer.width,dragLayer.height); }
  requestDraw();
}
window.addEventListener('pointermove', onPointerMove, {passive:false});
window.addEventListener('pointerup', onPointerUp, {passive:true});
window.addEventListener('pointercancel', onPointerCancel, {passive:true});
window.addEventListener('lostpointercapture', onPointerCancel, {passive:true});

/* ===== UI helpers ===== */
function showToast(msg){
  var t=document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);
    var st=t.style; st.position='fixed'; st.left='50%'; st.bottom='24px'; st.transform='translateX(-50%)'; st.background='rgba(8,14,28,.9)'; st.color='#e8ecf1'; st.padding='10px 14px'; st.borderRadius='12px'; st.boxShadow='0 10px 30px rgba(0,0,0,.35)'; st.zIndex=99; st.transition='opacity .25s'; st.opacity='0'; st.border='1px solid rgba(255,255,255,.06)';
  }
  t.textContent=msg; t.style.opacity='1'; setTimeout(function(){ t.style.opacity='0'; }, 1600);
}
function updateSoundLabel(){ if(setSound) setSound.textContent = (settings.sound?'🔈 On':'🔇 Off'); }
function applyTheme(t){ if(document.body && document.body.classList){ if(t==='light'){ document.body.classList.add('light'); } else { document.body.classList.remove('light'); } } }
function saveBest(b){ LS('bp8.best', JSON.stringify(b)); }
function loadBest(){ var s=LS('bp8.best'); try{ return s? JSON.parse(s):null; }catch(e){ return null; } }

/* ===== Buttons / Events ===== */
if(resetBtn) resetBtn.addEventListener('click', function(){ newGame(state.mode); });
if(backBtn)  backBtn.addEventListener('click', function(){ goHome(); });

if(settingsBtn) settingsBtn.addEventListener('click', function(){ if(settingsModal) settingsModal.style.display='flex'; });
if(settingsModal){ var bd = settingsModal.querySelector ? settingsModal.querySelector('.backdrop') : null; if(bd) bd.addEventListener('click', function(){ settingsModal.style.display='none'; }); }
if(closeSettings) closeSettings.addEventListener('click', function(){ settingsModal.style.display='none'; });
if(setThemeBtn) setThemeBtn.addEventListener('click', function(){ settings.theme=(settings.theme==='dark'?'light':'dark'); LS('bp8.theme',settings.theme); applyTheme(settings.theme); });
if(setSound) setSound.addEventListener('click', function(){ settings.sound=!settings.sound; LS('bp8.sound', (settings.sound?'1':'0')); updateSoundLabel(); });
if(resetBest) resetBest.addEventListener('click', function(){ SAFE.removeItem && SAFE.removeItem('bp8.best'); state.best={classic:0,obstacles:0}; if(bestEl) bestEl.textContent=0; showToast('Best resetovan'); });

if(playAgain) playAgain.addEventListener('click', function(){ if(gameOver) gameOver.style.display='none'; newGame(state.mode); });
if(goMenu)   goMenu.addEventListener('click', function(){ if(gameOver) gameOver.style.display='none'; goHome(); });
if(startClassic)   startClassic.addEventListener('click', function(){ startGame('classic'); });
if(startObstacles) startObstacles.addEventListener('click', function(){ startGame('obstacles'); });

if(achBtn){
  achBtn.addEventListener('click', function(){
    if(!achievementsModal) return;
    achievementsModal.style.display='flex';
    var curIdx = getCurrentMilestoneIndex();
    var block = indexToBlock(curIdx>=0?curIdx:0);
    achPage = Math.max(1, Math.min(20, block));
    renderAchievementsPage();
    renderMilestoneBoxForBlock(block);
  });
}
if(achievementsModal){ var abd = achievementsModal.querySelector ? achievementsModal.querySelector('.backdrop') : null; if(abd) abd.addEventListener('click', function(){ achievementsModal.style.display='none'; }); }
if(closeAch) closeAch.addEventListener('click', function(){ achievementsModal.style.display='none'; });
if(achPrev) achPrev.addEventListener('click', function(){ achPage=Math.max(1, achPage-1); renderAchievementsPage(); renderMilestoneBoxForBlock(achPage); });
if(achNext) achNext.addEventListener('click', function(){ achPage=Math.min(20, achPage+1); renderAchievementsPage(); renderMilestoneBoxForBlock(achPage); });

if(btnWatchAd) btnWatchAd.addEventListener('click', watchAdInAchievements);
if(btnClaim)   btnClaim.addEventListener('click', function(){
  if(btnClaim.getAttribute('aria-disabled')==='true'){ showToast('Završi 50/50 ciljeva i reklame za ovaj blok.'); return; }
  claimMilestoneReward();
});

/* Kolekcija modal + TABOVI */
if(collectionBtn){
  collectionBtn.addEventListener('click', function(){
    if(!collectionModal) return;
    collectionModal.style.display='flex';
    renderCollection();
    setTab('themes');
  });
}
if(collectionModal){ var cbd = collectionModal.querySelector ? collectionModal.querySelector('.backdrop') : null; if(cbd) cbd.addEventListener('click', function(){ collectionModal.style.display='none'; }); }
if(closeCollection) closeCollection.addEventListener('click', function(){ collectionModal.style.display='none'; });

if(tabThemes) tabThemes.addEventListener('click', function(){ setTab('themes'); });
if(tabSkins)  tabSkins.addEventListener('click', function(){ setTab('skins'); });
function setTab(which){
  var themesSel = (which==='themes');
  if(tabThemes) tabThemes.setAttribute('aria-selected', themesSel? 'true':'false');
  if(tabSkins)  tabSkins.setAttribute('aria-selected', themesSel? 'false':'true');
  if(panelThemes) panelThemes.setAttribute('aria-hidden', themesSel? 'false':'true');
  if(panelSkins)  panelSkins.setAttribute('aria-hidden', themesSel? 'true':'false');
}

/* ===== Flow ===== */
function startGame(mode){
  state.mode=mode||'classic';
  if(start) start.style.display='none';
  if(app) app.style.display='flex';
  sizeToScreen(); newGame(mode);
}
function goHome(){ if(app) app.style.display='none'; if(start) start.style.display='flex'; state.dragging=null; if(dragCtx){ dragCtx.setTransform(1,0,0,1,0,0); dragCtx.clearRect(0,0,dragLayer.width,dragLayer.height);} requestDraw(); }
function newGame(mode){
  state.grid=createGrid(BOARD);
  state.score=0; if(scoreEl) scoreEl.textContent=0; if(bestEl) bestEl.textContent=String(state.best[mode]||0);
  state.hand=[]; refillHand();
  if(mode==='obstacles'){
    if(levelPill) levelPill.style.display='inline-flex';
    state.level = 1; if(lvlEl) lvlEl.textContent = state.level; applyObstacles(obstaclesForLevel(state.level));
    showToast('Obstacles — Level 1');
  }else{ if(levelPill) levelPill.style.display='none'; }
  requestDraw();
}

/* ===== Resize ===== */
function sizeToScreen(){
  if(!canvas) return;
  var headerEl = document.querySelector('header');
  var headerH  = headerEl ? headerEl.offsetHeight : 60;
  var trayH    = trayEl ? (trayEl.offsetHeight) : 120;
  var chrome   = 28;

  var availH = Math.max(260, window.innerHeight - headerH - trayH - chrome);
  var availW = Math.min(document.documentElement.clientWidth, 720) - 32;
  var side   = Math.max(240, Math.min(availW, availH));
  var cell   = Math.floor(side/BOARD);
  var px     = cell*BOARD;

  canvas.style.width=px+'px'; canvas.style.height=px+'px'; canvas.width=Math.floor(px*DPR); canvas.height=Math.floor(px*DPR);
  if(fxCnv){ fxCnv.style.width=px+'px'; fxCnv.style.height=px+'px'; fxCnv.width=Math.floor(px*DPR); fxCnv.height=Math.floor(px*DPR); }
  if(ctx){ ctx.setTransform(1,0,0,1,0,0); ctx.scale(DPR,DPR); }
  if(fctx){ fctx.setTransform(1,0,0,1,0,0); }
  state.cell=cell;

  // drag overlay na ceo ekran
  if(dragLayer){
    var w=window.innerWidth, h=window.innerHeight;
    dragLayer.style.width=w+'px'; dragLayer.style.height=h+'px';
    dragLayer.width=Math.floor(w*DPR); dragLayer.height=Math.floor(h*DPR);
    if(dragCtx){ dragCtx.setTransform(1,0,0,1,0,0); dragCtx.clearRect(0,0,dragLayer.width,dragLayer.height); }
  }

  // global bg canvas
  if(bg){
    var bw=window.innerWidth, bh=window.innerHeight;
    if(bg.width!==Math.floor(bw*DPR) || bg.height!==Math.floor(bh*DPR)){
      bg.width=Math.floor(bw*DPR); bg.height=Math.floor(bh*DPR);
    }
  }
  requestDraw();
}
var drawQueued=false; function requestDraw(){ if(!drawQueued){ drawQueued=true; window.requestAnimationFrame(function(){ drawQueued=false; draw(); }); } }
window.addEventListener('resize', sizeToScreen, {passive:true});
sizeToScreen();

/* ===== INIT fallback ===== */
if(!startClassic){
  if(start) start.style.display='none';
  if(app) app.style.display='flex';
  newGame('classic');
}

})(); 
