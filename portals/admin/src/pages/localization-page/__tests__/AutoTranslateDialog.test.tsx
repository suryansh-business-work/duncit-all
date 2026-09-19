import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import AutoTranslateDialog from '../AutoTranslateDialog';
import {
  AUTO_TRANSLATE_JOB,
  AUTO_TRANSLATE_PENDING,
  CANCEL_AUTO_TRANSLATE,
  START_AUTO_TRANSLATE,
  type AutoTranslateJobRow,
  type LocaleRow,
} from '../queries';

const HINDI: LocaleRow = {
  id: 'l2',
  code: 'hi-IN',
  label: 'हिन्दी',
  english_label: 'Hindi (India)',
  is_rtl: false,
  is_active: true,
  is_default: false,
  sort_order: 1,
};

const job = (over: Partial<AutoTranslateJobRow> = {}) => ({
  __typename: 'AutoTranslateJob',
  id: 'job-1',
  locale: 'hi-IN',
  source_locale: 'en-IN',
  status: 'RUNNING',
  replace_existing: false,
  total_keys: 900,
  done_keys: 30,
  translated_keys: 30,
  failed_keys: 0,
  ai_model: '',
  error: '',
  started_at: '2026-09-18T10:00:00.000Z',
  finished_at: null,
  ...over,
});

const jobMock = (row: unknown): MockedResponse => ({
  request: { query: AUTO_TRANSLATE_JOB, variables: { locale: 'hi-IN' } },
  result: { data: { autoTranslateJob: row } },
});

