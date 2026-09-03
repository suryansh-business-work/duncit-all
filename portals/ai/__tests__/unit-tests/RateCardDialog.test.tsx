import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notify } from '@duncit/dialogs';
import RateCardDialog from '../../src/pages/openai-dashboard/RateCardDialog';
import {
  UPSERT_OPENAI_MODEL_PRICE,
  type ModelPrice,
} from '../../src/pages/openai-dashboard/queries';
import { renderWithProviders } from '../testkit';

vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notify: vi.fn(),
}));

/**
 * Editing a rate changes what FUTURE calls cost — rows already written keep the
 * cost they were priced at, so correcting a rate never rewrites history. The
 * cases here are about the two states the dialog has (adding versus editing)
 * and about a refused save being reported rather than swallowed.
 */
const price: ModelPrice = {
  id: 'p-1',
  model: 'gpt-4o-mini',
  input_per_1m: 0.15,
  output_per_1m: 0.6,
  updated_at: '2026-09-01T10:00:00.000Z',
};

const upsertMock = (
  input: { model: string; input_per_1m: number; output_per_1m: number },
  fail = false,
): MockedResponse => ({
  request: { query: UPSERT_OPENAI_MODEL_PRICE, variables: { input } },
  ...(fail
    ? { error: new Error('rate refused') }
    : {
        result: {
          data: {
            upsertOpenAiModelPrice: {
              __typename: 'OpenAiModelPrice',
              id: 'p-1',
              ...input,
              updated_at: '2026-09-02T10:00:00.000Z',
            },
          },
        },
      }),
  maxUsageCount: 5,
});

beforeEach(() => {
  vi.mocked(notify).mockClear();
});

describe('RateCardDialog', () => {
  it('stays shut while nothing is being edited', () => {
    renderWithProviders(
      <RateCardDialog price={undefined} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    // `undefined` means closed; `null` means adding. They are different states.
    expect(screen.queryByText('Add a model rate')).not.toBeInTheDocument();
  });

  it('opens ready to add a model, with the name editable', () => {
    renderWithProviders(<RateCardDialog price={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByText('Add a model rate')).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).not.toBeDisabled();
  });

  it('opens on an existing rate with the model locked', () => {
    renderWithProviders(<RateCardDialog price={price} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByText('Rate for gpt-4o-mini')).toBeInTheDocument();
    // Renaming a model here would orphan every row already priced under it.
    expect(screen.getByLabelText('Model')).toBeDisabled();
    expect(screen.getByDisplayValue('0.15')).toBeInTheDocument();
  });

  it('saves a corrected rate, tells the caller, and closes', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderWithProviders(<RateCardDialog price={price} onClose={onClose} onSaved={onSaved} />, {
      mocks: [upsertMock({ model: 'gpt-4o-mini', input_per_1m: 0.2, output_per_1m: 0.6 })],
    });

    fireEvent.change(screen.getByLabelText(/Input — USD per 1M tokens/i), {
      target: { value: '0.2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith('Rate saved for gpt-4o-mini', 'success'),
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reports a refused save and stays open', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderWithProviders(<RateCardDialog price={price} onClose={onClose} onSaved={onSaved} />, {
      mocks: [
        upsertMock({ model: 'gpt-4o-mini', input_per_1m: 0.15, output_per_1m: 0.6 }, true),
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.anything(), 'error'));
    // A dialog that closed on failure would lose whatever was typed.
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('refuses an empty model name rather than sending it', async () => {
    renderWithProviders(<RateCardDialog price={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Model is required')).toBeInTheDocument();
    expect(notify).not.toHaveBeenCalled();
  });

  it('closes without saving from Cancel', () => {
    const onClose = vi.fn();
    renderWithProviders(<RateCardDialog price={price} onClose={onClose} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });
});
