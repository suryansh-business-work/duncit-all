import '@testing-library/jest-dom/vitest';
import { act, render, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { gql } from '@apollo/client';
import { afterEach, describe, expect, it } from 'vitest';
import BrandFontLoader from '../BrandFontLoader';

const MWEB_FONT = gql`
  query MwebBrandFont {
    branding {
      mweb_font_family
    }
  }
`;

const fontMock = (family: string | null) => ({
  request: { query: MWEB_FONT },
  result: { data: { branding: { mweb_font_family: family } } },
});

const injectedLinks = () =>
  Array.from(
    document.head.querySelectorAll('link[href*="fonts.googleapis.com"]'),
  ) as HTMLLinkElement[];

const injectedStyles = () =>
  Array.from(document.head.querySelectorAll('style')).filter((s) =>
    s.textContent?.includes('#root'),
  );

afterEach(() => {
  injectedLinks().forEach((l) => l.remove());
  injectedStyles().forEach((s) => s.remove());
});

describe('BrandFontLoader', () => {
  it('injects the Google Font stylesheet and #root override for a picked family', async () => {
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[fontMock('Roboto Slab')]}>
        <BrandFontLoader />
      </MockedProvider>,
    );

    await waitFor(() => expect(injectedLinks()).toHaveLength(1));

    const link = injectedLinks()[0];
    expect(link.rel).toBe('stylesheet');
    // spaces are encoded to '+'
    expect(link.href).toContain('family=Roboto+Slab:wght@400;500;600;700;800;900');
    expect(link.href).toContain('display=swap');

    const styles = injectedStyles();
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain(
      "#root, #root * { font-family: 'Roboto Slab', 'Quicksand', sans-serif; }",
    );
  });

  it('removes injected nodes on unmount (cleanup)', async () => {
    const { unmount } = render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[fontMock('Inter')]}>
        <BrandFontLoader />
      </MockedProvider>,
    );

    await waitFor(() => expect(injectedLinks()).toHaveLength(1));
    unmount();

    expect(injectedLinks()).toHaveLength(0);
    expect(injectedStyles()).toHaveLength(0);
  });

  it('injects nothing when the family is empty', async () => {
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[fontMock('')]}>
        <BrandFontLoader />
      </MockedProvider>,
    );

    // Deliberately NOT `waitFor(() => expect(injectedLinks()).toHaveLength(0))`:
    // nothing is injected at t=0 either, so that predicate is already true on the
    // first poll and the helper returns without ever waiting for the query —
    // the assertion could never fail (S5914). Flush the mocked response instead,
    // then assert. The "injects the font" test above proves this same harness
    // does inject within one flush, so a zero here is a real result.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(injectedLinks()).toHaveLength(0);
    expect(injectedStyles()).toHaveLength(0);
  });

  it('renders null (no DOM output of its own)', () => {
    const { container } = render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[fontMock(null)]}>
        <BrandFontLoader />
      </MockedProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
