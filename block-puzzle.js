/* Block Puzzle 10×10 drag & drop */
(()=>{
const cv=document.getElementById('puzzleCanvas'),ctx=cv.getContext('2d'),SIZE=cv.width/10;
const grid=Array.from({length:10},()=>Array(10).fill(0));
let score=0,best=+(localStorage.getItem('puzzleBest')||0);
$('#puzzleBest').textContent=best;
const pieces=[[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,1,0],[0,1,1]]];
const colors=['#ff6b6b','#51cf66','#339af0'];
const cans=$$('#puzzle-pieces .piece');
let sel=null,sx=0,sy=0;
function drawGrid(){
ctx.clearRect(0,0,cv.width,cv.height);
grid.forEach((row,y)=>row.forEach((cell,x)=>{
if(cell){ctx.fillStyle=cell;ctx.fillRect(x*SIZE,y*SIZE,SIZE,SIZE);}
ctx.strokeStyle='#333';ctx.strokeRect(x*SIZE,y*SIZE,SIZE,SIZE);
}));
}
function canPlace(p,x,y){
for(let py=0;py<p.length;py++)for(let px=0;px<p[py].length;px++){
if(!p[py][px])continue;const nx=x+px,ny=y+py;
if(nx<0||nx>=10||ny<0||ny>=10||grid[ny][nx])return false;
}return true;
}
function place(p,x,y,color){
p.forEach((row,py)=>row.forEach((cell,px)=>{if(cell)grid[y+py][x+px]=color}));
score+=10;$('#puzzleScore').textContent=score;
if(score>best){best=score;localStorage.setItem('puzzleBest',best);$('#puzzleBest').textContent=best;}
drawGrid();
}
pieces.forEach((p,i)=>{
const c=cans[i],cx=c.getContext('2d');
cx.clearRect(0,0,80,80);
p.forEach((row,y)=>row.forEach((cell,x)=>{
if(cell){cx.fillStyle=colors[i];cx.fillRect(x*20,y*20,20,20);cx.strokeRect(x*20,y*20,20,20);}
}));
c.addEventListener('touchstart',e=>{sel=i;const r=c.getBoundingClientRect();sx=e.touches[0].clientX-r.left;sy=e.touches[0].clientY-r.top;});
c.addEventListener('mousedown',e=>{sel=i;const r=c.getBoundingClientRect();sx=e.clientX-r.left;sy=e.clientY-r.top;});
});
cv.addEventListener('touchend',e=>{
if(sel===null)return;const r=cv.getBoundingClientRect(),x=Math.floor((e.changedTouches[0].clientX-r.left)/SIZE),y=Math.floor((e.changedTouches[0].clientY-r.top)/SIZE);
if(canPlace(pieces[sel],x,y))place(pieces[sel],x,y,colors[sel]);sel=null;
});
cv.addEventListener('mouseup',e=>{
if(sel===null)return;const r=cv.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/SIZE),y=Math.floor((e.clientY-r.top)/SIZE);
if(canPlace(pieces[sel],x,y))place(pieces[sel],x,y,colors[sel]);sel=null;
});
drawGrid();
})();
