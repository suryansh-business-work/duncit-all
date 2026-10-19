/**
 * Applies a site's Earn settings (earn-section.ts) to the EarnShowcase markup
 * the build already rendered, and drives the floating Earn pill.
 *
 * The build renders the localized defaults, so a page with JavaScript off, or
 * an API that does not answer, still shows a complete section.
 */
import { pick, safeHttpsUrl, tilePhotos, type EarnSection } from './earn-section';

const DISMISS_KEY = 'duncit-earn-pill-dismissed';

const setText = (root: HTMLElement, selector: string, override: string): void => {
  const el = root.querySelector<HTMLElement>(selector);
  if (el) el.textContent = pick(override, el.textContent);
};

function applyPhotos(section: HTMLElement, images: string[]): void {
  const imgs = [...section.querySelectorAll<HTMLImageElement>('[data-earn-tile] img')];
  const photos = tilePhotos(images, imgs.length);
  photos.forEach((src, i) => {
    imgs[i].removeAttribute('srcset');
    imgs[i].src = src;
  });
}

/** Moves the section into the home page's anchor for the chosen position, when the page has one. */
function applyPosition(section: HTMLElement, position: string): void {
  const slot = document.querySelector<HTMLElement>(`[data-earn-slot="${position}"]`);
  if (slot && !slot.contains(section)) slot.appendChild(section);
}

export function applyEarnSection(section: HTMLElement, config: EarnSection): void {
  if (!config.enabled) {
    section.hidden = true;
    return;
  }
  section.dataset.accent = config.accent.toLowerCase();
  section.dataset.variant = config.variant.toLowerCase();
  setText(section, '[data-earn-eyebrow]', config.eyebrow);
  setText(section, '[data-earn-heading-main]', config.heading);
  setText(section, '[data-earn-heading-muted]', config.heading_muted);
  setText(section, '[data-earn-text]', config.text);
  setText(section, '[data-earn-cta-label]', config.cta_label);
  const cta = section.querySelector<HTMLAnchorElement>('[data-earn-cta]');
  const href = safeHttpsUrl(config.cta_url);
  if (cta && href) cta.href = href;
  applyPhotos(section, config.images);
  applyPosition(section, config.position);
}

const readDismissed = (): boolean => {
  try {
    return globalThis.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

const saveDismissed = (): void => {
  try {
    globalThis.sessionStorage.setItem(DISMISS_KEY, '1');
  } catch (error) {
    // Storage blocked (private mode): the pill still closes for this page view.
    console.warn('[earn-pill] dismissal not remembered', error);
  }
};

/**
 * The floating "Earn with Duncit" pill: slides in once the visitor is past the
 * hero, steps aside while the section itself is on screen, and stays closed for
 * the rest of the visit once dismissed.
 */
export function mountEarnPill(pill: HTMLElement, section: HTMLElement, config: EarnSection): void {
  if (!config.enabled || !config.floating_enabled || readDismissed()) return;
  setText(pill, '[data-earn-pill-label]', config.floating_label);
  pill.hidden = false;

  let sectionOnScreen = false;
  const update = () => pill.classList.toggle('is-visible', globalThis.scrollY > 480 && !sectionOnScreen);
  new IntersectionObserver(([entry]) => {
    sectionOnScreen = entry.isIntersecting;
    update();
  }).observe(section);
  globalThis.addEventListener('scroll', update, { passive: true });
  update();

  pill.querySelector('[data-earn-pill-close]')?.addEventListener('click', () => {
    saveDismissed();
    pill.classList.remove('is-visible');
    pill.hidden = true;
  });
}
