/* Tetris mini */
(()=>{
const COLS=10,ROWS=20,SIZE=30;
const SHAPES=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
const COLORS=['cyan','yellow','purple','orange','blue','lime','red'];
let board,score=0,level=1,lines=0,piece,next,dropTimer,paused=false;
const cv=$('#gameCanvas'),ctx=cv.getContext('2d'),nextCv=$('#nextCanvas'),nextCtx=nextCv.getContext('2d');
const bestLbl=$('#bestScore'),scoreLbl=$('#score'),levelLbl=$('#level'),linesLbl=$('#lines');
const audio={};
['drop','clear','rotate','gameover','tetris','music'].forEach(k=>audio[k]=$(`#snd-${k}`));
let muted=JSON.parse(localStorage.getItem('muted')||'false');
let theme=localStorage.getItem('theme')||'classic';

function createBoard(){return Array.from({length:ROWS},()=>Array(COLS).fill(0))}
function randomPiece(){const i=Math.floor(Math.random()*SHAPES.length);return{shape:SHAPES[i],color:COLORS[i],x:3,y:0}}
function collide(p,b){for(let y=0;y<p.shape.length;y++)for(let x=0;x<p.shape[y].length;x++){if(!p.shape[y][x])continue;let nx=p.x+x,ny=p.y+y;if(nx<0||nx>=COLS||ny>=ROWS||(ny>=0&&b[ny][nx]))return true}return false}
function place(){piece.shape.forEach((row,dy)=>row.forEach((cell,dx)=>{if(cell&&piece.y+dy>=0)board[piece.y+dy][piece.x+dx]=piece.color}));audio.drop.play();let cleared=0;for(let y=ROWS-1;y>=0;y--)if(board[y].every(v=>v)){board.splice(y,1);board.unshift(Array(COLS).fill(0));cleared++;y++}if(cleared){lines+=cleared;score+=[0,100,300,500,800][cleared]*level;level=Math.floor(lines/10)+1;audio[cleared===4?'tetris':'clear'].play();resetTimer()}newPiece();updateLabels()}
function draw(){ctx.clearRect(0,0,cv.width,cv.height);board.forEach((row,y)=>row.forEach((cell,x)=>{if(cell){ctx.fillStyle=cell;ctx.fillRect(x*SIZE,y*SIZE,SIZE,SIZE);ctx.strokeStyle='#000';ctx.strokeRect(x*SIZE,y*SIZE,SIZE,SIZE)}}));piece.shape.forEach((row,dy)=>row.forEach((cell,dx)=>{if(cell){ctx.fillStyle=piece.color;ctx.fillRect((piece.x+dx)*SIZE,(piece.y+dy)*SIZE,SIZE,SIZE);ctx.strokeRect((piece.x+dx)*SIZE,(piece.y+dy)*SIZE,SIZE,SIZE)}}));nextCtx.clearRect(0,0,nextCv.width,nextCv.height);next.shape.forEach((row,dy)=>row.forEach((cell,dx)=>{if(cell){nextCtx.fillStyle=next.color;nextCtx.fillRect(dx*20,dy*20,20,20)}}))}
function newPiece(){piece=next;next=randomPiece();if(collide(piece,board)){gameOver()}}
function resetTimer(){clearInterval(dropTimer);dropTimer=setInterval(()=>move(0,1),1000-(level-1)*50)}
function move(dx,dy){piece.x+=dx;piece.y+=dy;if(collide(piece,board)){piece.x-=dx;piece.y-=dy;if(dy)place()}draw()}
function rotate(){const rotated=piece.shape[0].map((_,i)=>piece.shape.map(r=>r[i]).reverse());const prev=piece.shape;piece.shape=rotated;if(collide(piece,board))piece.shape=prev;else audio.rotate.play();draw()}
function drop(){while(!collide({...piece,y:piece.y+1},board))piece.y++;place()}
function gameOver(){clearInterval(dropTimer);audio.gameover.play();if(score>+(localStorage.getItem('best')||0)){localStorage.setItem('best',score);bestLbl.textContent=score}alert('Game Over!');show('main')}
function updateLabels(){scoreLbl.textContent=score;levelLbl.textContent=level;linesLbl.textContent=lines;bestLbl.textContent=localStorage.getItem('best')||0}
function show(id){Object.values({main:$('#main-menu'),tetrisMenu:$('#tetris-menu'),settings:$('#settings-modal'),game:$('#tetris-wrapper'),puzzle:$('#block-puzzle-wrapper')}).forEach(s=>s.style.display='none');$(id).style.display='flex';}
function startGame(){board=createBoard();score=0;level=1;lines=0;next=randomPiece();newPiece();show('game');draw();resetTimer()}
function pause(on){paused=on;$('#pause-overlay').style.display=on?'flex':'none';if(on)clearInterval(dropTimer);else resetTimer()}

/* events */
document.body.addEventListener('click',e=>{
const a=e.target.dataset.action;if(!a)return;
switch(a){
case'select-tetris':show('tetrisMenu');break;
case'start-tetris':startGame();break;
case'select-blockpuzzle':show('puzzle');break;
case'open-settings':show('settings');break;
case'back-to-main':
case'return-to-main':show('main');break;
case'pause':pause(true);break;
case'resume':pause(false);break;
case'toggle-sound':muted=!muted;Object.values(audio).forEach(a=>a.muted=muted);localStorage.setItem('muted',muted);$('#sound-btn').textContent=muted?'🔇':'🔊';break;
}
});
document.addEventListener('keydown',e=>{
if(!$('#tetris-wrapper').style.display)return;
if(e.key==='Escape')pause(!paused);
if(paused)return;
switch(e.key){
case'ArrowLeft':move(-1,0);break;
case'ArrowRight':move(1,0);break;
case'ArrowDown':move(0,1);break;
case'ArrowUp':rotate();break;
case' ':drop();break;
}
});
$('#leftBtn').onclick=()=>move(-1,0);
$('#rightBtn').onclick=()=>move(1,0);
$('#downBtn').onclick=()=>move(0,1);
$('#rotateBtn').onclick=rotate;
$('#dropBtn').onclick=drop;
updateLabels();
})();
