import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { downloadBase64File } from '@duncit/utils';
import ReportActions from '../../src/pages/calculators/pod-profit/saved/ReportActions';
import { renderWithProviders } from '../testkit';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { PDF_BASE64, emailPodCalculatorMock, podCalculatorPdfMock } from '../mocks/pod-calculator.mock';

// The real helper builds an <a download> and clicks it, which jsdom cannot
// follow — stub only that one export and keep the rest of @duncit/utils real.
vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  downloadBase64File: vi.fn(),
}));

const CALC_ID = '66f1a2b3c4d5e6f708192a01';

interface Setup {
  mocks?: MockedResponse[];
  name?: string;
  disabled?: boolean;
}

const renderActions = ({ mocks = [], name = 'Diwali weekend: Pods #1', disabled = false }: Setup = {}) =>
  renderWithProviders(<ReportActions calculatorId={CALC_ID} calculatorName={name} disabled={disabled} />, { mocks });

beforeEach(() => {
  vi.mocked(downloadBase64File).mockClear();
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('ReportActions — download', () => {
  it('saves the server-rendered PDF under a slug of the calculation name', async () => {
    renderActions({ mocks: [podCalculatorPdfMock(CALC_ID, { delay: 20 })] });
    const download = screen.getByRole('button', { name: 'Download PDF' });
    fireEvent.click(download);
    // In flight, a second click would ask for the same file twice.
    await waitFor(() => expect(download).toBeDisabled());

    await waitFor(() =>
      expect(downloadBase64File).toHaveBeenCalledWith(PDF_BASE64, 'Diwali-weekend-Pods-1-report.pdf', 'application/pdf'),
    );
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('falls back to a generic file name when the name has no letters to keep', async () => {
    renderActions({ mocks: [podCalculatorPdfMock(CALC_ID)], name: '🎉 ✨' });
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() =>
      expect(downloadBase64File).toHaveBeenCalledWith(PDF_BASE64, 'pod-profit-report.pdf', 'application/pdf'),
    );
  });

  it('reports a failed render instead of saving anything', async () => {
    renderActions({ mocks: [podCalculatorPdfMock(CALC_ID, { fail: 'Calculation not found' })] });
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Calculation not found'));
    expect(downloadBase64File).not.toHaveBeenCalled();
  });

  it('holds both exports back while there are unsaved edits', () => {
    renderActions({ name: 'Diwali weekend', disabled: true });
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Email report' })).toBeDisabled();
    expect(screen.getAllByLabelText('Save your changes first — the report is built from what is stored.')).toHaveLength(2);
  });
});

describe('EmailReportDialog', () => {
  const openDialog = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Email report' }));
    return screen.getByRole('dialog', { name: 'Email report' });
  };

  it('only sends to a valid address, then confirms and closes', async () => {
    renderActions({ mocks: [emailPodCalculatorMock({ delay: 20 })] });
    openDialog();
    expect(screen.getByText('Diwali weekend: Pods #1')).toBeInTheDocument();

    const to = screen.getByLabelText<HTMLInputElement>('Send to');
    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();
    expect(to).not.toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(to, { target: { value: 'finance-team' } });
    expect(to).toHaveAttribute('aria-invalid', 'true');
    expect(send).toBeDisabled();

    fireEvent.change(to, { target: { value: ' finance-team@duncit.com ' } });
    expect(to).toHaveAttribute('aria-invalid', 'false');
    fireEvent.click(send);
    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Report sent'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the dialog open with the reason when the email could not go', async () => {
    renderActions({ mocks: [emailPodCalculatorMock({ fail: 'The report could not be emailed' })] });
    openDialog();
    fireEvent.change(screen.getByLabelText('Send to'), { target: { value: 'finance-team@duncit.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The report could not be emailed'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Email report' })).toBeInTheDocument();
  });

  it('closes on Cancel without sending', async () => {
    renderActions();
    openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
