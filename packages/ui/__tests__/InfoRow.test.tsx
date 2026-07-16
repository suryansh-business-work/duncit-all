import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoRow } from '../src/InfoRow';

describe('InfoRow', () => {
  it('renders the stacked variant by default (caption label over body2 value)', () => {
    render(<InfoRow label="Name" value="Acme" />);
    const label = screen.getByText('Name');
    expect(label).toHaveClass('MuiTypography-caption');
    expect(screen.getByText('Acme')).toHaveClass('MuiTypography-body2');
  });

  it('honors stacked overrides for label variant/weight and custom sx', () => {
    render(
      <InfoRow
        variant="stacked"
        label="Score"
        value="99"
        labelVariant="overline"
        labelWeight={500}
        valueWeight={800}
        sx={{ mt: 1 }}
        labelSx={{ color: 'red' }}
        valueSx={{ fontStyle: 'italic' }}
      />,
    );
    expect(screen.getByText('Score')).toHaveClass('MuiTypography-overline');
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('renders the inline variant with default body2 label and 96px min width', () => {
    render(<InfoRow variant="inline" label="Phone" value="123" />);
    expect(screen.getByText('Phone')).toHaveClass('MuiTypography-body2');
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('applies inline overrides (labelWidth, labelVariant, weights)', () => {
    render(
      <InfoRow
        variant="inline"
        label="City"
        value="Pune"
        labelWidth={140}
        labelVariant="caption"
        labelWeight={700}
        valueWeight={400}
        labelSx={{ opacity: 0.5 }}
        valueSx={{ opacity: 0.9 }}
      />,
    );
    expect(screen.getByText('City')).toHaveClass('MuiTypography-caption');
    expect(screen.getByText('Pune')).toBeInTheDocument();
  });

  it('renders the split variant without bold (text.secondary label)', () => {
    render(<InfoRow variant="split" label="Subtotal" value="₹100" />);
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('₹100')).toBeInTheDocument();
  });

  it('renders the split variant with bold + boldColor (900 weight accent value)', () => {
    render(
      <InfoRow variant="split" label="Total" value="₹500" bold boldColor="#00f" />,
    );
    const value = screen.getByText('₹500');
    expect(value).toHaveStyle({ fontWeight: '900' });
    expect(value).toHaveStyle({ color: '#00f' });
  });

  it('renders bold split without boldColor (no color override)', () => {
    render(<InfoRow variant="split" label="Grand" value="₹9" bold />);
    expect(screen.getByText('Grand')).toBeInTheDocument();
  });
});
