/**
 * The live club preview: the list card, the club page, and the pieces both are
 * built from.
 *
 * Both surfaces are shown at once rather than behind a switch, because they are
 * edited by the SAME fields and an author changing the name needs to see both
 * react. They read one derived model for the same reason — a card and a page
 * that disagreed would make the preview worse than no preview.
 *
 * What the tests below are mostly about is the EMPTY states, since a club is
 * previewed from the first keystroke: no media still has to look like a club
 * rather than a broken image box, an empty section is left out rather than
 * rendered as a heading over nothing, and the verified mark appears only for a
 * club that actually is.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ClubPreviewCard from '../../src/preview/ClubPreviewCard';
import ClubPreviewDetails from '../../src/preview/ClubPreviewDetails';
import PreviewMedia from '../../src/preview/PreviewMedia';
import PreviewPane from '../../src/preview/PreviewPane';
import {
  PreviewBullets,
  PreviewFaqs,
  PreviewMomentsStrip,
  PreviewSection,
} from '../../src/preview/ClubPreviewSections';
import type { ClubPreviewModel } from '../../src/preview/club-preview-model';

const testTheme = createTheme();

const model = (over: Partial<ClubPreviewModel> = {}): ClubPreviewModel => ({
  name: 'Sunset Club',
  description: 'Weekend badminton in Indiranagar.',
  media: [{ url: 'https://ik.imagekit.io/duncit/club.png', type: 'IMAGE' }],
  moments: [
    { url: 'https://ik.imagekit.io/duncit/moment-1.png', type: 'IMAGE' },
    { url: 'https://ik.imagekit.io/duncit/moment-2.png', type: 'IMAGE' },
  ],
  categoryText: 'Sports · Racquet · Badminton',
  placeText: 'Indiranagar, Bengaluru',
  isVerified: true,
  whoWeAre: ['A weekend group', 'All levels welcome'],
  whatWeDo: ['Doubles every Sunday'],
  perks: ['Shuttles included'],
  values: ['Turn up on time'],
  faqs: [{ question: 'Do I need my own racquet?', answer: 'We have spares.' }],
  communityLink: 'https://chat.whatsapp.com/community',
  groupLink: 'https://chat.whatsapp.com/group',
  ...over,
});

const EMPTY = model({
  name: '',
  description: '',
  media: [],
  moments: [],
  categoryText: '',
  placeText: '',
  isVerified: false,
  whoWeAre: [],
  whatWeDo: [],
  perks: [],
  values: [],
  faqs: [],
  communityLink: '',
  groupLink: '',
});

const wrap = (ui: React.ReactNode) =>
  render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);

describe('PreviewMedia', () => {
  it('shows the cover the author has chosen', () => {
    const { container } = wrap(
      <PreviewMedia media={{ url: 'https://ik.imagekit.io/duncit/club.png', type: 'IMAGE' }} title="Sunset Club" height={160} />
    );

    expect(container.innerHTML).toContain('club.png');
  });

  it('falls back to a panel rather than a broken image box when there is none', () => {
    const { container } = wrap(<PreviewMedia title="Sunset Club" height={160} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toBe('');
  });

  it('renders a VIDEO cover as a playing video, not a picture that will not load', () => {
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
          { id: 'card', label: 'In the club list', node: <div>card body</div> },
          { id: 'details', label: 'On the club page', node: <div>page body</div> },
        ]}
      />
    );

    expect(container.textContent).toContain('In the club list');
    expect(container.textContent).toContain('On the club page');
  });

  it('renders with nothing to preview yet', () => {
    const { container } = wrap(<PreviewPane title="Member preview" hint="Hint" blocks={[]} />);

    expect(container.textContent).toContain('Member preview');
  });
});

describe('ClubPreviewCard', () => {
  it('shows what a member sees in the list', () => {
    const { container } = wrap(<ClubPreviewCard model={model()} />);

    // The card leads with the name and the category; the PLACE belongs to the
    // page, where a member is deciding whether they can get there.
    expect(container.textContent).toContain('Sunset Club');
    expect(container.textContent).toContain('Sports · Racquet · Badminton');
    expect(wrap(<ClubPreviewDetails model={model()} />).container.textContent).toContain(
      'Indiranagar, Bengaluru'
    );
  });

  it('marks a verified club, and leaves the mark off one that is not', () => {
    const verified = wrap(<ClubPreviewCard model={model()} />);
    const plain = wrap(<ClubPreviewCard model={model({ isVerified: false })} />);

    expect(verified.container.innerHTML).not.toBe(plain.container.innerHTML);
  });

  it('still looks like a club before anything has been typed', () => {
    const { container } = wrap(<ClubPreviewCard model={EMPTY} />);

    expect(container.innerHTML).not.toBe('');
  });
});

describe('ClubPreviewDetails', () => {
  it('shows everything the club page carries', () => {
    const { container } = wrap(<ClubPreviewDetails model={model()} />);

    expect(container.textContent).toContain('Weekend badminton in Indiranagar.');
    expect(container.textContent).toContain('A weekend group');
    expect(container.textContent).toContain('Doubles every Sunday');
    expect(container.textContent).toContain('Shuttles included');
    expect(container.textContent).toContain('Turn up on time');
    expect(container.textContent).toContain('Do I need my own racquet?');
  });

  it('shows the moments strip when there are moments', () => {
    const withMoments = wrap(<ClubPreviewDetails model={model()} />);
    const without = wrap(<ClubPreviewDetails model={model({ moments: [] })} />);

    expect(withMoments.container.innerHTML).not.toBe(without.container.innerHTML);
  });

  it('leaves out a section that has nothing in it, rather than an empty heading', () => {
    const full = wrap(<ClubPreviewDetails model={model()} />);
    const bare = wrap(<ClubPreviewDetails model={EMPTY} />);

    expect((bare.container.textContent ?? '').length).toBeLessThan(
      (full.container.textContent ?? '').length
    );
  });

  it('renders a completely empty club without falling over', () => {
    expect(wrap(<ClubPreviewDetails model={EMPTY} />).container).toBeDefined();
  });

  it('shows the community and group links only where the author gave one', () => {
    const both = wrap(<ClubPreviewDetails model={model()} />);
    const neither = wrap(<ClubPreviewDetails model={model({ communityLink: '', groupLink: '' })} />);

    expect(both.container.innerHTML).not.toBe(neither.container.innerHTML);
  });
});

describe('the preview sections', () => {
  it('renders a titled section around whatever it was given', () => {
    const { container } = wrap(
      <PreviewSection title="Who we are">
        <div>body</div>
      </PreviewSection>
    );

    expect(container.textContent).toContain('Who we are');
    expect(container.textContent).toContain('body');
  });

  it('renders a bullet list', () => {
    const { container } = wrap(<PreviewBullets items={['One', 'Two']} />);

    expect(container.textContent).toContain('One');
    expect(container.textContent).toContain('Two');
  });

  it('renders nothing at all for an empty bullet list', () => {
    expect(wrap(<PreviewBullets items={[]} />).container.textContent).toBe('');
  });

  it('renders each FAQ as a question with its answer', () => {
    const { container } = wrap(
      <PreviewFaqs
        faqs={[
          { question: 'Do I need my own racquet?', answer: 'We have spares.' },
          { question: 'Is there parking?', answer: 'On the street.' },
        ]}
      />
    );

    expect(container.textContent).toContain('Do I need my own racquet?');
    expect(container.textContent).toContain('On the street.');
  });

  it('renders nothing for a club that has answered nothing yet', () => {
    expect(wrap(<PreviewFaqs faqs={[]} />).container.textContent).toBe('');
  });

  it('lays the moments out in a scrolling strip', () => {
    const { container } = wrap(
      <PreviewMomentsStrip>
        <div>moment</div>
      </PreviewMomentsStrip>
    );

    expect(container.textContent).toContain('moment');
  });
});
