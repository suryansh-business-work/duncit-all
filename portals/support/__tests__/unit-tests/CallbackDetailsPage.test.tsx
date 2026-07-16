import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';
import { type MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CallbackDetailsPage from '../../src/pages/callbacks/CallbackDetailsPage';
import { renderWithProviders } from '../testkit';
import {
  callbackRequestMock,
  closeCallbackMock,
  makeCallbackRequest,
  markContactedMock,
  type CallbackRequestMock,
} from '../mocks/callback.mock';

const ID = 'cb-1';

const req = (
  status: CallbackRequestMock['status'],
  extras: Partial<CallbackRequestMock> = {},
): CallbackRequestMock => makeCallbackRequest({ status, ...extras });

const renderAt = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [`/callbacks/${ID}`],
    routes: (
      <>
        <Route path="/callbacks/:id" element={<CallbackDetailsPage />} />
        <Route path="/callbacks" element={<div>CALLBACK LIST</div>} />
      </>
    ),
  });

describe('CallbackDetailsPage', () => {
  it('shows a not-found message when missing', async () => {
    renderAt([callbackRequestMock(null)]);
    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
  });

  it('marks contacted then closes a pending request', async () => {
    renderAt([
      callbackRequestMock(req('PENDING')),
      markContactedMock(),
      callbackRequestMock(req('CONTACTED')),
      closeCallbackMock(),
      callbackRequestMock(req('CLOSED')),
    ]);
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    expect(screen.getByText('CB-AAA111')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /mark contacted/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /mark contacted/i })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument());
  });

  it('renders a closed request with no phone or pod and no actions', async () => {
    renderAt([callbackRequestMock(req('CLOSED', { contact_phone: '', pod: null, reason: '' }))]);
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('records a call duration + conclusion when marking a pending request contacted', async () => {
    renderAt([
      callbackRequestMock(req('PENDING')),
      markContactedMock({ duration_seconds: 300, conclusion: 'Called and resolved' }),
      callbackRequestMock(req('CONTACTED', { duration_seconds: 300, conclusion: 'Called and resolved' })),
    ]);
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/call duration/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/conclusion/i), { target: { value: 'Called and resolved' } });
    fireEvent.click(screen.getByRole('button', { name: /mark contacted/i }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /mark contacted/i })).not.toBeInTheDocument(),
    );
  });

  it('renders a recorded outcome with a call duration and conclusion', async () => {
    renderAt([callbackRequestMock(req('CLOSED', { duration_seconds: 120, conclusion: null }))]);
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    // duration → "2 min · " with an em-dash conclusion fallback.
    expect(screen.getByText(/Outcome:/i)).toBeInTheDocument();
    expect(screen.getByText(/2 min ·/)).toBeInTheDocument();
  });

  it('renders an outcome with only a conclusion (no duration)', async () => {
    renderAt([callbackRequestMock(req('CLOSED', { duration_seconds: null, conclusion: 'Left a voicemail' }))]);
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    expect(screen.getByText(/Left a voicemail/)).toBeInTheDocument();
  });

  it('navigates back to the list', async () => {
    renderAt([callbackRequestMock(req('PENDING'))]);
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('CALLBACK LIST')).toBeInTheDocument();
  });
});
