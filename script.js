/*  TETRIS LITE v1.0  – next, preview, touch, keyboard, pause, score  */
(() => {
    /* ---------- 0. Pomocno ---------- */
    const $ = sel => document.querySelector(sel);
    const $$ = sel => document.querySelectorAll(sel);
    const log = console.log;

    /* ---------- 1. Konfiguracija ---------- */
    const COLS = 10, ROWS = 20;
    const BOARD_W = 300, BOARD_H = 600;
    const BLOCK = BOARD_W / COLS;

    const SHAPES = [
        [[1,1,1,1]],                 // I
        [[1,1],[1,1]],               // O
        [[0,1,0],[1,1,1]],           // T
        [[1,0,0],[1,1,1]],           // L
        [[0,0,1],[1,1,1]],           // J
        [[0,1,1],[1,1,0]],           // S
        [[1,1,0],[0,1,1]]            // Z
    ];
    const COLORS = ['cyan','yellow','purple','orange','blue','lime','red'];

    /* ---------- 2. DOM elementi ---------- */
    const screens = {
        main:  $('#main-menu'),
        tetrisMenu: $('#tetris-menu'),
        settings: $('#settings-modal'),
        game:  $('#tetris-wrapper'),
        pause: $('#pause-overlay')
    };
    const canvas   = $('#gameCanvas');
    const ctx      = canvas.getContext('2d');
    const nextCv   = $('#nextCanvas');
    const nextCtx  = nextCv.getContext('2d');
    const scoreLbl = $('#score');
    const levelLbl = $('#level');
    const linesLbl = $('#lines');
    const bestLbl  = $('#bestScore');
    const soundBtn = $('#sound-btn');
    const themeSel = $('#theme-select');

    /* ---------- 3. Stanje igre ---------- */
    let board, piece, next, score, level, lines, dropInterval, paused;
    let audioCtx = {};
    ['drop','clear','rotate','gameover','tetris','music'].forEach(
        k => audioCtx[k] = $(`#snd-${k}`)
    );
    let muted = JSON.parse(localStorage.getItem('muted') || 'false');
    let theme = localStorage.getItem('theme') || 'classic';

    /* ---------- 4. Inicijalizacija ---------- */
    init();
    function init() {
        applyTheme(theme);
        hookEvents();
        loadBest();
        mute(muted);
    }

    /* ---------- 5. Event listeners ---------- */
    function hookEvents() {
        /* Meni navigacija */
        document.body.addEventListener('click', e=>{
            const action = e.target.dataset.action;
            if(!action) return;
            switch(action){
                case 'select-tetris': show(screens.tetrisMenu); break;
                case 'start-tetris':  startGame(); break;
                case 'open-settings': show(screens.settings); break;
                case 'back-to-main':  show(screens.main); break;
                case 'pause':         pause(true); break;
                case 'resume':        pause(false); break;
                case 'toggle-sound':  mute(!muted); break;
            }
        });
        themeSel.addEventListener('change', e=> applyTheme(e.target.value));

        /* Keyboard */
        document.addEventListener('keydown', e=>{
            if(!screens.game.style.display) return;
            if(e.key==='Escape'){ pause(!paused); return; }
            if(paused) return;
            switch(e.key){
                case 'ArrowLeft': move(-1,0); break;
                case 'ArrowRight': move(1,0); break;
                case 'ArrowDown': move(0,1); break;
                case 'ArrowUp': rotate(); break;
                case ' ': drop(); break;
            }
        });

        /* Touch dugmad */
        $('#leftBtn').onclick  = ()=>move(-1,0);
        $('#rightBtn').onclick = ()=>move(1,0);
        $('#downBtn').onclick  = ()=>move(0,1);
        $('#rotateBtn').onclick= ()=>rotate();
        $('#dropBtn').onclick  = ()=>drop();

        /* Resize */
        window.addEventListener('resize', draw);
    }

    /* ---------- 6. Igra logika ---------- */
    function startGame(){
        board = createBoard();
        score = lines = 0;
        level = 1;
        next = randomPiece();
        newPiece();
        paused = false;
        show(screens.game);
        draw();
        resetDropTimer();
    }
    function createBoard(){ return Array.from({length:ROWS},()=>Array(COLS).fill(0)); }

    function randomPiece(){
        const idx = Math.floor(Math.random()*SHAPES.length);
        return {shape:SHAPES[idx], color:COLORS[idx], x:3, y:0};
    }
    function newPiece(){
        piece = next; next = randomPiece();
        if(collide(piece, board)){ gameOver(); return; }
    }
    function resetDropTimer(){
        clearInterval(dropInterval);
        dropInterval = setInterval(()=>move(0,1), 1000-(level-1)*50);
    }

    /* ---------- 7. Pomaci ---------- */
    function move(dx,dy){
        piece.x += dx; piece.y += dy;
        if(collide(piece, board)){
            piece.x -= dx; piece.y -= dy;
            if(dy){ place(); }
        }
        draw();
    }
    function rotate(){
        const rotated = piece.shape[0].map((_,i)=>piece.shape.map(row=>row[i]).reverse());
        const prev = piece.shape;
        piece.shape = rotated;
        if(collide(piece, board)) piece.shape = prev;
        else play('rotate');
        draw();
    }
    function drop(){
        while(!collide({...piece, y:piece.y+1}, board)) piece.y++;
        place();
    }

    /* ---------- 8. Kolizija & čišćenje ---------- */
    function collide(p, b){
        for(let y=0; y<p.shape.length; y++){
            for(let x=0; x<p.shape[y].length; x++){
                if(!p.shape[y][x]) continue;
                let nx = p.x + x, ny = p.y + y;
                if(nx<0 || nx>=COLS || ny>=ROWS || (ny>=0 && b[ny][nx])) return true;
            }
        }
        return false;
    }
    function place(){
        piece.shape.forEach((row,dy)=>{
            row.forEach((cell,dx)=>{
                if(cell && piece.y+dy>=0) board[piece.y+dy][piece.x+dx]=piece.color;
            });
        });
        play('drop');
        let cleared = 0;
        for(let y=ROWS-1; y>=0; y--){
            if(board[y].every(v=>v)){
                board.splice(y,1);
                board.unshift(Array(COLS).fill(0));
                cleared++;
                y++;
            }
        }
        if(cleared){
            lines += cleared;
            score += [0,100,300,500,800][cleared]*(level);
            level = Math.floor(lines/10)+1;
            play(cleared===4?'tetris':'clear');
            resetDropTimer();
        }
        newPiece();
        updateLabels();
    }

    /* ---------- 9. Crtanje ---------- */
    function draw(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        drawBoard();
        drawPiece(piece, ctx);
        drawGhost();
        nextCtx.clearRect(0,0,nextCv.width,nextCv.height);
        drawPiece({...next, x:0, y:0}, nextCtx, 20);
    }
    function drawBoard(){
        board.forEach((row,y)=>{
            row.forEach((cell,x)=>{
                if(cell) drawBlock(ctx, x, y, cell);
            });
        });
    }
    function drawPiece(p, c, size=BLOCK){
        p.shape.forEach((row,dy)=>{
            row.forEach((cell,dx)=>{
                if(cell) drawBlock(c, p.x+dx, p.y+dy, p.color, size);
            });
        });
    }
    function drawGhost(){
        const g = {...piece};
        while(!collide({...g, y:g.y+1}, board)) g.y++;
        ctx.globalAlpha = .4;
        drawPiece(g, ctx);
        ctx.globalAlpha = 1;
    }
    function drawBlock(c, x, y, color, size=BLOCK){
        c.fillStyle = color;
        c.fillRect(x*size, y*size, size, size);
        c.strokeStyle = '#000';
        c.strokeRect(x*size, y*size, size, size);
    }

    /* ---------- 10. UI helpers ---------- */
    function updateLabels(){
        scoreLbl.textContent = score;
        levelLbl.textContent = level;
        linesLbl.textContent = lines;
    }
    function loadBest(){
        bestLbl.textContent = localStorage.getItem('best') || 0;
    }
    function saveBest(){
        if(score > (Number(localStorage.getItem('best')) || 0)){
            localStorage.setItem('best', score);
            bestLbl.textContent = score;
        }
    }
    function gameOver(){
        clearInterval(dropInterval);
        play('gameover');
        saveBest();
        alert('Game Over!');
        show(screens.main);
    }
    function pause(on){
        paused = on;
        screens.pause.style.display = on ? 'flex' : 'none';
        if(on) clearInterval(dropInterval);
        else resetDropTimer();
    }
    function show(scr){
        Object.values(screens).forEach(s=>s.style.display='none');
        scr.style.display='flex';
    }

    /* ---------- 11. Tema i zvuk ---------- */
    const themes = {
        classic:{main:'#61dafb',bg:'#1a1a2e',board:'#000'},
        dark:{main:'#999',bg:'#0d0d0d',board:'#1c1c1c'},
        forest:{main:'#b4cf66',bg:'#0a1d0d',board:'#263a29'},
        modern:{main:'#bb86fc',bg:'#121212',board:'#1e1e1e'},
        lava:{main:'#ff4500',bg:'#220000',board:'#440000'}
    };
    function applyTheme(name){
        theme = name;
        localStorage.setItem('theme', name);
        const t = themes[name];
        document.documentElement.style.setProperty('--main-color', t.main);
        document.documentElement.style.setProperty('--bg-color', t.bg);
        document.documentElement.style.setProperty('--board-bg', t.board);
        themeSel.value = name;
    }
    function mute(on){
        muted = on;
        Object.values(audioCtx).forEach(a=>a.muted=on);
        soundBtn.textContent = on ? '🔇' : '🔊';
        localStorage.setItem('muted', on);
    }
    function play(snd){
        if(!muted && audioCtx[snd]) audioCtx[snd].play().catch(()=>{});
    }
})();
