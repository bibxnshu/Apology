(() => {
  'use strict';

  // The song supplied for this page is bundled with the static assets.
  const SONG = { title: 'Lovesong \u2014 Adele', file: 'music.mp3' };
  const byId = (id) => document.getElementById(id);
  const readSession = (key) => {
    try { return sessionStorage.getItem(key); } catch { return null; }
  };
  const writeSession = (key, value) => {
    try { sessionStorage.setItem(key, value); } catch { /* Optional preferences only. */ }
  };

  const toast = byId('toast');
  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 4500);
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = byId('motion-toggle');
  let userPausedMotion = readSession('iqra-motion-paused') === 'yes';
  const motionPaused = () => userPausedMotion || reducedMotion.matches;
  function updateMotion() {
    const paused = motionPaused();
    document.documentElement.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.querySelector('span').textContent = reducedMotion.matches ? 'Motion reduced' : paused ? 'Resume motion' : 'Pause motion';
  }
  motionButton.addEventListener('click', () => {
    if (reducedMotion.matches) {
      showToast('Keeping the animations still, as your device prefers.');
      return;
    }
    userPausedMotion = !userPausedMotion;
    writeSession('iqra-motion-paused', userPausedMotion ? 'yes' : 'no');
    updateMotion();
  });
  reducedMotion.addEventListener?.('change', updateMotion);
  updateMotion();

  const floaties = byId('floaties');
  for (let index = 0; index < 4; index += 1) {
    const decoration = document.createElement('span');
    decoration.className = 'floaty';
    decoration.textContent = index % 2 ? '\u2727' : '\u2661';
    decoration.style.setProperty('--left', `${4 + index * 29}%`);
    decoration.style.setProperty('--size', `${13 + (index % 3) * 3}px`);
    decoration.style.setProperty('--duration', `${30 + (index % 4) * 4}s`);
    decoration.style.setProperty('--delay', `${index * -4.5}s`);
    floaties.append(decoration);
  }

  // ── Welcome Overlay ──
  const welcomeOverlay = byId('welcome-overlay');
  const welcomeStartBtn = byId('welcome-start');
  const welcomeSkipBtn = byId('welcome-skip');

  function dismissOverlay() {
    welcomeOverlay.classList.add('is-hidden');
    welcomeOverlay.addEventListener('transitionend', () => {
      welcomeOverlay.remove();
    }, { once: true });
  }

  // ── Audio Player ──
  const audio = byId('audio-player');
  const musicPlayer = document.querySelector('.music-player');
  const musicButton = byId('music-play');
  const musicStatus = byId('music-status');
  const musicIcon = musicButton.querySelector('use');
  byId('track-title').textContent = SONG.title;
  audio.setAttribute('src', SONG.file);
  audio.volume = 0.55;
  let wantsMusic = false;
  let playAttempt = 0;
  let audioUnavailable = false;

  function showMusicState(state, status) {
    const playing = state === 'playing';
    const loading = state === 'loading';
    musicPlayer.classList.toggle('is-playing', playing);
    musicPlayer.classList.toggle('is-loading', loading);
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.setAttribute('aria-busy', String(loading));
    musicButton.setAttribute('aria-label', playing ? 'Pause the song' : loading ? 'Cancel loading the song' : 'Play the song');
    musicIcon.setAttribute('href', playing || loading ? '#i-pause' : '#i-play');
    musicStatus.textContent = status;
  }

  function songUnavailable() {
    const shouldNotify = wantsMusic;
    wantsMusic = false;
    playAttempt += 1;
    audioUnavailable = true;
    audio.pause();
    showMusicState('paused', 'Couldn\u2019t load the song. Tap to retry.');
    if (shouldNotify) showToast('The song couldn\u2019t load. Tap play to try again.');
  }

  async function startMusic() {
    const currentAttempt = ++playAttempt;
    wantsMusic = true;
    audioUnavailable = false;
    showMusicState('loading', 'One little moment, love\u2026');
    try {
      await audio.play();
      if (currentAttempt !== playAttempt && !wantsMusic) audio.pause();
    } catch (error) {
      if (currentAttempt !== playAttempt || !wantsMusic) return;
      if (error.name === 'NotAllowedError') {
        wantsMusic = false;
        showMusicState('paused', 'Tap play when you\u2019re ready.');
        showToast('Tap the little play button to start your song.');
      } else if (error.name !== 'AbortError') {
        songUnavailable();
      } else {
        wantsMusic = false;
        showMusicState('paused', 'Whenever you\u2019re ready, love.');
      }
    }
  }

  // Welcome overlay: "Start the music" button
  welcomeStartBtn.addEventListener('click', () => {
    dismissOverlay();
    void startMusic();
  });

  // Welcome overlay: "Continue without music" button
  welcomeSkipBtn.addEventListener('click', () => {
    dismissOverlay();
    showMusicState('paused', 'Tap play when you\u2019re ready.');
  });

  // Music player toggle button
  musicButton.addEventListener('click', () => {
    if (wantsMusic) {
      wantsMusic = false;
      playAttempt += 1;
      audio.pause();
      showMusicState('paused', 'Keeping it quiet for a moment.');
    } else {
      if (audioUnavailable) audio.load();
      void startMusic();
    }
  });

  audio.addEventListener('playing', () => {
    if (!wantsMusic) { audio.pause(); return; }
    showMusicState('playing', 'A little music while you read.');
  });
  audio.addEventListener('waiting', () => {
    if (wantsMusic) showMusicState('loading', 'One little moment, love\u2026');
  });
  audio.addEventListener('pause', () => {
    if (!wantsMusic) return;
    wantsMusic = false;
    playAttempt += 1;
    showMusicState('paused', 'Whenever you\u2019re ready, love.');
  });
  audio.addEventListener('error', songUnavailable);
  audio.addEventListener('ended', () => {
    wantsMusic = false;
    showMusicState('paused', 'Shall we hear it again?');
  });

  // All reading content remains visible without observers or animations.
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
  }
  let progressQueued = false;
  function updateProgress() {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0;
    byId('reading-progress').style.transform = `scaleX(${fraction})`;
    progressQueued = false;
  }
  function queueProgress() {
    if (progressQueued) return;
    progressQueued = true;
    requestAnimationFrame(updateProgress);
  }
  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', queueProgress, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(queueProgress).observe(document.body);
  updateProgress();
})();
