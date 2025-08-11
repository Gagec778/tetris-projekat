'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // === Globalne promenljive ===
    const UI = {};
    let allAudioElements = [];
    let isMuted = false;
    let currentTheme = 'classic';
    let BLOCK_SIZE_TETRIS;
    
    const THEMES = {
        'classic': { 'main-color': '#61dafb', 'background-color': '#1a1a2e', 'board-bg-color': '#000', 'border-color': '#61dafb', 'grid-color': '#333' },
        'dark': { 'main-color': '#999999', 'background-color': '#0d0d0d', 'board-bg-color': '#1c1c1c', 'border-color': '#999999', 'grid-color': '#444' },
        'forest': { 'main-color': '#b4cf66', 'background-color': '#0a1d0d', 'board-bg-color': '#263a29', 'border-color': '#b4cf66', 'grid-color': '#4a594d' },
        'modern': { 'main-color': '#bb86fc', 'background-color': '#121212', 'board-bg-color': '#1e1e1e', 'border-color': '#bb86fc', 'grid-color': '#4d4d4d' },
        'lava': { 'main-color': '#FF4500', 'background-color': '#220000', 'board-bg-color': '#440000', 'border-color': '#FF4500', 'grid-color': '#662222' }
    };

    // === Funkcije za UI ===
    function showScreen(screenId) {
        ['mainMenu', 'tetrisMenu', 'settingsModal', 'tetrisWrapper', 'blockPuzzleWrapper', 'pauseScreen'].forEach(id => {
            if (UI[id]) UI[id].style.display = 'none';
        });
        if (UI[screenId]) {
            UI[screenId].style.display = 'flex';
            UI[screenId].classList.add('visible');
        }
    }

    function applyTheme(themeName) {
        currentTheme = themeName;
        const theme = THEMES[themeName];
        if (!theme) return;
        const root = document.documentElement;
        for (const [key, value] of Object.entries(theme)) {
            root.style.setProperty(`--${key}`, value);
        }
        localStorage.setItem('theme', themeName);
    }

    function toggleSound() {
        isMuted = !isMuted;
        allAudioElements.forEach(audio => audio.muted = isMuted);
        if (UI.soundToggleButton) UI.soundToggleButton.textContent = isMuted ? '🔇' : '🔊';
        localStorage.setItem('isMuted', JSON.stringify(isMuted));
    }
    
    function drawEmptyTetrisBoard() {
        const canvas = UI.gameCanvas;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const container = UI.canvasContainer;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        BLOCK_SIZE_TETRIS = Math.floor(Math.min(containerWidth / 10, containerHeight / 20));
        canvas.width = 10 * BLOCK_SIZE_TETRIS;
        canvas.height = 20 * BLOCK_SIZE_TETRIS;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = THEMES[currentTheme]['grid-color'];
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 10; i++) {
            ctx.moveTo(i * BLOCK_SIZE_TETRIS + 0.5, 0);
            ctx.lineTo(i * BLOCK_SIZE_TETRIS + 0.5, canvas.height);
        }
        for (let i = 1; i < 20; i++) {
            ctx.moveTo(0, i * BLOCK_SIZE_TETRIS + 0.5);
            ctx.lineTo(canvas.width, i * BLOCK_SIZE_TETRIS + 0.5);
        }
        ctx.stroke();
    }

    function drawEmptyPuzzleBoard() {
        const canvas = UI.blockPuzzleCanvas;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const container = UI.puzzleCanvasContainer;
        
        const size = Math.min(container.clientWidth, container.clientHeight) * 0.95;
        canvas.width = size;
        canvas.height = size;
        const puzzleBlockSize = size / 10;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = THEMES[currentTheme]['grid-color'];
        ctx.lineWidth = 1;
        for (let i = 1; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(i * puzzleBlockSize, 0);
            ctx.lineTo(i * puzzleBlockSize, canvas.height);
            ctx.stroke();
        }
        for (let i = 1; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * puzzleBlockSize);
            ctx.lineTo(canvas.width, i * puzzleBlockSize);
            ctx.stroke();
        }
    }
    
    // === Inicijalizacija ===
    function grabDOMElements() {
        const ids = [
            'mainMenu', 'tetrisMenu', 'settingsModal', 'tetrisWrapper', 'blockPuzzleWrapper', 'pauseScreen',
            'gameCanvas', 'canvasContainer', 'blockPuzzleCanvas', 'puzzleCanvasContainer',
            'soundToggleButton', 'themeSwitcher'
        ];
        ids.forEach(id => {
            const snakeCaseId = id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            UI[id] = document.getElementById(snakeCaseId);
        });
        allAudioElements = document.querySelectorAll('audio');
    }

    function attachEventListeners() {
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;

            switch(action) {
                case 'select-tetris': showScreen('tetrisMenu'); break;
                case 'select-blockpuzzle':
                    showScreen('blockPuzzleWrapper');
                    drawEmptyPuzzleBoard();
                    break;
                case 'open-settings': showScreen('settingsModal'); break;
                case 'back-to-main':
                case 'return-to-menu': showScreen('mainMenu'); break;
                case 'close-settings': showScreen('mainMenu'); break;
                case 'toggle-sound': toggleSound(); break;
                case 'start-tetris':
                    showScreen('tetrisWrapper');
                    // Sada se ispravno poziva resize
                    drawEmptyTetrisBoard(); 
                    break;
                case 'pause-tetris': UI.pauseScreen.classList.add('visible'); break;
                case 'resume-tetris': UI.pauseScreen.classList.remove('visible'); break;
            }
        });

        if (UI.themeSwitcher) {
            UI.themeSwitcher.addEventListener('change', (e) => applyTheme(e.target.value));
        }

        // Event listener za promenu veličine prozora
        window.addEventListener('resize', () => {
            if (UI.tetrisWrapper.style.display === 'flex') {
                drawEmptyTetrisBoard();
            }
            if (UI.blockPuzzleWrapper.style.display === 'flex') {
                drawEmptyPuzzleBoard();
            }
        });
    }
    
    function loadSettings() {
        const savedTheme = localStorage.getItem('theme') || 'classic';
        const savedMute = JSON.parse(localStorage.getItem('isMuted') || 'false');

        if(UI.themeSwitcher) UI.themeSwitcher.value = savedTheme;
        applyTheme(savedTheme);

        if (savedMute) {
            toggleSound(); // Pozivamo toggle da bi se sve sinhronizovalo
        }
    }

    grabDOMElements();
    loadSettings();
    attachEventListeners();
    UI.mainMenu.classList.add('visible'); // Početni ekran
});
