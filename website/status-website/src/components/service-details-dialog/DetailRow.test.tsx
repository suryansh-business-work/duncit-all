import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailRow, SectionTitle, StatusPill } from './DetailRow';

describe('DetailRow', () => {
  it('wraps a plain string value in a Typography', () => {
    render(<DetailRow label="Version" value="1.2.3" />);
    expect(screen.getByText('Version')).toBeTruthy();
    expect(screen.getByText('1.2.3')).toBeTruthy();
  });

  it('renders a node value verbatim', () => {
    render(<DetailRow label="Status" value={<span>custom-node</span>} />);
    expect(screen.getByText('custom-node')).toBeTruthy();
  });
});

describe('StatusPill', () => {
  it('renders success and error variants', () => {
    const { rerender } = render(<StatusPill ok label="up" />);
    expect(screen.getByText('up')).toBeTruthy();
    rerender(<StatusPill ok={false} label="down" />);
    expect(screen.getByText('down')).toBeTruthy();
  });
});

describe('SectionTitle', () => {
  it('renders its children', () => {
    render(<SectionTitle>Endpoint</SectionTitle>);
    expect(screen.getByText('Endpoint')).toBeTruthy();
  });
});
