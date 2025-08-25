// ====== Global State ======
const state = {
  gridSize: 8,
  board: [],
  tray: [],
  dragging: null,
  score: 0,
  best: {classic:0, obstacles:0, zen:0},
  mode: 'classic',
  sound: true,
};

const cellSize = 48;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const fx = document.getElementById('fx').getContext('2d');

// ====== Utils ======
function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function playSound(){ if(state.sound) new Audio('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg').play(); }
function saveBest(){ localStorage.setItem('bpBest', JSON.stringify(state.best)); }
function loadBest(){ const b=localStorage.getItem('bpBest'); if(b) state.best=JSON.parse(b); }

// ====== Init ======
function newGame(mode){
  state.mode = mode||'classic';
  state.board = Array(state.gridSize).fill().map(()=>Array(state.gridSize).fill(null));
  if(mode==='obstacles'){
    for(let i=0;i<rnd(3,6);i++){
      state.board[rnd(0,7)][rnd(0,7)] = {color:'#555',fixed:true};
    }
  }
  state.tray = genTray();
  state.score=0;
  draw();
}
function genTray(){
  return [genPiece(), genPiece(), genPiece()];
}
function genPiece(){
  const shapes = [
    [[1]], [[1,1]], [[1],[1]], [[1,1,1]], [[1],[1],[1]],
    [[1,1],[1,1]], [[1,1,1,1]], [[1],[1],[1],[1]]
  ];
  const shape = shapes[rnd(0,shapes.length-1)];
  const color = ['#ff7676','#ffb347','#f9f871','#7bed9f','#70a1ff','#e056fd'][rnd(0,5)];
  return {shape,color};
}

// ====== Drawing ======
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawAurora(ctx,canvas.width,canvas.height,Date.now()/1000);
  drawBoard();
  drawTray();
  requestAnimationFrame(draw);
}
function drawAurora(c,w,h,t){
  const g = c.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#4facfe'); g.addColorStop(1,'#00f2fe');
  c.fillStyle=g; c.fillRect(0,0,w,h);
}
function drawBoard(){
  const s=cellSize;
  const offX= (canvas.width - s*state.gridSize)/2;
  const offY= (canvas.height - s*state.gridSize)/2 - 30;
  for(let y=0;y<state.gridSize;y++){
    for(let x=0;x<state.gridSize;x++){
      const cell = state.board[y][x];
      ctx.fillStyle = cell? cell.color : 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(offX+x*s,offY+y*s,s-2,s-2,8);
      ctx.fill();
    }
  }
}
function drawTray(){
  const tray = document.getElementById('tray');
  tray.innerHTML='';
  state.tray.forEach((p,i)=>{
    const div=document.createElement('div');
    div.className='piece';
    div.innerText='⬛'.repeat(p.shape[0].length*p.shape.length);
    div.style.color=p.color;
    tray.appendChild(div);
  });
}

// ====== Events ======
document.getElementById('startClassic').onclick=()=>{ startGame('classic') };
document.getElementById('startObstacles').onclick=()=>{ startGame('obstacles') };
document.getElementById('startZen').onclick=()=>{ startGame('zen') };

function startGame(mode){
  document.getElementById('startScreen').style.display='none';
  document.getElementById('app').style.display='flex';
  newGame(mode);
}

// ====== Bootstrap ======
loadBest();
draw();
