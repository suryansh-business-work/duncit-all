import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Fieldset } from '../src/Fieldset';

describe('Fieldset', () => {
  it('renders the legend, hint, and children', () => {
    render(
      <Fieldset legend="Location" hint="Used to power the map">
        <div>child content</div>
      </Fieldset>,
    );
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Used to power the map')).toBeInTheDocument();
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('omits the hint element when no hint is given', () => {
    const { container } = render(
      <Fieldset legend="Location">
        <div>child content</div>
      </Fieldset>,
    );
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(container.querySelector('.MuiFormHelperText-root')).not.toBeInTheDocument();
  });
});
