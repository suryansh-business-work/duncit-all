import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * GrapesJS draws into an iframe and measures it; jsdom does neither. The
 * library is faked at its module boundary so what gets tested is the contract
 * this console depends on — when the canvas reports an edit, when it must NOT,
 * and that it is torn down — rather than whether a canvas paints.
 */
interface FakeEditor {
  on: (event: string, handler: () => void) => void;
  getHtml: () => string;
  destroy: () => void;
}

const state: {
  init: ReturnType<typeof vi.fn>;
  handlers: Record<string, () => void>;
  html: string;
  destroyed: number;
  fail: string | null;
  failRaw: string | null;
} = { init: vi.fn(), handlers: {}, html: '', destroyed: 0, fail: null, failRaw: null };

vi.mock('grapesjs', () => ({
  default: {
    init: (opts: Record<string, unknown>): FakeEditor => {
      state.init(opts);
      if (state.fail) throw new Error(state.fail);
      // A library is free to throw something that is not an Error.
      if (state.failRaw) throw state.failRaw;
      return {
        on: (event, handler) => {
          state.handlers[event] = handler;
        },
        getHtml: () => state.html,
        destroy: () => {
          state.destroyed += 1;
        },
      };
    },
  },
}));
vi.mock('grapesjs-mjml', () => ({ default: () => undefined }));
vi.mock('grapesjs/dist/css/grapes.min.css', () => ({}));

const MjmlDesignPane = (await import('../../src/pages/email-templates-page/MjmlDesignPane'))
  .default;

const MJML = '<mjml><mj-body><mj-text>Court 2</mj-text></mj-body></mjml>';

beforeEach(() => {
  state.init = vi.fn();
  state.handlers = {};
  state.html = '';
  state.destroyed = 0;
  state.fail = null;
  state.failRaw = null;
});

const mount = (value = MJML) => {
  const onChange = vi.fn();
  const view = render(<MjmlDesignPane value={value} onChange={onChange} />);
  return { onChange, view };
};

describe('MjmlDesignPane', () => {
  it('says it is loading until the canvas is up', async () => {
    mount();
    expect(screen.getByText('Loading the designer…')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('Loading the designer…')).not.toBeInTheDocument(),
    );
  });

  it('opens the canvas on the template MJML, with storage off', async () => {
    mount();
    await waitFor(() => expect(state.init).toHaveBeenCalled());
    expect(state.init.mock.calls[0][0]).toMatchObject({
      components: MJML,
      // Nothing about a template lives in the browser: the draft is the page's,
      // and saving is the editor panel's job.
      storageManager: false,
    });
  });

  // GrapesJS normalises whatever it parses, so a load that emitted would
  // rewrite a template merely because somebody opened the designer.
  it('reports nothing from the load that built the canvas', async () => {
    const { onChange } = mount();
    await waitFor(() => expect(state.init).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports the canvas MJML once a person changes something', async () => {
    const { onChange } = mount();
    await waitFor(() => expect(state.handlers.update).toBeTypeOf('function'));

    state.html = '<mjml>edited</mjml>';
    state.handlers.update();
    expect(onChange).toHaveBeenCalledWith('<mjml>edited</mjml>');
  });

  it('tears the canvas down when the pane goes away', async () => {
    const { view } = mount();
    await waitFor(() => expect(state.init).toHaveBeenCalled());
    view.unmount();
    expect(state.destroyed).toBe(1);
  });

  // The code view is always there, so a designer that cannot start is a
  // degraded pane rather than a lost template — and it says which.
  it('names the reason it could not start, and points at the code view', async () => {
    state.fail = 'canvas unavailable';
    mount();
    await waitFor(() =>
      expect(screen.getByText(/The designer could not start: canvas unavailable/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/The Code view still works/)).toBeInTheDocument();
    expect(screen.queryByText('Loading the designer…')).not.toBeInTheDocument();
  });
});

describe('MjmlDesignPane teardown race', () => {
  // The library arrives over a dynamic import, so the pane can be closed while
  // that is still in flight — and then no canvas may be built at all, into a
  // node nobody is looking at.
  it('reports a library that threw something other than an Error', async () => {
    state.failRaw = 'canvas exploded';
    render(<MjmlDesignPane value={MJML} onChange={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/could not start: canvas exploded/)).toBeInTheDocument(),
    );
  });

  it('never builds a canvas for a pane that closed while the library loaded', async () => {
    const onChange = vi.fn();
    const view = render(<MjmlDesignPane value={MJML} onChange={onChange} />);
    view.unmount();

    await Promise.resolve();
    await Promise.resolve();
    expect(state.init).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
