import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeaderBrand from '../HeaderBrand';
import { HOME_REFRESH_EVENT } from '../queries';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function renderBrand(props: { logoUrl?: string | null; appName?: string | null } = {}) {
  return render(
    <MemoryRouter>
      <HeaderBrand {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigateMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HeaderBrand', () => {
  it('renders the logo image when logoUrl is provided', () => {
    renderBrand({ logoUrl: 'http://x/logo.png', appName: 'Acme' });
    const img = screen.getByAltText('Acme') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe('http://x/logo.png');
  });

  it('falls back to the Duncit alt text for a logo without an appName', () => {
    renderBrand({ logoUrl: 'http://x/logo.png' });
    expect(screen.getByAltText('Duncit')).toBeInTheDocument();
  });

  it('renders the initial monogram when no logoUrl is provided', () => {
    renderBrand({ appName: 'Zenith' });
    expect(screen.getByText('Z')).toBeInTheDocument();
    expect(screen.getByLabelText('Zenith')).toBeInTheDocument();
  });

  it('renders the default Duncit monogram initial when nothing is provided', () => {
    renderBrand();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('navigates home and scrolls to top on click', () => {
    const scrollSpy = vi.fn();
    const el = document.createElement('div');
    el.id = 'main-scroll';
    (el as unknown as { scrollTo: typeof scrollSpy }).scrollTo = scrollSpy;
    document.body.appendChild(el);

    renderBrand({ appName: 'Acme' });
    fireEvent.click(screen.getByRole('button', { name: 'Go to home and refresh' }));

    expect(navigateMock).toHaveBeenCalledWith('/');
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
    document.body.removeChild(el);
  });

  it('falls back to window.scrollTo when there is no main-scroll element', () => {
    const scrollSpy = vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});
    renderBrand({ appName: 'Acme' });
    fireEvent.click(screen.getByRole('button', { name: 'Go to home and refresh' }));
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
  });

  it('dispatches the home-refresh event when already on the home path', () => {
    window.history.pushState({}, '', '/');
    const listener = vi.fn();
    globalThis.addEventListener(HOME_REFRESH_EVENT, listener);
    renderBrand({ appName: 'Acme' });
    fireEvent.click(screen.getByRole('button', { name: 'Go to home and refresh' }));
    expect(listener).toHaveBeenCalled();
    globalThis.removeEventListener(HOME_REFRESH_EVENT, listener);
  });

  it('does not dispatch the home-refresh event when not on the home path', () => {
    window.history.pushState({}, '', '/clubs');
    const listener = vi.fn();
    globalThis.addEventListener(HOME_REFRESH_EVENT, listener);
    renderBrand({ appName: 'Acme' });
    fireEvent.click(screen.getByRole('button', { name: 'Go to home and refresh' }));
    expect(listener).not.toHaveBeenCalled();
    globalThis.removeEventListener(HOME_REFRESH_EVENT, listener);
  });

  it('triggers goHome via the Enter key', () => {
    renderBrand({ appName: 'Acme' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Go to home and refresh' }), {
      key: 'Enter',
    });
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('triggers goHome via the Space key', () => {
    renderBrand({ appName: 'Acme' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Go to home and refresh' }), {
      key: ' ',
    });
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('ignores other keys', () => {
    renderBrand({ appName: 'Acme' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Go to home and refresh' }), {
      key: 'Tab',
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
