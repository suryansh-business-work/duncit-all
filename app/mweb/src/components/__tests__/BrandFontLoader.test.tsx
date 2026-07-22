import '@testing-library/jest-dom/vitest';
import { render, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
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
      <MockedProvider mocks={[fontMock('Roboto Slab')]} addTypename={false}>
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
      <MockedProvider mocks={[fontMock('Inter')]} addTypename={false}>
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
      <MockedProvider mocks={[fontMock('')]} addTypename={false}>
        <BrandFontLoader />
      </MockedProvider>,
    );

    // allow the query to resolve
    await waitFor(() => {
      // nothing to assert on render output; just flush microtasks
      expect(true).toBe(true);
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(injectedLinks()).toHaveLength(0);
    expect(injectedStyles()).toHaveLength(0);
  });

  it('renders null (no DOM output of its own)', () => {
    const { container } = render(
      <MockedProvider mocks={[fontMock(null)]} addTypename={false}>
        <BrandFontLoader />
      </MockedProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
