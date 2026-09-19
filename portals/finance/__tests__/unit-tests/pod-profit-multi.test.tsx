import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import MultiPodCalculator from '../../src/pages/calculators/pod-profit/multi';
import { ConfirmProvider } from '../../../../packages/dialogs/src/useConfirm';
import { renderWithProviders } from '../testkit';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetTableControls } from './mocks/table';
import {
  calculatorDefaultsMock,
  createPodCalculatorMock,
  deletePodCalculatorMock,
  makeCalculator,
  makePod,
  podCalculatorsErrorMock,
  podCalculatorsMock,
  updatePodCalculatorMock,
} from '../mocks/pod-calculator.mock';

// The stub's useConfirm always says yes; leaving and deleting are both tested
// on the Cancel side too, so the real confirm and its provider are swapped in.
vi.mock('./mocks/dialogs', async (importOriginal) => {
  const stub = await importOriginal<typeof import('./mocks/dialogs')>();
  const { useConfirm } = await import('../../../../packages/dialogs/src/useConfirm');
  return { ...stub, useConfirm };
});

const football = makePod();
// Three identical ₹500 yoga pods on a ₹30,000 venue: the host side is short.
const yoga = makePod({ pod_key: 'pod-weekday-yoga', name: 'Weekday Yoga', pod_amount: 500, pod_count: 3, venue_amount: 30000 });
const comparison = makeCalculator({
  id: '66f1a2b3c4d5e6f708192b01',
  name: 'Weekend comparison',
  kind: 'MULTI',
  pods: [football, yoga],
});
const openEntry = `/?calculator=${comparison.id}`;

const renderTab = (mocks: MockedResponse[], entry = '/') =>
  renderWithProviders(
    <ConfirmProvider>
      <MultiPodCalculator />
    </ConfirmProvider>,
    { mocks: [calculatorDefaultsMock(), ...mocks], path: '/', entry },
  );

const openEditor = (mocks: MockedResponse[] = []) =>
  renderTab([podCalculatorsMock('MULTI', [comparison]), ...mocks], openEntry);

const nameField = () => screen.findByLabelText<HTMLInputElement>('Comparison name');
const summary = (pod: RegExp) => screen.getByRole('button', { name: pod });
const panel = (pod: RegExp) => within(screen.getByRole('region', { name: pod }));
const listIntro = /Every comparison is saved for the whole finance team/;

