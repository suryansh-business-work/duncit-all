import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PortalTour, type PortalTourStep } from '../src/guide/PortalTour';

const STEPS: PortalTourStep[] = [
  { anchor: 'payouts-table', title: 'Every line is one pod', body: 'Amounts follow the seats scanned at the door.' },
  { anchor: 'payouts-filters', title: 'Narrow the cycle', body: 'Pick a venue or a host to release in batches.' },
  { anchor: 'payouts-export', title: 'Take it to Finance', body: 'The export is what the bank file is built from.' },
];

/** A page carrying some of the anchors the steps point at. */
function Page({ anchors }: Readonly<{ anchors: string[] }>) {
  return (
    <>
      {anchors.map((anchor) => (
        <div key={anchor} data-tour={anchor}>
          {anchor}
        </div>
      ))}
    </>
  );
}

function anchorEl(anchor: string): HTMLElement {
  return screen.getByText(anchor);
}

function placeAt(anchor: string, top: number, left: number, width = 100, height = 40) {
  vi.spyOn(anchorEl(anchor), 'getBoundingClientRect').mockReturnValue(new DOMRect(left, top, width, height));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PortalTour', () => {
  it('walks every step whose element is on the page, Back and Next between them, Done at the end', () => {
    const onClose = vi.fn();
    render(
      <>
        <Page anchors={['payouts-table', 'payouts-filters', 'payouts-export']} />
        <PortalTour open steps={STEPS} onClose={onClose} />
      </>,
    );
    const card = screen.getByRole('dialog', { name: 'Every line is one pod' });
    expect(card).toHaveFocus();
    expect(card).toHaveAttribute('aria-modal', 'false');
    expect(card).toHaveAccessibleDescription('Amounts follow the seats scanned at the door.');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Narrow the cycle' })).toHaveFocus();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('dialog', { name: 'Every line is one pod' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('leaves out a step whose anchor is missing and counts only what it shows', () => {
    const onClose = vi.fn();
    render(
      <>
        <Page anchors={['payouts-table', 'payouts-export']} />
        <PortalTour open steps={STEPS} onClose={onClose} />
      </>,
    );
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Take it to Finance' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes itself as not completed when no step has anything to point at', () => {
    const onClose = vi.fn();
    render(<PortalTour open steps={STEPS} onClose={onClose} />);
    expect(onClose).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
  });

  it('renders nothing while closed and starts from the first step again each time it opens', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <Page anchors={['payouts-table', 'payouts-filters']} />
        <PortalTour open={false} steps={STEPS} onClose={onClose} />
      </>,
    );
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();

    rerender(
      <>
        <Page anchors={['payouts-table', 'payouts-filters']} />
        <PortalTour open steps={STEPS} onClose={onClose} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();

    rerender(
      <>
        <Page anchors={['payouts-table', 'payouts-filters']} />
        <PortalTour open={false} steps={STEPS} onClose={onClose} />
      </>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(
      <>
        <Page anchors={['payouts-table', 'payouts-filters']} />
        <PortalTour open steps={STEPS} onClose={onClose} />
      </>,
    );
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });

  it('begins at startAt, ignoring the steps before it', () => {
    render(
      <>
        <Page anchors={['payouts-table', 'payouts-filters', 'payouts-export']} />
        <PortalTour open steps={STEPS} onClose={() => undefined} startAt={1} />
      </>,
    );
    expect(screen.getByRole('dialog', { name: 'Narrow the cycle' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('Skip and Escape both close it as not completed; other keys do nothing', () => {
    const onClose = vi.fn();
    render(
      <>
        <Page anchors={['payouts-table']} />
        <PortalTour open steps={STEPS} onClose={onClose} />
      </>,
    );
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenLastCalledWith(false);
  });

  it('draws the spotlight over the target and follows it through resize and scroll, then lets go', () => {
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    render(<Page anchors={['payouts-table', 'payouts-filters']} />);
    placeAt('payouts-table', 120, 40);
    const tour = render(<PortalTour open steps={STEPS} onClose={() => undefined} />);
    const spotlight = screen.getByTestId('portal-tour-spotlight');
    expect(spotlight).toHaveAttribute('aria-hidden', 'true');
    expect(spotlight).toHaveStyle({ top: '120px', left: '40px', width: '100px', height: '40px' });

    placeAt('payouts-table', 300, 40);
    fireEvent(window, new Event('resize'));
    expect(spotlight).toHaveStyle({ top: '300px' });

    placeAt('payouts-table', 80, 40);
    fireEvent(window, new Event('scroll'));
    expect(spotlight).toHaveStyle({ top: '80px' });

    // The next step measures its own target.
    placeAt('payouts-filters', 500, 60, 200, 32);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('portal-tour-spotlight')).toHaveStyle({ top: '500px', left: '60px', width: '200px', height: '32px' });

    tour.unmount();
    const removedFromWindow = removeWindowListener.mock.calls.map(([type]) => type);
    expect(removedFromWindow).toContain('resize');
    expect(removedFromWindow).toContain('scroll');
    expect(removeDocumentListener.mock.calls.map(([type]) => type)).toContain('keydown');
  });

  it('scrolls the target into the middle of the viewport where the browser can', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true, writable: true });
    try {
      render(
        <>
          <Page anchors={['payouts-table']} />
          <PortalTour open steps={STEPS} onClose={() => undefined} />
        </>,
      );
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
      expect(scrollIntoView.mock.instances[0]).toBe(anchorEl('payouts-table'));
    } finally {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
  });
});
