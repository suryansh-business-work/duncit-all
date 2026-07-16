import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  BreadcrumbProvider,
  useBreadcrumbOverride,
  useSetBreadcrumbs,
} from '../src/BreadcrumbContext';
import type { Crumb } from '../src/types';

function Reader() {
  const override = useBreadcrumbOverride();
  return <div data-testid="ov">{override ? override.map((c) => c.label).join(',') : 'none'}</div>;
}

function Setter({ crumbs }: Readonly<{ crumbs: Crumb[] | null | undefined }>) {
  useSetBreadcrumbs(crumbs);
  return null;
}

describe('useBreadcrumbOverride', () => {
  it('returns null when rendered outside a provider', () => {
    render(<Reader />);
    expect(screen.getByTestId('ov')).toHaveTextContent('none');
  });

  it('returns null initially inside a provider', () => {
    render(
      <BreadcrumbProvider>
        <Reader />
      </BreadcrumbProvider>,
    );
    expect(screen.getByTestId('ov')).toHaveTextContent('none');
  });
});

describe('useSetBreadcrumbs', () => {
  it('is a no-op outside a provider (does not throw)', () => {
    expect(() => render(<Setter crumbs={[{ label: 'X' }]} />)).not.toThrow();
  });

  it('sets the override trail inside a provider', () => {
    render(
      <BreadcrumbProvider>
        <Setter crumbs={[{ label: 'Acme', to: '/a' }, { label: 'Detail' }]} />
        <Reader />
      </BreadcrumbProvider>,
    );
    expect(screen.getByTestId('ov')).toHaveTextContent('Acme,Detail');
  });

  it('treats null crumbs as clearing the override', () => {
    render(
      <BreadcrumbProvider>
        <Setter crumbs={null} />
        <Reader />
      </BreadcrumbProvider>,
    );
    expect(screen.getByTestId('ov')).toHaveTextContent('none');
  });

  it('treats an empty crumb array as clearing the override', () => {
    render(
      <BreadcrumbProvider>
        <Setter crumbs={[]} />
        <Reader />
      </BreadcrumbProvider>,
    );
    expect(screen.getByTestId('ov')).toHaveTextContent('none');
  });

  it('clears the override when the setting page unmounts', () => {
    function Host({ show }: Readonly<{ show: boolean }>) {
      return (
        <BreadcrumbProvider>
          {show ? <Setter crumbs={[{ label: 'Temp' }]} /> : null}
          <Reader />
        </BreadcrumbProvider>
      );
    }
    const { rerender } = render(<Host show />);
    expect(screen.getByTestId('ov')).toHaveTextContent('Temp');
    rerender(<Host show={false} />);
    expect(screen.getByTestId('ov')).toHaveTextContent('none');
  });
});
