import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import ReelsDialog from '../../src/pages/cms/fragments-tab/ReelsDialog';
import type { CmsSiteRow } from '../../src/pages/cms/queries/sites';
import { renderWithProviders } from '../testkit';
import { en } from '../en';
import { makeCmsSiteRow } from '../mocks/cms.mock';

// The reel list and the reel limits have their own suites (ReelsManager, ReelSettings).
vi.mock('../../src/pages/website/reels/ReelsManager', () => ({
  default: ({ site }: { site: string }) => <div data-testid="reels-manager">{site}</div>,
}));
vi.mock('../../src/pages/website/reel-settings/ReelSettingsPage', () => ({
  default: ({ embedded }: { embedded?: boolean }) => <div data-testid="reel-settings">{embedded ? 'embedded' : 'page'}</div>,
}));

const mount = (site: CmsSiteRow, open = true) => {
  const onClose = vi.fn();
  renderWithProviders(<ReelsDialog site={site} open={open} onClose={onClose} />);
  return onClose;
};

describe('ReelsDialog', () => {
  it("manages the reels of the Duncit site the website is linked to, with the shared limits below", () => {
    mount(makeCmsSiteRow({ legacy_site: 'PARTNERS' }));
    expect(screen.getByRole('dialog', { name: en('websiteApp.cms.fragments.manageReels') })).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.reels.intro'))).toBeInTheDocument();
    expect(screen.getByTestId('reels-manager')).toHaveTextContent('PARTNERS');
    expect(screen.queryByText(en('websiteApp.cms.reels.noSite'))).not.toBeInTheDocument();
    // The limits are a section of the dialog, not a page of their own.
    expect(screen.getByTestId('reel-settings')).toHaveTextContent('embedded');
  });

  it('explains that a website not linked to a Duncit site has no reels, and still shows the limits', () => {
    mount(makeCmsSiteRow({ legacy_site: null }));
    expect(screen.getByText(en('websiteApp.cms.reels.noSite'))).toBeInTheDocument();
    expect(screen.queryByTestId('reels-manager')).not.toBeInTheDocument();
    expect(screen.getByTestId('reel-settings')).toBeInTheDocument();
  });

  it('loads nothing while closed', () => {
    mount(makeCmsSiteRow({ legacy_site: 'MAIN' }), false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reels-manager')).not.toBeInTheDocument();
  });

  it('asks to close on Escape', () => {
    const onClose = mount(makeCmsSiteRow({ legacy_site: 'MAIN' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
