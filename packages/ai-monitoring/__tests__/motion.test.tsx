/**
 * The AI Monitoring motion language.
 *
 * What is worth asserting about an animation is not how it looks — it is that
 * it can be switched OFF, that it is driven by the shared timings rather than
 * numbers typed into a component, and that nothing which moves is announced to
 * a screen reader as if it were content. Those three are what break silently.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AI_MONITOR_MOTION } from '@duncit/utils';

import { AiMonitorGlyph } from '../src/mui/AiMonitorGlyph';
import { AiMonitorPill } from '../src/mui/AiMonitorPill';
import { AiProcessingInline } from '../src/mui/AiProcessingInline';
import { AiProcessingOverlay } from '../src/mui/AiProcessingOverlay';
import { aiMotion } from '../src/mui/motion';

const testTheme = createTheme();

const mount = (node: React.ReactNode) =>
  render(<ThemeProvider theme={testTheme}>{node}</ThemeProvider>);

describe('aiMotion', () => {
  // The one rule every animation in the package goes through. A shimmer beside
  // an upload field that a reader cannot switch off is a reason to look away
  // from exactly the sentence they need to read.
  it('carries the animation AND the stillness reduced-motion readers get', () => {
    const sx = aiMotion('spin 1s linear infinite');

    expect(sx.animation).toBe('spin 1s linear infinite');
    expect(sx['@media (prefers-reduced-motion: reduce)']).toEqual({ animation: 'none' });
  });
});

describe('AiMonitorGlyph', () => {
  // It sits beside a label that already says the words. Announcing it too
  // would read the feature's name out twice.
  it('is decoration — never announced', () => {
    const { container } = mount(<AiMonitorGlyph />);

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  // Rings mean "a check is RUNNING". A badge that emitted them while merely
  // labelling a dialog would say something is in flight when nothing is.
  it('emits rings only while a check is running', () => {
    const still = mount(<AiMonitorGlyph size={24} />).container;
    const running = mount(<AiMonitorGlyph size={24} rings />).container;

    expect(running.querySelectorAll('div').length).toBeGreaterThan(
      still.querySelectorAll('div').length,
    );
  });

  // The halo has to fit, or a ring at full flight is clipped by its own frame.
  it('reserves room for a ring at full flight, and none when there are none', () => {
    const still = mount(<AiMonitorGlyph size={40} />).container.firstElementChild as HTMLElement;
    const running = mount(<AiMonitorGlyph size={40} rings />).container
      .firstElementChild as HTMLElement;

    expect(getComputedStyle(still).width).toBe('40px');
    expect(getComputedStyle(running).width).toBe(`${Math.round(40 * AI_MONITOR_MOTION.ringTo)}px`);
  });
});

describe('AiMonitorPill', () => {
  it('is a real button that calls back', async () => {
    const onClick = vi.fn();
    mount(<AiMonitorPill label="AI Monitoring" onClick={onClick} testId="pill" />);

    screen.getByTestId('pill').click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // The label says "AI Monitoring"; what the pill OPENS is a different
  // sentence, and that is what a screen reader should hear.
  it('announces what it opens when the caller says so, and its label otherwise', () => {
    mount(<AiMonitorPill label="AI Monitoring" ariaLabel="What AI monitors" onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'What AI monitors' })).toBeTruthy();

    mount(<AiMonitorPill label="AI Monitoring" onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'AI Monitoring' })).toBeTruthy();
  });

});

describe('AiProcessingOverlay', () => {
  // It holds no copy of its own on purpose — Create Pod's wording is not a
  // listing's wording, and a shared default would be a fourth thing to
  // translate.
  it('renders exactly the three sentences the caller passed', () => {
    mount(
      <AiProcessingOverlay
        open
        title="AI is monitoring…"
        note="This takes a few seconds."
        hold="Please stay on this screen."
        testId="overlay"
      />,
    );

    const text = screen.getByTestId('overlay').textContent ?? '';
    expect(text).toContain('AI is monitoring…');
    expect(text).toContain('This takes a few seconds.');
    expect(text).toContain('Please stay on this screen.');
  });

  // The form underneath is being read and published; edits to it are already
  // too late, so the wait has to sit over everything a dialog could.
  it('sits above the modal layer, so nothing stays editable behind it', () => {
    mount(<AiProcessingOverlay open title="t" note="n" hold="h" testId="overlay" />);

    const zIndex = Number(getComputedStyle(screen.getByTestId('overlay')).zIndex);
    expect(zIndex).toBeGreaterThan(testTheme.zIndex.modal);
  });
});

describe('AiProcessingInline', () => {
  it('says what the check is doing, in the caller\u2019s language', () => {
    mount(<AiProcessingInline visible label="AI is checking all your details…" testId="inline" />);

    expect(screen.getByTestId('inline').textContent).toContain('AI is checking all your details…');
  });

  // `role="status"` rather than a bare row: a wait that only animates is a
  // wait a screen-reader user never learns about.
  it('announces itself as a live status', () => {
    mount(<AiProcessingInline visible label="Checking" testId="inline" />);

    expect(screen.getByTestId('inline').getAttribute('role')).toBe('status');
  });

  it('is gone entirely when no check is running', () => {
    mount(<AiProcessingInline visible={false} label="Checking" testId="inline" />);

    expect(screen.queryByTestId('inline')).toBeNull();
  });
});

describe('AiMonitoringChip spacing', () => {
  // The prop is typed `ChipProps['sx']`, which permits the array form MUI
  // recommends for composition. The chip has styles of its own now (the sheen
  // lives on `::after`), so a caller's array has to be merged with them rather
  // than replace them.
  it('keeps the chip\u2019s own styles when a caller passes an sx ARRAY', async () => {
    const { AiMonitoringChip } = await import('../src/mui/AiMonitoringChip');
    const { MockedProvider } = await import('@apollo/client/testing/react');

    const { container } = render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
        <ThemeProvider theme={testTheme}>
          <AiMonitoringChip sx={[{ mt: 1 }, { opacity: 0.5 }]} />
        </ThemeProvider>
      </MockedProvider>,
    );

    const chip = container.querySelector('.MuiChip-root') as HTMLElement;
    expect(getComputedStyle(chip).opacity).toBe('0.5');
    expect(getComputedStyle(chip).overflow).toBe('hidden');
  });
});
