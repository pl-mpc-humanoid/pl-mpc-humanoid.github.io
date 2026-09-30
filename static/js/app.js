/* PL-MPC research page. Native media and progressively enhanced static content. */
'use strict';

const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#nav-menu');
function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  menu.classList.remove('is-open');
}
menuToggle.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!expanded));
  menu.classList.toggle('is-open', !expanded);
});
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.classList.contains('is-open')) {
    closeMenu();
    menuToggle.focus();
  }
});

// Keep every panel in HTML for readers without JavaScript. Enhance to ARIA tabs.
const tabSelectors = new Map();
function wireTabs(tablist) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  function select(tab, focus = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(item.getAttribute('aria-controls'));
      panel.hidden = !selected;
      if (!selected) panel.querySelectorAll('video').forEach(video => video.pause());
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tabSelectors.set(tab.id, () => select(tab));
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      const destinations = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1
      };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      select(tabs[destinations[event.key]], true);
    });
  });
  select(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
}
document.querySelectorAll('[role="tablist"]').forEach(wireTabs);

// Make component links and direct URLs reveal the associated panel before scrolling.
function revealHash() {
  const aliases = { '#real-demos': '#robot', '#code': '#resources', '#matched': '#comparisons', '#details': '#resources', '#abstract': '#overview', '#problem': '#overview', '#method': '#overview', '#results': '#comparisons', '#scope': '#resources' };
  const hash = aliases[location.hash] || location.hash;
  const target = document.getElementById(hash.slice(1));
  if (!target) return;
  const panel = target.closest('[role="tabpanel"]');
  if (panel) tabSelectors.get(panel.getAttribute('aria-labelledby'))?.();
  const details = target.closest('details');
  if (details) details.open = true;
  if (panel || details || aliases[location.hash]) target.scrollIntoView();
}
document.querySelectorAll('[data-open-tab]').forEach(link => {
  link.addEventListener('click', () => tabSelectors.get(`${link.dataset.openTab}-tab`)?.());
});
window.addEventListener('hashchange', revealHash);
if (location.hash) revealHash();

// Chapters seek within the same native player, including before metadata loads.
const overviewVideo = document.querySelector('#overview-video');
const chapters = [...document.querySelectorAll('[data-seek]')];
let pendingSeek = null;
overviewVideo.addEventListener('loadedmetadata', () => {
  if (pendingSeek !== null) {
    overviewVideo.currentTime = pendingSeek;
    pendingSeek = null;
  }
});
chapters.forEach(button => {
  button.addEventListener('click', () => {
    const time = Number(button.dataset.seek);
    if (overviewVideo.readyState >= 1) overviewVideo.currentTime = time;
    else { pendingSeek = time; overviewVideo.load(); }
    overviewVideo.play().catch(() => { /* Native controls allow a retry. */ });
  });
});
overviewVideo.addEventListener('timeupdate', () => {
  chapters.forEach((button, index) => {
    const start = index === 0 ? 0 : Number(button.dataset.seek);
    const end = chapters[index + 1] ? Number(chapters[index + 1].dataset.seek) : Infinity;
    const active = overviewVideo.currentTime >= start && overviewVideo.currentTime < end;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
});

// User-initiated paired playback. Native video controls remain independently usable.
document.querySelectorAll('[data-pair]').forEach(pair => {
  const videos = [...pair.querySelectorAll('video')];
  const play = pair.querySelector('[data-play-pair]');
  const restart = pair.querySelector('[data-restart-pair]');
  function refresh() {
    const playing = videos.some(video => !video.paused && !video.ended);
    play.textContent = playing ? 'Pause both Ⅱ' : 'Play both ↗';
    play.setAttribute('aria-label', playing ? 'Pause both comparison videos' : 'Play both comparison videos');
  }
  function playBoth() {
    videos.forEach(video => video.play().catch(refresh));
  }
  videos.forEach(video => {
    ['play', 'pause', 'ended'].forEach(event => video.addEventListener(event, refresh));
  });
  play.addEventListener('click', () => {
    if (videos.some(video => !video.paused && !video.ended)) videos.forEach(video => video.pause());
    else playBoth();
  });
  restart.addEventListener('click', () => {
    videos.forEach(video => { video.currentTime = 0; });
    playBoth();
  });
});

// No autoplay or background media work. Pause players when they leave the viewport,
// a details panel closes, or the browser tab becomes hidden.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); });
  }, { threshold: 0 });
  document.querySelectorAll('video').forEach(video => observer.observe(video));
}
document.querySelectorAll('details').forEach(details => {
  details.addEventListener('toggle', () => {
    if (!details.open) details.querySelectorAll('video').forEach(video => video.pause());
  });
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());
});

document.documentElement.classList.add('enhanced');
