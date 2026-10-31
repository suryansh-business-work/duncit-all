import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route, useLocation } from 'react-router';
import { TAB_PARAM } from '@duncit/tabs';
import { renderWithProviders } from '../testkit';
import {
  makeLook,
  occasionThemeErrorMock,
  occasionThemeMock,
  saveOccasionThemeErrorMock,
  saveOccasionThemeMock,
  setOccasionLiveErrorMock,
  setOccasionLiveMock,
} from '../mocks/occasions-themes.mock';

const dialogsMock = vi.hoisted(() => ({ confirm: vi.fn(), notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => dialogsMock.confirm,
  notify: dialogsMock.notify,
}));

interface StubProps {
  theme: { name: string } | null;
  serverError: string | null;
  onSubmit: (values: { name: string }, apply: boolean) => Promise<void>;
  onCancel: (dirty: boolean) => Promise<void>;
}

// The form has its own suite; here it only hands the page what a person typed and asked for.
vi.mock('../../src/pages/occasions-page/occasion-theme-form', () => ({
  toThemeInput: (values: { name: string }) => ({ name: values.name.trim() }),
  OccasionThemeForm: ({ theme, serverError, onSubmit, onCancel }: StubProps) => (
    <div data-testid="theme-form">
      <span data-testid="form-theme">{theme?.name ?? 'none'}</span>
      {serverError && <span role="alert">{serverError}</span>}
      <button type="button" onClick={() => onSubmit({ name: '  Diwali  ' }, false)}>
        save
      </button>
      <button type="button" onClick={() => onSubmit({ name: '  Diwali  ' }, true)}>
        save and apply
      </button>
      <button type="button" onClick={() => onCancel(false)}>
        cancel clean
      </button>
      <button type="button" onClick={() => onCancel(true)}>
        cancel dirty
      </button>
    </div>
  ),
}));

import OccasionThemeEditorPage from '../../src/pages/occasions-page/editor';

const GALLERY = `?${TAB_PARAM}=themes`;
const LIVE = `?${TAB_PARAM}=live`;

function Landed() {
  const location = useLocation();
  return <div data-testid="landed">{`${location.pathname}${location.search}`}</div>;
}

const routes = (
  <>
    <Route path="/occasions/themes/new" element={<OccasionThemeEditorPage />} />
    <Route path="/occasions/themes/:key" element={<OccasionThemeEditorPage />} />
    <Route path="/occasions" element={<Landed />} />
  </>
);

const renderAt = (path: string, mocks: MockedResponse[]) =>
  renderWithProviders(<></>, { initialEntries: [path], routes, mocks });

const diwali = makeLook();

afterEach(() => {
  vi.clearAllMocks();
});

describe('OccasionThemeEditorPage — a new look', () => {
  it('titles itself New look, starts the form empty, saves without a key and returns to the gallery', async () => {
    renderAt('/occasions/themes/new', [saveOccasionThemeMock(null, { name: 'Diwali' }, diwali)]);
    expect(screen.getByRole('heading', { name: 'New look' })).toBeInTheDocument();
    expect(screen.getByText('Occasions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to looks' })).toHaveAttribute('href', `/occasions${GALLERY}`);
    expect(screen.getByTestId('form-theme')).toHaveTextContent('none');

    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(await screen.findByTestId('landed')).toHaveTextContent(`/occasions${GALLERY}`);
    expect(dialogsMock.notify).toHaveBeenCalledWith('Diwali saved.', 'success');
    expect(dialogsMock.confirm).not.toHaveBeenCalled();
  });

  it('keeps the person on the form with the server’s reason when the save fails', async () => {
    renderAt('/occasions/themes/new', [saveOccasionThemeErrorMock(null, { name: 'Diwali' }, 'Name already used')]);
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Name already used');
    expect(dialogsMock.notify).toHaveBeenCalledWith('Name already used', 'error');
    expect(screen.queryByTestId('landed')).not.toBeInTheDocument();
  });

  it('asks before saving and applying, and saves nothing when the person backs out', async () => {
    dialogsMock.confirm.mockResolvedValue(false);
    const save = saveOccasionThemeMock(null, { name: 'Diwali' }, diwali);
    const resultFn = vi.fn(() => save.result as { data: Record<string, unknown> });
    renderAt('/occasions/themes/new', [{ ...save, result: resultFn }]);
    fireEvent.click(screen.getByRole('button', { name: 'save and apply' }));
    await waitFor(() =>
      expect(dialogsMock.confirm).toHaveBeenCalledWith({
        title: 'Change every Duncit app?',
        message: 'Every Duncit app wears Diwali the next time it loads, until you change it.',
        confirmLabel: 'Apply',
      }),
    );
    expect(resultFn).not.toHaveBeenCalled();
    expect(screen.getByTestId('theme-form')).toBeInTheDocument();
  });
});

