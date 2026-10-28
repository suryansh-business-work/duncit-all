import { afterEach, describe, expect, it, vi } from 'vitest';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { META_END, META_START } from '../../html/meta';
import { headFor } from '../../html/pages';
import { injectApp, readCookie, renderWebPage } from '../../html/render';
import { SSR_END, SSR_START, type LiteSsrOutput } from '../../../shared/ssr-contract';
import { log } from '../../utils/log';

const shell = vi.hoisted(
  () =>
    '<!doctype html><html><head>\n    <!-- meta:start -->\n    <title>Duncit Lite</title>\n    <!-- meta:end -->\n  </head><body><div id="root"><!--ssr:start--><div class="boot-loader"></div><!--ssr:end--></div>\n  </body></html>',
);

vi.mock('../../html/files', () => ({ shellHtml: vi.fn(() => shell) }));
vi.mock('../../html/pages', () => ({ headFor: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

const output = (overrides: Partial<LiteSsrOutput> = {}): LiteSsrOutput => ({
  html: '<main>Sunday Jazz</main>',
  head: '<script>document.documentElement.dataset.scheme="dark"</script>',
  state: { apollo: { 'LiteEvent:1': { title: 'Sunday Jazz' } }, signedIn: true },
  status: 200,
  ...overrides,
});

describe('readCookie', () => {
  it('reads one decoded cookie value out of the header', () => {
    expect(readCookie('theme=dark; lite_session=abc%20def; other=1', 'lite_session')).toBe('abc def');
    expect(readCookie('lite_session=tok', 'lite_session')).toBe('tok');
  });

  it('answers null when the cookie is missing, empty or malformed', () => {
    expect(readCookie(undefined, 'lite_session')).toBeNull();
    expect(readCookie('', 'lite_session')).toBeNull();
    expect(readCookie('xlite_session=tok; lite_session_old=tok', 'lite_session')).toBeNull();
    expect(readCookie('lite_session=', 'lite_session')).toBeNull();
    expect(readCookie('lite_session=%E0%A4%A', 'lite_session')).toBeNull();
    expect(readCookie('=orphan; lite_session', 'lite_session')).toBeNull();
  });
});

describe('injectApp', () => {
  it('swaps the boot loader for the rendered app, adds the head tags and the hydration state', () => {
    const html = injectApp(shell, output());

    expect(html).toContain('<div id="root"><main>Sunday Jazz</main></div>');
    expect(html).not.toContain('boot-loader');
    expect(html).not.toContain(SSR_START);
    expect(html).not.toContain(SSR_END);
    expect(html.indexOf('dataset.scheme')).toBeLessThan(html.indexOf('</head>'));
    const state = /<script>window\.__LITE_SSR__=(.*)<\/script>\n {2}<\/body>/.exec(html);
    expect(state).not.toBeNull();
    expect(JSON.parse(state?.[1] ?? 'null')).toEqual({ apollo: { 'LiteEvent:1': { title: 'Sunday Jazz' } }, signedIn: true });
  });

  it('leaves a shell without the markers, or with them reversed, untouched', () => {
    const plain = '<html><head></head><body><div id="root"></div></body></html>';
    expect(injectApp(plain, output())).toBe(plain);
    const reversed = `<html><head></head><body>${SSR_END}${SSR_START}</body></html>`;
    expect(injectApp(reversed, output())).toBe(reversed);
  });
});

describe('renderWebPage', () => {
  const req = new IncomingMessage(new Socket());
  req.headers = { cookie: 'lite_session=tok' };

  it("writes the page's own head into the shell and serves the client-rendered app when no SSR bundle is built", async () => {
    vi.mocked(headFor).mockResolvedValue({
      meta: { title: 'Sunday Jazz', description: 'Live jazz', url: 'https://lite.duncit.com/e/jazz', siteName: 'Duncit Lite' },
      structured: [{ '@type': 'Event', name: 'Sunday Jazz' }],
    });

    const page = await renderWebPage(req, '/e/jazz', '/e/jazz?ref=x');

    expect(page.status).toBe(200);
    expect(headFor).toHaveBeenCalledWith('/e/jazz');
    expect(page.html).toContain('<title>Sunday Jazz | Duncit Lite</title>');
    expect(page.html).toContain('<script type="application/ld+json">{"@type":"Event","name":"Sunday Jazz"}</script>');
    expect(page.html).not.toContain('<title>Duncit Lite</title>');
    expect(page.html).toContain('boot-loader');
    expect(page.html.indexOf(META_START)).toBeLessThan(page.html.indexOf(META_END));
  });

  it('serves the shell unchanged for a route with no head of its own', async () => {
    vi.mocked(headFor).mockResolvedValue(null);
    await expect(renderWebPage(req, '/tickets/1', '/tickets/1')).resolves.toEqual({ html: shell, status: 200 });
  });

  it('falls back to the plain shell, logging a warning, when the head lookup fails', async () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => undefined);
    vi.mocked(headFor).mockRejectedValue(new Error('db down'));
    await expect(renderWebPage(req, '/e/jazz', '/e/jazz')).resolves.toEqual({ html: shell, status: 200 });
    expect(warn).toHaveBeenCalledWith('html', 'headFor', { error: expect.any(Error), path: '/e/jazz' });
  });
});
