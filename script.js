/* ---------- UTIL ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
function swapScreen(show){
  $$('.screen,#mainMenu').forEach(s=>s.classList.add('hidden'));
  $(show).classList.remove('hidden');
}
$('#btnTetris').onclick = ()=>{ swapScreen('#tetrisScreen'); startTetris(); };
$('#btnBlock').onclick = ()=>{ swapScreen('#blockScreen'); initBlock(); };
$$('.back').forEach(b=>b.onclick = ()=>swapScreen('#mainMenu'));

/* ---------- TETRIS ---------- */
const BOARD_W=10, BOARD_H=20;
const SHAPES = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[1,1,1],[0,1,0]],
  [[1,1,1],[1,0,0]],
  [[1,1,1],[0,0,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,0],[0,1,1]]
];
let board, piece, score=0, level=1, lines=0, dropInterval;
const canvas=$('#tetrisCanvas');
const ctx=canvas.getContext('2d');
const SIZE = Math.min(window.innerWidth*.9/BOARD_W, 28);

function startTetris(){
  canvas.width = BOARD_W*SIZE;
  canvas.height = BOARD_H*SIZE;
  board = Array.from({length:BOARD_H},()=>Array(BOARD_W).fill(0));
  score=level=lines=0;
  updateInfo();
  newPiece();
  drawBoard();
  clearInterval(dropInterval);
  dropInterval = setInterval(drop, 500/level);
}

function newPiece(){
  const idx = Math.floor(Math.random()*SHAPES.length);
  piece = {shape:SHAPES[idx],x:Math.floor(BOARD_W/2)-1,y:0};
  if(collision()){ alert('Kraj!'); swapScreen('#mainMenu'); }
}
function collision(){
  for(let y=0;y<piece.shape.length;y++)
    for(let x=0;x<piece.shape[y].length;x++)
      if(piece.shape[y][x]){
        const nx=piece.x+x, ny=piece.y+y;
        if(nx<0||nx>=BOARD_W||ny>=BOARD_H||(ny>=0&&board[ny][nx])) return true;
      }
  return false;
}
function merge(){
  piece.shape.forEach((row,dy)=>row.forEach((v,dx)=>v&&(board[piece.y+dy][piece.x+dx]=1)));
}
function clearLines(){
  let count=0;
  for(let y=BOARD_H-1;y>=0;y--){
    if(board[y].every(v=>v)){
      board.splice(y,1); board.unshift(Array(BOARD_W).fill(0));
      count++; y++;
    }
  }
  if(count){ lines+=count; score+=count*100*level; level=Math.floor(lines/10)+1; updateInfo(); }
}
function drawBoard(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
  const fill=(x,y,c)=>{ ctx.fillStyle=c; ctx.fillRect(x*SIZE,y*SIZE,SIZE-1,SIZE-1); };
  board.forEach((row,y)=>row.forEach((v,x)=>v&&fill(x,y,'#00bcd4')));
  if(piece) piece.shape.forEach((row,dy)=>row.forEach((val,dx)=>val&&fill(piece.x+dx,piece.y+dy,'#fff')));
}
function updateInfo(){
  $('#score').textContent='Rez: '+score;
  $('#level').textContent='Lvl: '+level;
  $('#lines').textContent='Linije: '+lines;
}
function move(dir){ piece.x+=dir; if(collision()) piece.x-=dir; drawBoard(); }
function rotate(){
  const rotated = piece.shape[0].map((_,i)=>piece.shape.map(r=>r[i]).reverse());
  const prev = piece.shape; piece.shape = rotated;
  if(collision()) piece.shape=prev;
  drawBoard();
}
function drop(){
  piece.y++;
  if(collision()){
    piece.y--; merge(); clearLines(); newPiece();
  }
  drawBoard();
}
/* touch kontrole */
$('#tLeft').onclick  = ()=>move(-1);
$('#tRight').onclick = ()=>move(1);
$('#tRotate').onclick= ()=>rotate();
$('#tDrop').onclick  = ()=>drop();

/* ---------- BLOK PUZLE ---------- */
const BLOCK_SHAPES=[
  [[1,1],[1,1]],
  [[1,1,1],[1,0,0]],
  [[1,1,1,1]],
  [[1,1,0],[0,1,1]],
  [[0,1],[0,1],[1,1]]
];
let blockBoard, selectedShape;

function initBlock(){
  blockBoard = Array(100).fill(0);
  renderGrid();
  generateShapes();
}
function renderGrid(){
  const grid=$('#blockGrid');
  grid.innerHTML='';
  blockBoard.forEach((v,i)=>{
    const cell=document.createElement('div');
    if(v) cell.classList.add('filled');
    cell.dataset.idx=i;
    cell.addEventListener('click', ()=>placeOnGrid(i));
    grid.appendChild(cell);
  });
}
function generateShapes(){
  const preview=$('#blockPreview');
  preview.innerHTML='';
  for(let i=0;i<3;i++){
    const idx=Math.floor(Math.random()*BLOCK_SHAPES.length);
    const shape=BLOCK_SHAPES[idx];
    const box=document.createElement('div');
    box.className='previewBox';
    box.shape=shape;
    for(let r=0;r<4;r++){
      for(let c=0;c<4;c++){
        const d=document.createElement('div');
        if(shape[r]&&shape[r][c]) d.classList.add('filled');
        box.appendChild(d);
      }
    }
    box.addEventListener('click',()=>selectShape(shape));
    preview.appendChild(box);
  }
}
function selectShape(shape){ selectedShape=shape; }
function canPlace(shape,x,y){
  for(let r=0;r<shape.length;r++)
    for(let c=0;c<shape[r].length;c++)
      if(shape[r][c]){
        const nx=x+c, ny=y+r;
        if(nx<0||nx>=10||ny<0||ny>=10||blockBoard[ny*10+nx]) return false;
      }
  return true;
}
function placeOnGrid(idx){
  if(!selectedShape) return;
  const x=idx%10, y=Math.floor(idx/10);
  if(!canPlace(selectedShape,x,y)) return;
  selectedShape.forEach((row,dy)=>row.forEach((v,dx)=>v&&(blockBoard[(y+dy)*10+(x+dx)]=1)));
  clearFull();
  renderGrid();
  generateShapes();
  selectedShape=null;
}
function clearFull(){
  // redovi
  for(let r=0;r<10;r++){
    if(blockBoard.slice(r*10,r*10+10).every(v=>v)){
      blockBoard.splice(r*10,10); blockBoard.unshift(...Array(10).fill(0));
    }
  }
  // kolone
  for(let c=0;c<10;c++){
    if([...Array(10).keys()].every(r=>blockBoard[r*10+c])){
      for(let r=0;r<10;r++) blockBoard[r*10+c]=0;
    }
  }
}
