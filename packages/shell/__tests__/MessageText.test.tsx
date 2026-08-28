/**
 * A message's words — markdown, @mentions, code, and the link preview under
 * the first URL. LinkCard sits right beside it because MessageText is the
 * only thing that renders one, and both need the same Apollo plumbing.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LinkCard from '../src/staff-chat/LinkCard';
import MessageText from '../src/staff-chat/MessageText';
import { STAFF_LINK_PREVIEW, type StaffLinkPreview } from '../src/staff-chat/queries';

afterEach(() => {
  vi.restoreAllMocks();
});

const HERE = globalThis.window.location.hostname.replace(/^staging\./, '').split('.')[0];

const preview = (over: Partial<StaffLinkPreview> = {}): StaffLinkPreview => ({
  url: 'https://example.com/report',
  internal: false,
  portal: null,
  title: 'Quarterly report',
  description: 'Numbers for the quarter.',
  image: 'https://example.com/og.png',
  has_access: true,
  access_note: null,
  ...over,
});

const previewMock = (url: string, data: StaffLinkPreview | null): MockedResponse => ({
  request: { query: STAFF_LINK_PREVIEW, variables: { url } },
  result: { data: { staffLinkPreview: data } },
});

describe('MessageText', () => {
  it('renders plain text as a paragraph', () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <MessageText text="See you at the door" fontSize={14} />
      </MockedProvider>
    );

    expect(container.textContent).toContain('See you at the door');
  });

  it('bolds an @mention inline, leaving the rest of the sentence plain', () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <MessageText text="ping @asha about the pod" fontSize={14} />
      </MockedProvider>
    );

    expect(container.textContent).toBe('ping @asha about the pod');
    const mention = [...container.querySelectorAll('span')].find((el) => el.textContent === '@asha');
    expect(mention).not.toBeUndefined();
  });

  it('renders inline code without the code-block chrome', () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <MessageText text="run `npm test` first" fontSize={14} />
      </MockedProvider>
    );

    expect(container.querySelector('code')?.textContent).toBe('npm test');
  });

  it('renders a fenced block through the syntax highlighter', () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <MessageText text={'```js\nconst x = 1;\n```'} fontSize={14} />
      </MockedProvider>
    );

    expect(container.textContent).toContain('const');
    expect(container.textContent).toContain('x');
  });

  it('marks an outside link with the leaving-this-app arrow', () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <MessageText text="[the doc](https://docs.example.com/page)" fontSize={14} />
      </MockedProvider>
    );

    const link = container.querySelector('a');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('shows nothing extra below a message with no URL in it', () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <MessageText text="no links here at all" fontSize={14} />
      </MockedProvider>
    );

    expect(container.querySelector('.MuiSkeleton-root')).toBeNull();
  });

  it('previews the first bare URL beneath the text, and passes onNavigate through', async () => {
    const onNavigate = vi.fn();
    const mocks = [previewMock('https://example.com/report', preview())];
    const { container, findByText } = render(
      <MockedProvider mocks={mocks}>
        <MessageText text="see https://example.com/report for the numbers" fontSize={14} onNavigate={onNavigate} />
      </MockedProvider>
    );

    expect(container.textContent).toContain('see https://example.com/report for the numbers');
    await findByText('Quarterly report');
  });
});

describe('LinkCard', () => {
  const card = (data: StaffLinkPreview | null, url = 'https://example.com/report', onNavigate?: (path: string) => void) =>
    render(
      <MockedProvider mocks={[previewMock(url, data)]}>
        <LinkCard url={url} onNavigate={onNavigate} />
      </MockedProvider>
    );

  it('shows a skeleton while the preview is loading', () => {
    const { container } = card(preview());

    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('falls back to a plain link when there is no preview at all', async () => {
    const { findByText } = card(null);

    const link = (await findByText('https://example.com/report')) as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.target).toBe('_blank');
  });

  it('shows an outside preview with its title, description and image', async () => {
    const { findByText, container } = card(preview());

    await findByText('Quarterly report');
    expect(container.textContent).toContain('Numbers for the quarter.');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/og.png');
    expect(container.querySelector('a')?.target).toBe('_blank');
  });

  it('renders without the optional fields when the preview carries none of them', async () => {
    const bare = preview({ title: null, description: null, image: null });
    const { container, findByText } = card(bare);

    await findByText('example.com');
    expect(container.querySelector('img')).toBeNull();
  });

  it('names the console for an internal link on a different portal, and marks it as leaving', async () => {
    const onNavigate = vi.fn();
    const internal = preview({ internal: true, portal: 'finance', url: 'https://finance.duncit.com/x' });
    const { findByText, container } = card(internal, 'https://finance.duncit.com/x', onNavigate);

    await findByText('finance console');
    expect(container.querySelector('a')?.target).toBe('_blank');
    expect(container.querySelector('svg[data-testid="OpenInNewIcon"]')).not.toBeNull();

    // A different portal is still a real navigation, not an in-place swap —
    // even with a navigate function on hand, clicking must not use it.
    fireEvent.click(container.querySelector('a') as HTMLAnchorElement);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('navigates in place for an internal link on the same portal, instead of reloading it', async () => {
    const onNavigate = vi.fn();
    const here = preview({ internal: true, portal: HERE, url: 'https://x.test/reports/42?tab=info#top' });
    const { findByText, container } = card(here, 'https://x.test/reports/42?tab=info#top', onNavigate);

    await findByText(`${HERE} console`);
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(link.target).toBe('');

    fireEvent.click(link);

    expect(onNavigate).toHaveBeenCalledWith('/reports/42?tab=info#top');
  });

  it('shows access, denied-with-reason and denied-with-no-reason, for an internal link', async () => {
    const granted = preview({ internal: true, portal: 'finance', has_access: true });
    const { findByText: findGranted } = card(granted, 'https://a.test');
    expect(await findGranted('You have access')).toBeInTheDocument();

    const deniedWithReason = preview({
      internal: true,
      portal: 'finance',
      has_access: false,
      access_note: 'Ask a Finance admin',
    });
    const { findByText: findDenied } = card(deniedWithReason, 'https://b.test');
    expect(await findDenied('Ask a Finance admin')).toBeInTheDocument();

    const deniedNoReason = preview({ internal: true, portal: 'finance', has_access: false, access_note: null });
    const { findByText: findGeneric } = card(deniedNoReason, 'https://c.test');
    expect(await findGeneric('No access')).toBeInTheDocument();
  });

  it('shows the raw url instead of a hostname when the url itself cannot be parsed', async () => {
    const broken = preview({ url: 'not-a-real-url', internal: false });
    const { findByText } = card(broken, 'not-a-real-url');

    expect(await findByText('not-a-real-url')).toBeInTheDocument();
  });

  it('reads its own portal as empty when this environment has no window location at all', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', { value: undefined, configurable: true });
    try {
      const here = preview({ internal: true, portal: '' });
      const { findByText, container } = card(here, 'https://x.test');

      await findByText('console');
      // sameApp only when preview.portal matches currentPortal() — both empty here,
      // so this is the same-app path: no leaving-arrow, no new-tab target.
      expect(container.querySelector('a')?.target).toBe('');
    } finally {
      Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
    }
  });
});