const pendingMock = (replaceExisting: boolean, keys: number): MockedResponse => ({
  request: { query: AUTO_TRANSLATE_PENDING, variables: { locale: 'hi-IN', replace_existing: replaceExisting } },
  result: { data: { autoTranslatePending: keys } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

/** Mounts the dialog the way LocalesPage does: open while a locale is picked, closed by clearing it. */
function Harness({ locale, onFinished }: Readonly<{ locale: LocaleRow; onFinished: () => void }>) {
  const [target, setTarget] = useState<LocaleRow | null>(locale);
  return (
    <AutoTranslateDialog open={!!target} locale={target} onClose={() => setTarget(null)} onFinished={onFinished} />
  );
}

const renderDialog = (mocks: MockedResponse[], locale: LocaleRow = HINDI, onFinished = vi.fn()) => {
  renderWithProviders(<Harness locale={locale} onFinished={onFinished} />, { mocks });
  return onFinished;
};

describe('AutoTranslateDialog — the default language', () => {
  it('explains that the source language is not translated and offers no run', () => {
    renderDialog([], { ...HINDI, code: 'en-IN', label: 'English', is_default: true });

    expect(screen.getByText('Auto-translate English')).toBeInTheDocument();
    expect(
      screen.getByText('This is the default language — it is the source everything else is translated from.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start translating' })).toBeNull();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});

describe('AutoTranslateDialog — starting a run', () => {
  it('counts what each scope would send, then starts the chosen one and shows its progress', async () => {
    const started = vi.fn();
    renderDialog([
      jobMock(null),
      pendingMock(false, 120),
      pendingMock(true, 900),
      {
        request: { query: START_AUTO_TRANSLATE, variables: { locale: 'hi-IN', replace_existing: true } },
        result: () => {
          started();
          return { data: { startAutoTranslate: job({ done_keys: 0, translated_keys: 0, replace_existing: true }) } };
        },
      },
      jobMock(job({ replace_existing: true })),
    ]);

    expect(await screen.findByText('120 key(s) will be sent')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Only the keys with no text yet' })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'Every key, replacing what is there' }));
    expect(await screen.findByText('900 key(s) will be sent')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start translating' }));

    expect(await screen.findByText('30 of 900 keys')).toBeInTheDocument();
    expect(started).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('will not start when every key already has text', async () => {
    renderDialog([jobMock(null), pendingMock(false, 0)]);

    expect(
      await screen.findByText('Nothing to send — every key already has text in this language.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start translating' })).toBeDisabled();
  });

  it('shows why a run could not be started', async () => {
    renderDialog([
      jobMock(null),
      pendingMock(false, 120),
      {
        request: { query: START_AUTO_TRANSLATE, variables: { locale: 'hi-IN', replace_existing: false } },
        error: new Error('OpenAI is not configured'),
      },
    ]);

    await screen.findByText('120 key(s) will be sent');
    fireEvent.click(screen.getByRole('button', { name: 'Start translating' }));

    expect(await screen.findByText('OpenAI is not configured')).toBeInTheDocument();
  });

  it('ignores Start once the dialog has been closed and is fading out', async () => {
    const started = vi.fn();
    renderDialog([
      jobMock(null),
      pendingMock(false, 120),
      {
        request: { query: START_AUTO_TRANSLATE, variables: () => true },
        maxUsageCount: 2,
        result: () => {
          started();
          return { data: { startAutoTranslate: job() } };
        },
      },
    ]);

    await screen.findByText('120 key(s) will be sent');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByText('Start translating', { selector: 'button' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(started).not.toHaveBeenCalled();
  });
});

describe('AutoTranslateDialog — a run in progress', () => {
  it('stops the run and reports what it managed first', async () => {
    const onFinished = renderDialog([
      jobMock(job()),
      pendingMock(false, 870),
      {
        request: { query: CANCEL_AUTO_TRANSLATE, variables: { id: 'job-1' } },
        result: { data: { cancelAutoTranslate: job({ status: 'CANCELLED' }) } },
      },
      jobMock(job({ status: 'CANCELLED' })),
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }));

    expect(await screen.findByText('Stopped — 30 keys were translated first')).toBeInTheDocument();
    expect(onFinished).toHaveBeenCalled();
    expect(screen.getByText('The apps and portals show the new text within a minute.')).toBeInTheDocument();
  });

  it('shows why the run could not be stopped', async () => {
    renderDialog([
      jobMock(job()),
      pendingMock(false, 870),
      { request: { query: CANCEL_AUTO_TRANSLATE, variables: { id: 'job-1' } }, error: new Error('Run already finished') },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }));

    expect(await screen.findByText('Run already finished')).toBeInTheDocument();
  });

  it('shows an empty bar for a run that has not counted its keys yet', async () => {
    renderDialog([jobMock(job({ total_keys: 0, done_keys: 0 })), pendingMock(false, 0)]);

    expect(await screen.findByText('0 of 0 keys')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('AutoTranslateDialog — a finished run', () => {
  it('summarises a successful run with its unusable keys and the model that answered', async () => {
    const onFinished = renderDialog([
      jobMock(job({ status: 'SUCCEEDED', translated_keys: 860, failed_keys: 4, ai_model: 'gpt-4o-mini' })),
      pendingMock(false, 4),
    ]);

    expect(await screen.findByText('Finished — 860 keys translated')).toBeInTheDocument();
    expect(
      screen.getByText('4 key(s) came back unusable and were left untranslated. Run it again to retry just those.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Model: gpt-4o-mini')).toBeInTheDocument();
    expect(onFinished).toHaveBeenCalled();
  });

  it('reports a failed run with the error it gave, and nothing it did not do', async () => {
    renderDialog([
      jobMock(job({ status: 'FAILED', translated_keys: 0, error: 'Rate limit reached' })),
      pendingMock(false, 900),
    ]);

    expect(await screen.findByText('The run failed')).toBeInTheDocument();
    expect(screen.getByText('Rate limit reached')).toBeInTheDocument();
    expect(screen.queryByText('The apps and portals show the new text within a minute.')).toBeNull();
    expect(screen.queryByText(/^Model:/)).toBeNull();
  });

  it('shows no error line for a failed run that recorded none', async () => {
    renderDialog([jobMock(job({ status: 'FAILED', translated_keys: 0, error: '' })), pendingMock(false, 900)]);

    expect(await screen.findByText('The run failed')).toBeInTheDocument();
    expect(screen.queryByText('Rate limit reached')).toBeNull();
  });
});
