import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CitySelect } from '../../../pages/discover/CitySelect';
import { cityFixture, renderWithProviders } from '../../test-utils';

const cities = [cityFixture({ id: 'c1', name: 'Delhi', slug: 'delhi' }), cityFixture({ id: 'c2', name: 'Pune', slug: 'pune' })];

describe('CitySelect', () => {
  it('shows the picked city', () => {
    renderWithProviders(<CitySelect cities={cities} value="pune" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'City' })).toHaveTextContent('Pune');
  });

  it('shows Everywhere for a slug that is not one of the cities', () => {
    renderWithProviders(<CitySelect cities={cities} value="atlantis" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'City' })).toHaveTextContent('Everywhere');
  });

  it('offers Everywhere first, then every city, and reports the slug picked', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(<CitySelect cities={cities} value="" onChange={onChange} />);
    await user.click(screen.getByRole('combobox', { name: 'City' }));
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Everywhere', 'Delhi', 'Pune']);

    await user.click(options[1]);
    expect(onChange).toHaveBeenCalledWith('delhi');
  });

  it('reports a blank slug when Everywhere is picked again', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(<CitySelect cities={cities} value="delhi" onChange={onChange} />);
    await user.click(screen.getByRole('combobox', { name: 'City' }));
    await user.click(screen.getByRole('option', { name: 'Everywhere' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
