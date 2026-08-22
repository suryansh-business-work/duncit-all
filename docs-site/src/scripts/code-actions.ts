/**
 * Binds the toolbar that `components/CodeCard.astro` renders above every block
 * of code on the site.
 *
 * One delegated listener for the whole page rather than a listener per card: a
 * package page can carry sixty fenced blocks, and the toolbar has to work on
 * markup that came from MDX this script never sees.
 *
 * Wrap, Lines and Copy are handled right here — they are DOM-only and must stay
 * instant. Tidy, Format and Edit hand off to `playground.ts`, which is imported
 * dynamically so Monaco is downloaded the first time somebody actually asks for
 * an editor and never before.
 */
import type { PlaygroundAction } from './playground';

type PlaygroundModule = typeof import('./playground');

let playground: Promise<PlaygroundModule> | null = null;

function editorModule(): Promise<PlaygroundModule> {
  playground ??= import('./playground').then((module) => {
    module.bindPlayground();
    return module;
  });
  return playground;
}

/** The snippet as text. `textContent` skips the ::before line numbers, so a
 * copy made with Lines on is still paste-able code. */
function snippet(card: HTMLElement): string {
  return card.querySelector('code')?.textContent ?? '';
}

function cardTitle(card: HTMLElement): string {
  const named = card.querySelector('.code-card__title')?.textContent;
  return named ?? `${card.dataset.lang ?? 'text'} snippet`;
}

function toggle(card: HTMLElement, button: HTMLButtonElement, key: 'wrap' | 'numbers'): void {
  const on = card.dataset[key] !== 'on';
  card.dataset[key] = on ? 'on' : 'off';
  button.setAttribute('aria-pressed', String(on));
}

function copy(card: HTMLElement, button: HTMLButtonElement): void {
  const label = button.textContent ?? 'Copy';
  navigator.clipboard
    .writeText(snippet(card))
    .then(() => {
      button.textContent = 'Copied';
      globalThis.setTimeout(() => {
        button.textContent = label;
      }, 1400);
    })
    .catch(() => {
      button.textContent = 'Press Ctrl+C';
      globalThis.setTimeout(() => {
        button.textContent = label;
      }, 2200);
    });
}

function openInEditor(card: HTMLElement, action: PlaygroundAction): void {
  editorModule()
    .then((module) =>
      module.openPlayground({
        code: snippet(card),
        fence: card.dataset.lang ?? 'text',
        action,
        title: cardTitle(card),
      }),
    )
    .catch((error: unknown) => {
      console.error('docs: the code editor failed to open', error);
    });
}

/** The "MDX source" button in a package header: fetches the raw `docs/index.mdx`
 * this page was built from and drops it into the same editor. */
function openSource(button: HTMLButtonElement): void {
  const url = button.dataset.openSource;
  if (!url) return;

  const title = button.dataset.openSourceTitle ?? 'index.mdx';
  fetch(url)
    .then((response) => response.text())
    .then((text) => editorModule().then((module) => module.openPlayground({ code: text, fence: 'mdx', action: 'edit', title })))
    .catch((error: unknown) => {
      console.error('docs: could not load the MDX source', error);
    });
}

function onClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;

  const source = target?.closest<HTMLButtonElement>('[data-open-source]');
  if (source) {
    openSource(source);
    return;
  }

  const button = target?.closest<HTMLButtonElement>('[data-code-action]');
  const card = button?.closest<HTMLElement>('.code-card');
  if (!button || !card) return;

  const action = button.dataset.codeAction ?? '';
  if (action === 'wrap' || action === 'numbers') {
    toggle(card, button, action);
    return;
  }
  if (action === 'copy') {
    copy(card, button);
    return;
  }
  openInEditor(card, action as PlaygroundAction);
}

document.addEventListener('click', onClick);