describe('OccasionThemeEditorPage — an existing look', () => {
  it('waits for the look, titles itself with its name and hands the look to the form', async () => {
    renderAt('/occasions/themes/diwali', [occasionThemeMock('diwali', diwali)]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Diwali' })).toBeInTheDocument();
    expect(screen.getByTestId('form-theme')).toHaveTextContent('Diwali');
  });

  it('saves under its key, pins it live once confirmed and opens the Live tab', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    renderAt('/occasions/themes/diwali', [
      occasionThemeMock('diwali', diwali),
      saveOccasionThemeMock('diwali', { name: 'Diwali' }, diwali),
      setOccasionLiveMock('diwali'),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'save and apply' }));
    expect(await screen.findByTestId('landed')).toHaveTextContent(`/occasions${LIVE}`);
    expect(dialogsMock.notify).toHaveBeenCalledWith('Diwali saved.', 'success');
    expect(dialogsMock.notify).toHaveBeenCalledWith('Live look updated. Apps pick it up on their next load.', 'success');
  });

  it('goes to the gallery when the look saved but the switch to live failed, having said why', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    renderAt('/occasions/themes/diwali', [
      occasionThemeMock('diwali', diwali),
      saveOccasionThemeMock('diwali', { name: 'Diwali' }, diwali),
      setOccasionLiveErrorMock('diwali', 'Look is archived'),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'save and apply' }));
    expect(await screen.findByTestId('landed')).toHaveTextContent(`/occasions${GALLERY}`);
    expect(dialogsMock.notify).toHaveBeenCalledWith('Look is archived', 'error');
  });

  it('does not try to pin a look the server did not hand back', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const save = saveOccasionThemeMock('diwali', { name: 'Diwali' }, diwali);
    renderAt('/occasions/themes/diwali', [
      occasionThemeMock('diwali', diwali),
      { ...save, result: { data: { saveOccasionTheme: null } } },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'save and apply' }));
    expect(await screen.findByTestId('landed')).toHaveTextContent(`/occasions${GALLERY}`);
    expect(dialogsMock.notify).toHaveBeenCalledTimes(1);
  });

  it('says the look does not exist when the server has none, under the generic title', async () => {
    renderAt('/occasions/themes/gone', [occasionThemeMock('gone', null)]);
    expect(await screen.findByText('This look does not exist. It may have been deleted.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit look' })).toBeInTheDocument();
    expect(screen.queryByTestId('theme-form')).not.toBeInTheDocument();
  });

  it('shows why the look could not be read', async () => {
    renderAt('/occasions/themes/diwali', [occasionThemeErrorMock('diwali', 'Not allowed')]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Not allowed');
    expect(screen.queryByTestId('theme-form')).not.toBeInTheDocument();
  });
});

describe('OccasionThemeEditorPage — leaving', () => {
  it('leaves an untouched form straight away', async () => {
    renderAt('/occasions/themes/new', []);
    fireEvent.click(screen.getByRole('button', { name: 'cancel clean' }));
    expect(await screen.findByTestId('landed')).toHaveTextContent(`/occasions${GALLERY}`);
    expect(dialogsMock.confirm).not.toHaveBeenCalled();
  });

  it('asks before throwing changes away, and stays when the person keeps them', async () => {
    dialogsMock.confirm.mockResolvedValue(false);
    renderAt('/occasions/themes/new', []);
    fireEvent.click(screen.getByRole('button', { name: 'cancel dirty' }));
    await waitFor(() =>
      expect(dialogsMock.confirm).toHaveBeenCalledWith({
        title: 'Discard your changes?',
        message: 'Your changes to this look are not saved.',
        confirmLabel: 'Discard',
        destructive: true,
      }),
    );
    expect(screen.getByTestId('theme-form')).toBeInTheDocument();
  });

  it('leaves once the person agrees to discard', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    renderAt('/occasions/themes/new', []);
    fireEvent.click(screen.getByRole('button', { name: 'cancel dirty' }));
    expect(await screen.findByTestId('landed')).toHaveTextContent(`/occasions${GALLERY}`);
  });
});
