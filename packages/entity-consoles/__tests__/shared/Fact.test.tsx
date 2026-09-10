import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Fact from '../../src/shared/Fact';

describe('Fact', () => {
  it('renders the label and its value', () => {
    render(<Fact label="Owner email" value="rohit@thirdwave.example" />);
    expect(screen.getByText('Owner email')).toBeInTheDocument();
    expect(screen.getByText('rohit@thirdwave.example')).toBeInTheDocument();
  });

  it('shows an em-dash for an empty value rather than a blank gap', () => {
    // A blank cell reads as "the page is broken"; an em-dash reads as "not set".
    render(<Fact label="GSTIN" value="" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('bolds the value only when asked, for the summary strip', () => {
    const plain = render(<Fact label="City" value="Bengaluru" />);
    expect(plain.getByText('Bengaluru')).toHaveStyle({ fontWeight: '400' });
    plain.unmount();

    render(<Fact strong label="Host ID" value="HOST-000317" />);
    expect(screen.getByText('HOST-000317')).toHaveStyle({ fontWeight: '700' });
  });
});
