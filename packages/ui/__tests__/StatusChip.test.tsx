import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusChip, STATUS_CHIP_COLORS } from '../src/StatusChip';

const colorClass = (root: HTMLElement) =>
  Array.from(root.querySelector('.MuiChip-root')!.classList).find((c) =>
    c.startsWith('MuiChip-color'),
  );

const chipColorClass = (color: string) =>
  `MuiChip-color${color.charAt(0).toUpperCase()}${color.slice(1)}`;

describe('STATUS_CHIP_COLORS', () => {
  it('maps the shared approval vocabulary, including the SUBMITTED=info split', () => {
    expect(STATUS_CHIP_COLORS).toMatchObject({
      APPROVED: 'success',
      REJECTED: 'error',
      DENIED: 'error',
      PENDING: 'warning',
      DRAFT: 'warning',
      SUBMITTED: 'info',
    });
  });

  it('contains exactly those six statuses, so the per-status cases below are exhaustive', () => {
    expect(Object.keys(STATUS_CHIP_COLORS).toSorted((a, b) => a.localeCompare(b))).toEqual([
      'APPROVED',
      'DENIED',
      'DRAFT',
      'PENDING',
      'REJECTED',
      'SUBMITTED',
    ]);
  });

  it.each(Object.entries(STATUS_CHIP_COLORS))(
    'renders %s as a %s chip so the three hand-rolled copies can adopt this map',
    (status, color) => {
      const { container } = render(<StatusChip status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
      expect(colorClass(container)).toBe(chipColorClass(color));
    },
  );
});

describe('StatusChip', () => {
  it('resolves the color from the default map and labels with the raw status', () => {
    const { container } = render(<StatusChip status="APPROVED" />);
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(colorClass(container)).toBe('MuiChip-colorSuccess');
  });

  it('falls back to the default "default" color for an unknown status', () => {
    const { container } = render(<StatusChip status="UNKNOWN" />);
    expect(colorClass(container)).toBe('MuiChip-colorDefault');
  });

  it('honors an explicit fallbackColor for an unknown status', () => {
    const { container } = render(<StatusChip status="MYSTERY" fallbackColor="warning" />);
    expect(colorClass(container)).toBe('MuiChip-colorWarning');
  });

  it('uses a full replacement colorMap without merging the defaults', () => {
    const { container } = render(
      <StatusChip status="OPEN" colorMap={{ OPEN: 'secondary' }} />,
    );
    expect(colorClass(container)).toBe('MuiChip-colorSecondary');
  });

  it('supports the documented SUBMITTED override via a spread map', () => {
    const { container } = render(
      <StatusChip
        status="SUBMITTED"
        colorMap={{ ...STATUS_CHIP_COLORS, SUBMITTED: 'warning' }}
      />,
    );
    expect(colorClass(container)).toBe('MuiChip-colorWarning');
  });

  it('renders a custom label and forwards extra chip props like variant="outlined"', () => {
    const { container } = render(
      <StatusChip status="APPROVED" label="Approved!" variant="outlined" />,
    );
    expect(screen.getByText('Approved!')).toBeInTheDocument();
    expect(container.querySelector('.MuiChip-outlined')).toBeInTheDocument();
  });
});
