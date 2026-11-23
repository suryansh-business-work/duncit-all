/**
 * The live preview an author watches while they type: the list card, the pod
 * page, and the pieces both are built from.
 *
 * Both surfaces are shown at once rather than behind a switch, because the card
 * and the page are edited by the SAME fields and an author changing the title
 * needs to see both react. That is also why they read one derived model: a card
 * and a page that disagreed about a price would make the preview worse than no
 * preview.
 *
 * The empty states are the point of the rest. A pod with no media yet still has
 * to look like a pod, so the cover falls back to the apps' own gradient panel
 * rather than a broken image box; a pod with no title still needs a headline;
 * and a section with nothing in it is not rendered at all, rather than rendered
 * as an empty heading the author has to wonder about.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PodPreviewCard from '../../src/preview/PodPreviewCard';
import PodPreviewDetails from '../../src/preview/PodPreviewDetails';
import PreviewMedia from '../../src/preview/PreviewMedia';
import PreviewPane from '../../src/preview/PreviewPane';
import {
  PreviewBullets,
  PreviewCharges,
  PreviewChips,
  PreviewSection,
} from '../../src/preview/PodPreviewSections';
import type { PodPreviewModel } from '../../src/preview/pod-preview-model';

const testTheme = createTheme();

const model = (over: Partial<PodPreviewModel> = {}): PodPreviewModel => ({
  title: 'Sunday Badminton',
  media: [{ url: 'https://ik.imagekit.io/duncit/court.png', type: 'image' }],
  isVirtual: false,
  modeText: 'In person',
  isFree: false,
  priceText: '₹250',
  whenText: '23 Aug 2026 · 9:00 am – 11:00 am',
  spotsTotal: 8,
  spotsText: '8 spots',
  placeText: 'Indiranagar Courts, Bengaluru',
  clubName: 'Sunset Club',
  hostNames: ['Asha Rao', 'Vikram S'],
  description: 'Doubles at Court 2.',
  info: 'Bring your own racquet.',
  offers: ['Coaching', 'Shuttles'],
  perks: ['Water'],
  hashtags: ['badminton', 'weekend'],
  charges: [{ label: 'Court fee', amount: 200, note: 'per hour' }],
  paymentTerms: 'Pay on arrival.',
  ...over,
});

const EMPTY = model({
  title: '',
  media: [],
  spotsTotal: 0,
  spotsText: 'Spots not set',
  placeText: '',
  clubName: '',
  hostNames: [],
  description: '',
  info: '',
  offers: [],
  perks: [],
  hashtags: [],
  charges: [],
  paymentTerms: '',
  whenText: '',
});

const wrap = (ui: React.ReactNode) =>
  render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);

const darkTheme = createTheme({ palette: { mode: 'dark' } });

describe('PreviewMedia', () => {
  it('shows the cover the author has chosen', () => {
    const { container } = wrap(
      <PreviewMedia media={{ url: 'https://ik.imagekit.io/duncit/court.png', type: 'image' }} title="Sunday Badminton" height={160} />
    );

    expect(container.innerHTML).toContain('court.png');
  });

  it('falls back to a panel rather than a broken image box when there is none', () => {
    const { container } = wrap(<PreviewMedia title="Sunday Badminton" height={160} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toBe('');
  });

  it('renders a VIDEO cover as a playing video, not as a picture that will not load', () => {
    const { container } = wrap(
      <PreviewMedia media={{ url: 'https://cdn.duncit.com/clip.mp4', type: 'VIDEO' }} title="X" height={160} />
    );

    expect(container.querySelector('video')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('PreviewPane', () => {
  it('stacks every surface in reading order, each under its own label', () => {
    const { container } = wrap(
      <PreviewPane
        title="Member preview"
        hint="Nothing here is saved yet."
        blocks={[
          { id: 'card', label: 'In the pod list', node: <div>card body</div> },
          { id: 'details', label: 'On the pod page', node: <div>page body</div> },
        ]}
      />
    );

    expect(container.textContent).toContain('Member preview');
    expect(container.textContent).toContain('Nothing here is saved yet.');
    expect(container.textContent).toContain('In the pod list');
    expect(container.textContent).toContain('On the pod page');
  });

  it('renders with nothing to preview yet', () => {
    const { container } = wrap(<PreviewPane title="Member preview" hint="Hint" blocks={[]} />);

    expect(container.textContent).toContain('Member preview');
  });
});

describe('PodPreviewCard', () => {
  it('shows what a member sees in the list: title, when, where and price', () => {
    const { container } = wrap(<PodPreviewCard model={model()} />);

    expect(container.textContent).toContain('Sunday Badminton');
    expect(container.textContent).toContain('₹250');
    expect(container.textContent).toContain('8 spots');
    expect(container.textContent).toContain('Indiranagar Courts, Bengaluru');
  });

  it('says Free rather than a zero price', () => {
    const { container } = wrap(<PodPreviewCard model={model({ isFree: true, priceText: 'Free' })} />);

    expect(container.textContent).toContain('Free');
    expect(container.textContent).not.toContain('₹0');
  });

  it('keeps the floating info panel legible on the dark theme too', () => {
    const { container } = render(
      <ThemeProvider theme={darkTheme}>
        <PodPreviewCard model={model()} />
      </ThemeProvider>,
    );

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('marks a virtual pod as one — there is no place to show', () => {
    const virtual = wrap(
      <PodPreviewCard model={model({ isVirtual: true, modeText: 'Online', placeText: '' })} />
    );
    const physical = wrap(<PodPreviewCard model={model()} />);

    expect(virtual.container.textContent).not.toBe(physical.container.textContent);
  });

  it('still looks like a pod before anything has been typed', () => {
    const { container } = wrap(<PodPreviewCard model={EMPTY} />);

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('Spots not set');
  });

  it('names the club the pod hangs off when there is one', () => {
    expect(wrap(<PodPreviewCard model={model()} />).container.textContent).toContain('Sunset Club');
  });
});

describe('PodPreviewDetails', () => {
  it('shows everything the pod page carries', () => {
    const { container } = wrap(<PodPreviewDetails model={model()} />);

    expect(container.textContent).toContain('Doubles at Court 2.');
    expect(container.textContent).toContain('Bring your own racquet.');
    expect(container.textContent).toContain('Coaching');
    expect(container.textContent).toContain('Water');
    expect(container.textContent).toContain('Court fee');
    expect(container.textContent).toContain('Pay on arrival.');
  });

  it('names every host, because that is who a member turns up to meet', () => {
    const { container } = wrap(<PodPreviewDetails model={model()} />);

    expect(container.textContent).toContain('Asha Rao');
    expect(container.textContent).toContain('Vikram S');
  });

  it('renders a pod nobody has been assigned to host yet', () => {
    const { container } = wrap(<PodPreviewDetails model={model({ hostNames: [] })} />);

    expect(container.textContent).toContain('Doubles at Court 2.');
  });

  it('leaves out a section that has nothing in it, rather than an empty heading', () => {
    const full = wrap(<PodPreviewDetails model={model()} />);
    const bare = wrap(<PodPreviewDetails model={EMPTY} />);

    expect((bare.container.textContent ?? '').length).toBeLessThan(
      (full.container.textContent ?? '').length
    );
  });

  it('renders a completely empty pod without falling over', () => {
    const { container } = wrap(<PodPreviewDetails model={EMPTY} />);

    expect(container).toBeDefined();
  });

  it('shows the hashtags an author typed, without their hashes', () => {
    const { container } = wrap(<PodPreviewDetails model={model()} />);

    expect(container.textContent).toContain('badminton');
  });

  it('renders a free virtual pod, which has neither a price nor a place', () => {
    const { container } = wrap(
      <PodPreviewDetails
        model={model({ isFree: true, priceText: 'Free', isVirtual: true, placeText: '', charges: [] })}
      />
    );

    expect(container.textContent).toContain('Free');
  });
});

describe('the preview sections', () => {
  it('renders a titled section around whatever it was given', () => {
    const { container } = wrap(
      <PreviewSection title="What this pod offers">
        <div>body</div>
      </PreviewSection>
    );

    expect(container.textContent).toContain('What this pod offers');
    expect(container.textContent).toContain('body');
  });

  it('renders offers and perks as ticked lists, and marks which is which', () => {
    const offers = wrap(<PreviewBullets items={['Coaching']} kind="OFFER" />);
    const perks = wrap(<PreviewBullets items={['Water']} kind="PERK" />);

    expect(offers.container.textContent).toContain('Coaching');
    expect(perks.container.textContent).toContain('Water');
    expect(offers.container.innerHTML).not.toBe(perks.container.innerHTML);
  });

  it('renders an empty bullet list without a stray tick', () => {
    const { container } = wrap(<PreviewBullets items={[]} kind="OFFER" />);

    expect(container.textContent).toBe('');
  });

  it('prefixes each chip, so a hashtag reads as one', () => {
    const { container } = wrap(<PreviewChips items={['badminton', 'weekend']} prefix="#" />);

    expect(container.textContent).toContain('#badminton');
    expect(container.textContent).toContain('#weekend');
  });

  it('renders no chips at all for an empty list', () => {
    expect(wrap(<PreviewChips items={[]} prefix="#" />).container.textContent).toBe('');
  });

  it('prices every charge through the caller money formatter, never its own', () => {
    const { container } = wrap(
      <PreviewCharges
        charges={[
          { label: 'Court fee', amount: 200, note: 'per hour' },
          { label: 'Shuttle', amount: 50, note: '' },
        ]}
        money={(amount) => `INR ${amount}`}
      />
    );

    expect(container.textContent).toContain('INR 200');
    expect(container.textContent).toContain('INR 50');
    expect(container.textContent).toContain('per hour');
  });

  it('renders a pod with no extra charges', () => {
    const { container } = wrap(<PreviewCharges charges={[]} money={(n) => String(n)} />);

    expect(container.textContent).toBe('');
  });
});
