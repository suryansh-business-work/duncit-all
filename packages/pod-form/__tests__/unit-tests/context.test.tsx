import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PodFormDataProvider, usePodFormData } from '../../src/context';
import { makeData } from './helpers';

function Consumer() {
  const data = usePodFormData();
  return <span>clubs:{data.clubs.length}</span>;
}

describe('PodFormDataProvider / usePodFormData', () => {
  it('exposes the injected data to consumers', () => {
    render(
      <PodFormDataProvider value={makeData({ clubs: [{ id: 'c1' }, { id: 'c2' }] })}>
        <Consumer />
      </PodFormDataProvider>,
    );
    expect(screen.getByText('clubs:2')).toBeInTheDocument();
  });

  it('throws when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Consumer />)).toThrow('usePodFormData must be used within <PodForm>');
    spy.mockRestore();
  });
});
