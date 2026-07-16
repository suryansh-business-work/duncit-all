import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StatCard, usageColor } from '../src/stat-card';

const Icon = () => <span data-testid="icon">*</span>;

describe('usageColor', () => {
  it('is error at/above 90', () => {
    expect(usageColor(90)).toBe('error');
    expect(usageColor(100)).toBe('error');
  });
  it('is warning in [75, 90)', () => {
    expect(usageColor(75)).toBe('warning');
    expect(usageColor(89)).toBe('warning');
  });
  it('is success below 75', () => {
    expect(usageColor(0)).toBe('success');
    expect(usageColor(74)).toBe('success');
  });
});

describe('StatCard — default layout', () => {
  it('renders a string value with the default outlined card and end icon', () => {
    const { container } = render(<StatCard label="Users" value="1,204" icon={<Icon />} />);
    expect(screen.getByText('Users')).toHaveClass('MuiTypography-overline');
    expect(screen.getByText('1,204')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(container.querySelector('.MuiCard-root')).toHaveClass('MuiPaper-outlined');
  });

  it('renders a numeric value and places the icon at the start', () => {
    render(<StatCard label="Orders" value={42} icon={<Icon />} iconPlacement="start" />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders without an icon (adornment collapses to null)', () => {
    render(<StatCard label="Empty" value="0" />);
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });

  it('shows a hint with a custom color', () => {
    render(<StatCard label="Rev" value="₹9" hint="up 4%" hintColor="success.main" />);
    expect(screen.getByText('up 4%')).toHaveClass('MuiTypography-caption');
  });

  it('shows a hint with the default text.secondary color when none is given', () => {
    render(<StatCard label="Rev" value="₹9" hint="steady" />);
    expect(screen.getByText('steady')).toHaveClass('MuiTypography-caption');
  });

  it('renders a usage bar, defaulting its color via usageColor and clamping >100', () => {
    const { container } = render(<StatCard label="Disk" value="full" percent={150} />);
    const bar = container.querySelector('.MuiLinearProgress-root')!;
    expect(bar).toHaveClass('MuiLinearProgress-colorError');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps a negative percent to 0 and colors it success', () => {
    const { container } = render(<StatCard label="Disk" value="empty" percent={-5} />);
    const bar = container.querySelector('.MuiLinearProgress-root')!;
    expect(bar).toHaveClass('MuiLinearProgress-colorSuccess');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  it('honors an explicit progressColor', () => {
    const { container } = render(
      <StatCard label="CPU" value="x" percent={80} progressColor="primary" />,
    );
    expect(container.querySelector('.MuiLinearProgress-root')).toHaveClass(
      'MuiLinearProgress-colorPrimary',
    );
  });

  it('omits the usage bar when percent is undefined', () => {
    const { container } = render(<StatCard label="No bar" value="x" />);
    expect(container.querySelector('.MuiLinearProgress-root')).not.toBeInTheDocument();
  });
});

describe('StatCard — value block', () => {
  it('shows a Skeleton instead of the value while loading', () => {
    const { container } = render(
      <StatCard label="L" value="hidden" loading skeletonProps={{ width: 120 }} />,
    );
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
  });

  it('renders a sub line beside the value and applies valueColor', () => {
    render(<StatCard label="Mem" value="8" sub="GB" valueColor="error.main" valueNoWrap />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('GB')).toHaveClass('MuiTypography-body2');
  });
});

describe('StatCard — icon adornments', () => {
  it('wraps the icon in a tinted box with defaults (split layout)', () => {
    render(
      <StatCard layout="split" label="Tiles" value="7" icon={<Icon />} iconBox={{ color: '#3b82f6' }} />,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('wraps the icon in a tinted box with explicit size/radius/alpha', () => {
    render(
      <StatCard
        layout="split"
        label="Tiles"
        value="7"
        icon={<Icon />}
        iconBox={{ color: '#3b82f6', size: 32, radius: 2, alpha: 0.25 }}
      />,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies a plain iconColor wrapper in the valueFirst layout', () => {
    render(
      <StatCard layout="valueFirst" label="Open" value="3" icon={<Icon />} iconColor="primary.main" />,
    );
    expect(screen.getByText('Open')).toHaveClass('MuiTypography-body2');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('StatCard — action wrapper', () => {
  it('wraps the body in a router link when `to` is set', () => {
    render(
      <MemoryRouter>
        <StatCard label="Go" value="1" to="/detail" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/detail');
  });

  it('wraps the body in a clickable action area when onClick is set', async () => {
    const onClick = vi.fn();
    render(<StatCard label="Tap" value="1" onClick={onClick} cardVariant="elevation" />);
    await userEvent.click(screen.getByText('Tap'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
