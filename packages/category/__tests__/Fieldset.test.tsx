import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Fieldset } from '../src/Fieldset';

describe('Fieldset', () => {
  it('renders the legend and children', () => {
    render(
      <Fieldset legend="Category">
        <div>child content</div>
      </Fieldset>,
    );
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('does not render a hint when none is given', () => {
    render(
      <Fieldset legend="Category">
        <div>child content</div>
      </Fieldset>,
    );
    expect(screen.queryByText(/maps from/i)).not.toBeInTheDocument();
  });

  it('renders the hint when given', () => {
    render(
      <Fieldset legend="Category" hint="Drives what shows in search">
        <div>child content</div>
      </Fieldset>,
    );
    expect(screen.getByText('Drives what shows in search')).toBeInTheDocument();
  });
});
