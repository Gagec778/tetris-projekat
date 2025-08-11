import { TetrisGame } from './tetris.js';
import { BlockPuzzleGame } from './blockPuzzle.js';
import { THEMES } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
    // === Globalne UI Promenljive ===
    let UIElements = {};
    let allAudioElements = {};
    let isMuted = false;
    let currentTheme = 'classic';
    let activeGame = null;

    // === Inicijalizacija ===
    grabDOMElements();
    loadSettings();
    attachEventListeners();

    // === Funkcije za Upravljanje UI-jem ===
    function showScreen(screenName) {
        ['mainMenu', 'tetrisMenu', 'settingsModal', 'tetrisWrapper', 'blockPuzzleWrapper', 'gameOverScreen'].forEach(id => {
            if (UIElements[id]) UIElements[id].style.display = 'none';
        });
        if (UIElements[screenName]) {
            UIElements[screenName].style.display = 'flex';
        }
    }

    function applyTheme(themeName) {
        currentTheme = themeName;
        const theme = THEMES[themeName];
        const root = document.documentElement;
        Object.keys(theme).forEach(key => {
            root.style.setProperty(`--${key}`, theme[key]);
        });
        localStorage.setItem('theme', themeName);
    }

    function toggleSound() {
        isMuted = !isMuted;
        Object.values(allAudioElements).forEach(audio => {
            if(audio) audio.muted = isMuted;
        });
        if (UIElements.soundToggleButton) {
            UIElements.soundToggleButton.textContent = isMuted ? '🔇' : '🔊';
        }
        localStorage.setItem('isMuted', JSON.stringify(isMuted));
    }
    
    function playSound(soundElement) {
        if (soundElement && !isMuted) {
            soundElement.currentTime = 0;
            soundElement.play().catch(e => {});
        }
    }
    
    // === Učitavanje i Događaji ===
    function loadSettings() {
        const savedTheme = localStorage.getItem('theme') || 'classic';
        const savedMute = JSON.parse(localStorage.getItem('isMuted') || 'false');

        if(UIElements.themeSwitcher) UIElements.themeSwitcher.value = savedTheme;
        applyTheme(savedTheme);

        isMuted = savedMute;
        if (isMuted) {
             Object.values(allAudioElements).forEach(audio => { if(audio) audio.muted = true; });
             if(UIElements.soundToggleButton) UIElements.soundToggleButton.textContent = '🔇';
        }
    }

    function grabDOMElements() {
        const ids = [
            'mainMenu', 'tetrisMenu', 'settingsModal', 'tetrisWrapper', 'blockPuzzleWrapper', 'gameOverScreen',
            'selectTetrisButton', 'selectBlockpuzzleButton', 'settingsButton', 'backToMainMenuButton', 
            'puzzleBackButton', 'closeSettingsModalButton', 'soundToggleButton', 'startButton',
            'themeSwitcher', 'modeSelector', 'gameCanvas', 'nextBlockCanvas', 'scoreDisplay', 'levelDisplay',
            'bestScoreDisplay', 'pauseButton', 'homeButton', 'resumeButton', 'restartButton',
            'gameOverTitle', 'finalScore'
        ];
        ids.forEach(id => {
            const snakeCaseId = id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            UIElements[id] = document.getElementById(snakeCaseId);
        });
        
        const audioIds = ['dropSound', 'clearSound', 'rotateSound', 'gameOverSound', 'tSpinSound', 'tetrisSound', 'backgroundMusic', 'bombSound', 'placeSound'];
        audioIds.forEach(id => {
            allAudioElements[id] = document.getElementById(id);
        });
    }

    function attachEventListeners() {
        document.body.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            switch(action) {
                case 'select-tetris':
                    showScreen('tetrisMenu');
                    break;
                case 'select-blockpuzzle':
                    showScreen('blockPuzzleWrapper');
                    activeGame = new BlockPuzzleGame({ UIElements, playSound, applyTheme, currentTheme });
                    activeGame.start();
                    break;
                case 'open-settings':
                    showScreen('settingsModal');
                    break;
                case 'back-to-main':
                    if (activeGame) {
                        activeGame.end(true);
                        activeGame = null;
                    }
                    showScreen('mainMenu');
                    break;
                case 'close-settings':
                    showScreen('mainMenu');
                    break;
                case 'toggle-sound':
                    toggleSound();
                    break;
                case 'start-tetris':
                    showScreen('tetrisWrapper');
                    activeGame = new TetrisGame({ UIElements, playSound, applyTheme, currentTheme });
                    const selectedMode = UIElements.modeSelector.value;
                    activeGame.start(selectedMode);
                    break;
                case 'resume-game':
                    if(activeGame && activeGame.togglePause) activeGame.togglePause();
                    break;
                case 'restart-game':
                     if (activeGame && activeGame.gameType === 'tetris') {
                        showScreen('tetrisMenu');
                    } else {
                        showScreen('mainMenu');
                    }
                    activeGame = null;
                    break;
            }
        });

        if(UIElements.themeSwitcher) {
            UIElements.themeSwitcher.addEventListener('change', (e) => applyTheme(e.target.value));
        }
    }
    
    // Inicijalni prikaz
    showScreen('mainMenu');
});
