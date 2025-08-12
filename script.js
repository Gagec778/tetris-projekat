document.addEventListener('DOMContentLoaded', () => {
  const screens = {
    main:    document.getElementById('main-menu'),
    tetris:  document.getElementById('tetris-wrapper'),
    puzzle:  document.getElementById('block-puzzle-wrapper'),
    settings:document.getElementById('settings-modal'),
    pause:   document.getElementById('pause-overlay')
  };

  function show(id){
    Object.values(screens).forEach(s => s.style.display = 'none');
    screens[id].style.display = 'flex';
  }

  document.body.addEventListener('click', e => {
    const action = e.target.dataset.action;
    switch(action){
      case 'select-tetris':      show('tetris');  break;
      case 'select-blockpuzzle': show('puzzle');  break;
      case 'open-settings':      show('settings');break;
      case 'return-to-menu':
      case 'back-to-main':
      case 'close-settings':     show('main');    break;
      case 'pause-tetris':       screens.pause.style.display='flex'; break;
      case 'resume-tetris':      screens.pause.style.display='none'; break;
    }
  });

  /* Inicijalno */
  show('main');
});
