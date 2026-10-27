import { fireEvent, screen, waitFor } from '@testing-library/react';
import { createTranslator } from '@duncit/i18n';
import { describe, expect, it } from 'vitest';
import { WEB_FALLBACK } from '../../../../shared/i18n';
import { SearchForm, makeSearchSchema } from '../../../components/search-form';
import { renderWithProviders } from '../../test-utils';

const results = { path: '/search', element: <p>Results page</p> };

const renderForm = (props: { initial?: string; citySlug?: string | null } = {}) =>
  renderWithProviders(<SearchForm {...props} />, { path: '/', routes: [results] });

describe('makeSearchSchema', () => {
  const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });
  const schema = makeSearchSchema(t);

  it('trims the query and allows a blank one', () => {
    expect(schema.parse({ q: '  jazz  ' })).toEqual({ q: 'jazz' });
    expect(schema.parse({ q: '' })).toEqual({ q: '' });
  });

  it('refuses a paragraph', () => {
    const result = schema.safeParse({ q: 'x'.repeat(121) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Keep this to 120 characters or fewer');
  });
});

describe('SearchForm', () => {
  it('is a search landmark with a labelled search box', () => {
    renderForm({ initial: 'run club' });
    const box = screen.getByRole('searchbox', { name: 'Search events' });
    expect(screen.getByRole('search')).toContainElement(box);
    expect(box).toHaveAttribute('placeholder', 'What are you looking for?');
    expect(box).toHaveValue('run club');
  });

  it('goes to the results for what was typed', async () => {
    const { user, router } = renderForm();
    await user.type(screen.getByRole('searchbox', { name: 'Search events' }), '  jazz & blues ');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/search'));
    expect(router.state.location.search).toBe('?q=jazz%20%26%20blues');
    expect(screen.getByText('Results page')).toBeInTheDocument();
  });

  it('keeps the search inside the city it was started from', async () => {
    const { user, router } = renderForm({ citySlug: 'new delhi' });
    await user.type(screen.getByRole('searchbox', { name: 'Search events' }), 'food{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/search'));
    expect(router.state.location.search).toBe('?q=food&city=new%20delhi');
  });

  it('searches everything for a blank box', async () => {
    const { user, router } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/search'));
    expect(router.state.location.search).toBe('?q=');
  });

  it('stays put and says why when the query is too long', async () => {
    const { user, router } = renderForm();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search events' }), { target: { value: 'x'.repeat(121) } });
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Keep this to 120 characters or fewer')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
