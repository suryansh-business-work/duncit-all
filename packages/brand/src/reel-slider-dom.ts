/**
 * Mounts the Reel Slider onto the shell ReelSlider.astro renders. See
 * reel-slider.ts for the rules it keeps; this file is only the DOM.
 */
import {
  fillCopy,
  reelPoster,
  slideOffset,
  VISIBLE_DISTANCE,
  wrapIndex,
  type ReelSliderCopy,
  type SiteReel,
} from './reel-slider';

interface Slide {
  card: HTMLElement;
  video: HTMLVideoElement;
  playButton: HTMLButtonElement;
  soundButton: HTMLButtonElement;
  progress: HTMLElement;
  dot: HTMLButtonElement;
}

const SWIPE_PX = 40;

/** How a card is drawn: the centre reel, a visible neighbour, or out of sight. */
const cardState = (distance: number): 'active' | 'side' | 'away' => {
  if (distance === 0) return 'active';
  return distance <= VISIBLE_DISTANCE ? 'side' : 'away';
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function iconButton(className: string): HTMLButtonElement {
  const button = el('button', `reel-icon-button ${className}`);
  button.type = 'button';
  button.append(el('i', 'fa-solid'));
  button.querySelector('i')?.setAttribute('aria-hidden', 'true');
  return button;
}

function setButton(button: HTMLButtonElement, icon: string, label: string) {
  const glyph = button.querySelector('i');
  if (glyph) glyph.className = `fa-solid ${icon}`;
  button.setAttribute('aria-label', label);
  button.title = label;
}

function buildSlide(reel: SiteReel): Omit<Slide, 'dot'> {
  const card = el('article', 'reel-card');
  card.setAttribute('aria-roledescription', 'slide');
  const frame = el('div', 'reel-frame');
  const video = el('video', 'reel-video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.dataset.src = reel.video_url;
  video.poster = reelPoster(reel.video_url);
  if (reel.title) video.setAttribute('aria-label', reel.title);
  const caption = el('div', 'reel-caption');
  if (reel.title) caption.append(el('h3', 'reel-title', reel.title));
  if (reel.description) caption.append(el('p', 'reel-description', reel.description));
  const controls = el('div', 'reel-controls');
  const playButton = iconButton('reel-play');
  const soundButton = iconButton('reel-sound');
  controls.append(playButton, soundButton);
  const track = el('div', 'reel-progress');
  const progress = el('span', 'reel-progress-bar');
  track.append(progress);
  frame.append(video, el('div', 'reel-shade'), caption, controls, track);
  card.append(frame);
  return { card, video, playButton, soundButton, progress };
}

/** Build the slides into `root` and run the slider. Returns a teardown. */
export function mountReelSlider(root: HTMLElement, reels: SiteReel[], copy: ReelSliderCopy): () => void {
  const stage = root.querySelector<HTMLElement>('[data-reel-stage]');
  const dots = root.querySelector<HTMLElement>('[data-reel-dots]');
  const live = root.querySelector<HTMLElement>('[data-reel-live]');
  const prev = root.querySelector<HTMLButtonElement>('[data-reel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-reel-next]');
  if (!stage || !dots || !prev || !next || reels.length === 0) return () => undefined;

  const total = reels.length;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { active: 0, sound: null as number | null, paused: still, inView: false };

  const slides: Slide[] = reels.map((reel, index) => {
    const parts = buildSlide(reel);
    const dot = el('button', 'reel-dot');
    dot.type = 'button';
    dot.setAttribute('aria-label', fillCopy(copy.goTo, { index: index + 1 }));
    dot.addEventListener('click', () => goTo(index));
    dots.append(dot);
    stage.append(parts.card);
    parts.card.addEventListener('click', () => {
      if (index !== state.active) goTo(index);
    });
    parts.playButton.addEventListener('click', () => togglePlay());
    parts.soundButton.addEventListener('click', () => toggleSound());
    parts.video.addEventListener('timeupdate', () => {
      const { currentTime, duration } = parts.video;
      if (duration) parts.progress.style.transform = `scaleX(${currentTime / duration})`;
    });
    return { ...parts, dot };
  });

  const play = (video: HTMLVideoElement) => {
    video.play().catch(() => {
      // A browser that refuses sound without a fresh gesture refuses the whole
      // play() — so fall back to muted rather than leaving a frozen frame.
      if (!video.muted) {
        state.sound = null;
        sync();
      }
    });
  };

  function syncVideo(slide: Slide, index: number, distance: number) {
    const { video } = slide;
    const near = distance <= VISIBLE_DISTANCE;
    if (near && !video.src && video.dataset.src) video.src = video.dataset.src;
    video.preload = near ? 'auto' : 'none';
    video.muted = state.sound !== index;
    const isActive = index === state.active;
    const wants = near && state.inView && !document.hidden && !(isActive && state.paused) && !(still && !isActive);
    if (wants && video.paused) play(video);
    if (!wants && !video.paused) video.pause();
  }

  function syncSlide(slide: Slide, index: number) {
    const offset = slideOffset(index, state.active, total);
    const distance = Math.abs(offset);
    const isActive = offset === 0;
    slide.card.style.setProperty('--offset', String(offset));
    slide.card.style.setProperty('--distance', String(distance));
    slide.card.dataset.state = cardState(distance);
    slide.card.setAttribute('aria-label', fillCopy(copy.slide, { current: index + 1, total }));
    slide.card.setAttribute('aria-hidden', String(!isActive));
    slide.card.toggleAttribute('inert', distance > VISIBLE_DISTANCE);
    for (const button of [slide.playButton, slide.soundButton]) button.tabIndex = isActive ? 0 : -1;
    const playing = isActive && !state.paused;
    setButton(slide.playButton, playing ? 'fa-pause' : 'fa-play', playing ? copy.pause : copy.play);
    const loud = state.sound === index;
    setButton(slide.soundButton, loud ? 'fa-volume-high' : 'fa-volume-xmark', loud ? copy.mute : copy.unmute);
    slide.soundButton.setAttribute('aria-pressed', String(loud));
    slide.dot.toggleAttribute('aria-current', isActive);
    syncVideo(slide, index, distance);
  }

  function sync() {
    slides.forEach(syncSlide);
  }

  function goTo(index: number) {
    if (index === state.active) return;
    // The sound follows the visitor to the reel they moved to; the old one mutes.
    if (state.sound !== null) state.sound = index;
    state.active = index;
    state.paused = still;
    sync();
    if (live) live.textContent = fillCopy(copy.slide, { current: index + 1, total });
  }

  const step = (delta: number) => goTo(wrapIndex(state.active, delta, total));

  function togglePlay() {
    state.paused = !state.paused;
    sync();
  }

  function toggleSound() {
    // One reel with sound at a time: turning this one on mutes every other.
    state.sound = state.sound === state.active ? null : state.active;
    if (state.sound !== null) state.paused = false;
    sync();
  }

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  setButton(prev, 'fa-chevron-left', copy.previous);
  setButton(next, 'fa-chevron-right', copy.next);
  if (total < 2) {
    prev.hidden = true;
    next.hidden = true;
    dots.hidden = true;
  }

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
  });

  let startX: number | null = null;
  stage.addEventListener('pointerdown', (event) => {
    startX = event.clientX;
  });
  stage.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    startX = null;
    if (Math.abs(dx) >= SWIPE_PX) step(dx < 0 ? 1 : -1);
  });

  const observer = new IntersectionObserver(
    ([entry]) => {
      state.inView = Boolean(entry?.isIntersecting);
      sync();
    },
    { threshold: 0.25 },
  );
  observer.observe(root);
  const onVisibility = () => sync();
  document.addEventListener('visibilitychange', onVisibility);

  sync();
  return () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    for (const { video } of slides) video.pause();
  };
}
