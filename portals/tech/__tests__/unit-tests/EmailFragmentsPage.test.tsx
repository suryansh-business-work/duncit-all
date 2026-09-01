import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { Fragment, FragmentTemplateRef } from '../../src/pages/email-fragments-page/queries';

type Fragments = ReturnType<
  typeof import('../../src/pages/email-fragments-page/useEmailFragments').useEmailFragments
>;
const m = vi.hoisted(() => ({ hook: {} as Fragments }));
vi.mock('../../src/pages/email-fragments-page/useEmailFragments', () => ({
  useEmailFragments: () => m.hook,
}));
vi.mock('../../src/components/FillViewport', () => ({
  default: (p: { children: React.ReactNode }) => <div>{p.children}</div>,
}));
vi.mock('../../src/pages/email-fragments-page/FragmentEditorPanel', () => ({
  default: (p: { templates: FragmentTemplateRef[] }) => (
    <div data-testid="panel">wraps:{p.templates.length}</div>
  ),
}));

import EmailFragmentsPage from '../../src/pages/email-fragments-page/EmailFragmentsPage';

const fragment = (key: string, name: string, over: Partial<Fragment> = {}): Fragment => ({
  fragment_id: key,
  key,
  name,
  is_system: true,
  header_mjml: '',
  footer_mjml: '',
  is_active: true,
  ...over,
});

const ref = (slug: string): FragmentTemplateRef => ({
  template_id: slug,
  slug,
  name: slug,
  fragment_key: 'transactional',
  is_active: true,
});

const transactional = fragment('transactional', 'Transactional');
const weekend = fragment('weekend', 'Weekend banner', { is_active: false });

const baseHook = (over: Partial<Fragments> = {}): Fragments =>
  ({
    list: [transactional, weekend],
    create: vi.fn(),
    remove: vi.fn(),
    loading: false,
    hasData: true,
    selected: 'transactional',
    setSelected: vi.fn(),
    draft: transactional,
    setDraft: vi.fn(),
    templatesByFragment: new Map([['transactional', [ref('welcome'), ref('password-reset')]]]),
    previewHtml: '',
    previewErrors: [],
    previewLoading: false,
    dirty: false,
    busy: false,
    snack: null,
    setSnack: vi.fn(),
    save: vi.fn(),
    reset: vi.fn(),
    ...over,
  }) as unknown as Fragments;

const render = () =>
  rtlRender(
    <MemoryRouter>
      <EmailFragmentsPage />
    </MemoryRouter>
  );

beforeEach(() => {
  m.hook = baseHook();
});

describe('EmailFragmentsPage', () => {
  it('shows a spinner while loading with no data', () => {
    m.hook = baseHook({ loading: true, hasData: false });
    render();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  /**
   * The number beside a fragment is how many templates it wraps — the thing
   * that says whether editing this header touches one internal email or every
   * receipt the platform sends.
   */
  it('counts the templates each fragment is wrapped around, zeroes included', () => {
    render();
    expect(screen.getByLabelText('2 templates use this header and footer')).toBeInTheDocument();
    expect(screen.getByLabelText('0 templates use this header and footer')).toBeInTheDocument();
  });

  it('hands the selected fragment’s templates to the editor', () => {
    render();
    expect(screen.getByText('wraps:2')).toBeInTheDocument();
  });

  it('passes an empty list for a fragment nothing consumes', () => {
    m.hook = baseHook({ draft: weekend, selected: 'weekend' });
    render();
    expect(screen.getByText('wraps:0')).toBeInTheDocument();
  });

  it('shows the placeholder when nothing is selected', () => {
    m.hook = baseHook({ draft: null, selected: null });
    render();
    expect(screen.getByText('Select a category from the left.')).toBeInTheDocument();
  });

  it('adds a fragment from the dialog', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    m.hook = baseHook({ create });
    render();

    fireEvent.click(screen.getByRole('button', { name: 'New fragment' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Weekend banner' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(create).toHaveBeenCalledWith('Weekend banner');
  });

  it('renders the snack and closes it', () => {
    const setSnack = vi.fn();
    m.hook = baseHook({ snack: { kind: 'error', msg: 'Boom' }, setSnack });
    render();
    expect(screen.getByText('Boom')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(setSnack).toHaveBeenCalledWith(null);
  });
});