beforeEach(() => {
  resetTableControls();
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('Multiple pods tab — the list', () => {
  it('creates a comparison and opens it once the list has it', async () => {
    const created = makeCalculator({
      id: '66f1a2b3c4d5e6f708192b09',
      name: 'Untitled comparison',
      kind: 'MULTI',
      pods: [makePod({ pod_key: 'pod-first', name: 'Pod 1' })],
    });
    renderTab([
      podCalculatorsMock('MULTI', [comparison]),
      createPodCalculatorMock(created),
      podCalculatorsMock('MULTI', [comparison, created]),
    ]);

    expect(await screen.findByText(listIntro)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New comparison' }));

    expect((await nameField()).value).toBe('Untitled comparison');
    expect(screen.getByRole('button', { name: /Pod 1/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('reports a create the server refused', async () => {
    renderTab([
      podCalculatorsMock('MULTI', []),
      createPodCalculatorMock(comparison, { fail: 'A calculation name is required' }),
    ]);
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No saved comparisons yet');
    fireEvent.click(screen.getByRole('button', { name: 'New comparison' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('A calculation name is required'));
  });

  it('opens a row and closes a clean editor without asking', async () => {
    renderTab([podCalculatorsMock('MULTI', [comparison])]);
    fireEvent.click(await screen.findByTestId('row-open'));

    expect((await nameField()).value).toBe('Weekend comparison');
    // Each header answers the question collapsed: a count above one is shown.
    expect(screen.getByText('Total collection ₹29,000')).toBeInTheDocument();
    expect(screen.getByText('Total collection ₹43,500 · x3')).toBeInTheDocument();
    expect(screen.getByText('Pods in this comparison: 4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to saved comparisons' }));
    expect(await screen.findByText(listIntro)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the error when the list cannot load', async () => {
    renderTab([podCalculatorsErrorMock('MULTI', 'Network request failed')]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network request failed');
  });
});

describe('Multiple pods tab — the editor', () => {
  it('edits one pod without touching the others, then adds and removes pods', async () => {
    openEditor();
    await nameField();
    expect(summary(/Sunday Turf Football/)).toHaveAttribute('aria-expanded', 'true');
    expect(summary(/Weekday Yoga/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    const footballPanel = panel(/Sunday Turf Football/);
    fireEvent.change(footballPanel.getByLabelText('Pod name'), { target: { value: 'Sunday Turf Football (5-a-side)' } });
    fireEvent.change(footballPanel.getByLabelText('Ticket price per spot (GST-inclusive)'), { target: { value: '1200' } });
    expect(screen.getByText('Sunday Turf Football (5-a-side)')).toBeInTheDocument();
    expect(screen.getByText('Total collection ₹34,800')).toBeInTheDocument();
    expect(screen.getByText('Total collection ₹43,500 · x3')).toBeInTheDocument();

    // Unsaved edits: savable, not yet exportable.
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();

    fireEvent.click(summary(/Weekday Yoga/));
    fireEvent.click(summary(/Sunday Turf Football/));
    expect(summary(/Weekday Yoga/)).toHaveAttribute('aria-expanded', 'true');
    expect(summary(/Sunday Turf Football/)).toHaveAttribute('aria-expanded', 'false');

    // A new pod copies the last one's numbers.
    fireEvent.click(screen.getByRole('button', { name: 'Add pod' }));
    expect(summary(/Pod 3/)).toHaveAttribute('aria-expanded', 'true');
    expect(panel(/Pod 3/).getByLabelText<HTMLInputElement>('Ticket price per spot (GST-inclusive)').value).toBe('500');

    fireEvent.click(panel(/Pod 3/).getByRole('button', { name: 'Remove this pod' }));
    fireEvent.click(panel(/Weekday Yoga/).getByRole('button', { name: 'Remove this pod' }));
    fireEvent.click(summary(/Sunday Turf Football/));
    fireEvent.click(panel(/Sunday Turf Football/).getByRole('button', { name: 'Remove this pod' }));

    expect(screen.getByText('No pods yet — add one to start comparing.')).toBeInTheDocument();
    expect(screen.getByText('Pods in this comparison: 0')).toBeInTheDocument();
    expect(screen.queryByText('Pods compared')).toBeNull();

    // With nothing left to copy, a new pod starts on Default Deductions.
    fireEvent.click(screen.getByRole('button', { name: 'Add pod' }));
    expect(panel(/Pod 1/).getByLabelText<HTMLInputElement>('Ticket price per spot (GST-inclusive)').value).toBe('1000');
    expect(screen.getByText('Pods compared')).toBeInTheDocument();
  });

  it('asks for a name before it will save', async () => {
    openEditor();
    fireEvent.change(await nameField(), { target: { value: '   ' } });
    expect(screen.getByText('Give this comparison a name before saving.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves the comparison, showing the save in flight', async () => {
    const renamed = { ...comparison, name: 'Weekend comparison v2' };
    openEditor([updatePodCalculatorMock(renamed, { delay: 20 }), podCalculatorsMock('MULTI', [renamed])]);
    fireEvent.change(await nameField(), { target: { value: 'Weekend comparison v2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Comparison saved'));
    // The stored row now matches the screen, so the editor is clean again.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled());
  });

  it('reports a refused save', async () => {
    openEditor([updatePodCalculatorMock(comparison, { fail: 'Calculation not found' })]);
    fireEvent.change(await nameField(), { target: { value: 'Weekend comparison v2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Calculation not found'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('shows the list error when the refetch after a save fails', async () => {
    openEditor([updatePodCalculatorMock(comparison), podCalculatorsErrorMock('MULTI', 'Network request failed')]);
    fireEvent.change(await nameField(), { target: { value: 'Weekend comparison v2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Comparison saved'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network request failed');
  });

  it('asks before leaving with unsaved edits', async () => {
    openEditor();
    fireEvent.change(await nameField(), { target: { value: 'Weekend comparison v2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Back to saved comparisons' }));
    expect(await screen.findByRole('dialog', { name: 'Leave without saving?' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await nameField()).value).toBe('Weekend comparison v2');

    fireEvent.click(screen.getByRole('button', { name: 'Back to saved comparisons' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    expect(await screen.findByText(listIntro)).toBeInTheDocument();
  });

  it('deletes only once the confirmation is accepted', async () => {
    openEditor([deletePodCalculatorMock({ delay: 20 })]);
    await nameField();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('dialog', { name: 'Delete this comparison?' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(notifySuccess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    expect(await screen.findByText('Deleting…')).toBeInTheDocument();
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Comparison deleted'));
    expect(await screen.findByText(listIntro)).toBeInTheDocument();
  });

  it('reports a failed delete and stays in the editor', async () => {
    openEditor([deletePodCalculatorMock({ fail: 'Calculation not found' })]);
    await nameField();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Calculation not found'));
    expect((await nameField()).value).toBe('Weekend comparison');
  });
});
