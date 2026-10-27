import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnumChip } from '../../components/EnumChip';
import { ExternalLink } from '../../components/ExternalLink';
import { FlagChip } from '../../components/FlagChip';
import { EVENT_STATUS_COLORS, EVENT_STATUS_KEYS } from '../../components/enum-labels';

/** The MUI chip root that holds the given label. */
const chip = (label: string): HTMLElement => {
  const root = screen.getByText(label).closest('.MuiChip-root');
  if (!(root instanceof HTMLElement)) throw new Error(`no chip for ${label}`);
  return root;
};

describe('EnumChip', () => {
  it('shows the translated label in the colour the map gives the value', () => {
    render(<EnumChip value="CANCELLED" keys={EVENT_STATUS_KEYS} colors={EVENT_STATUS_COLORS} />);
    expect(chip('Cancelled')).toHaveClass('MuiChip-colorError');
  });

  it('falls back to the raw value, in the default colour, for a value the maps do not know', () => {
    render(<EnumChip value="ARCHIVED" keys={EVENT_STATUS_KEYS} colors={EVENT_STATUS_COLORS} />);
    expect(chip('ARCHIVED')).toHaveClass('MuiChip-colorDefault');
  });
});

describe('FlagChip', () => {
  it('draws a filled success chip with the on label by default', () => {
    render(<FlagChip on onLabel="Featured" offLabel="Not featured" />);
    expect(chip('Featured')).toHaveClass('MuiChip-filled', 'MuiChip-colorSuccess');
    expect(screen.queryByText('Not featured')).not.toBeInTheDocument();
  });

  it('uses the colour the caller asks for while on', () => {
    render(<FlagChip on onLabel="Hidden" offLabel="Visible" onColor="warning" />);
    expect(chip('Hidden')).toHaveClass('MuiChip-colorWarning');
  });

  it('draws an outlined chip with the off label when the flag is off', () => {
    render(<FlagChip on={false} onLabel="Featured" offLabel="Not featured" onColor="warning" />);
    expect(chip('Not featured')).toHaveClass('MuiChip-outlined');
    expect(chip('Not featured')).not.toHaveClass('MuiChip-colorWarning');
  });
});

describe('ExternalLink', () => {
  it('opens in a new tab without leaking the opener, named by its aria label', () => {
    render(<ExternalLink href="https://lite.example/e/jazz" label="Jazz Night" ariaLabel="Open Jazz Night on the site" testId="link" />);
    const link = screen.getByRole('link', { name: 'Open Jazz Night on the site' });
    expect(link).toHaveAttribute('href', 'https://lite.example/e/jazz');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('data-testid', 'link');
    expect(link).toHaveTextContent('Jazz Night');
  });

  it('is named by its visible text when no aria label is given, and hides the icon from assistive tech', () => {
    render(<ExternalLink href="https://vendor.example" label="Open the dashboard" />);
    const link = screen.getByRole('link', { name: 'Open the dashboard' });
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
