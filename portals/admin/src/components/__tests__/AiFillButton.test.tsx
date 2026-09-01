import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AiFillButton, { type AiDummyEntity } from '../AiFillButton';

/**
 * Re-declared here on purpose: the mutation document lives inside the
 * component, so restating it is the contract test — a renamed field or
 * argument stops matching and every generate test below fails.
 */
const AI_FILL = gql`
  mutation AiFillDummyData($entity: AiDummyEntity!, $prompt: String) {
    aiFillDummyData(entity: $entity, prompt: $prompt)
  }
`;

const fillMock = (
  entity: AiDummyEntity,
  prompt: string | null,
  outcome: Pick<MockedResponse, 'result' | 'error'>,
): MockedResponse => ({
  request: { query: AI_FILL, variables: { entity, prompt } },
  ...outcome,
});

const okMock = (entity: AiDummyEntity, prompt: string | null, raw: string | null): MockedResponse =>
  fillMock(entity, prompt, { result: { data: { aiFillDummyData: raw } } });

const theme = createTheme();

const renderButton = (ui: ReactElement, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as MockedResponse[]}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </MockedProvider>,
  );

const openPopover = (name: RegExp) => {
  fireEvent.click(screen.getByRole('button', { name }));
};

const errorText = () => screen.queryByRole('alert')?.textContent ?? null;

describe('AiFillButton', () => {
  it('renders the given label and opens a POD-specific prompt popover', () => {
    renderButton(<AiFillButton entity="POD" onFill={vi.fn()} label="Autofill this pod" />);

    expect(screen.getByRole('button', { name: 'Autofill this pod' })).toBeInTheDocument();
    // Closed popover renders nothing.
    expect(screen.queryByRole('textbox')).toBeNull();

    openPopover(/Autofill this pod/);

    expect(
      screen.getByPlaceholderText('e.g. weekend rooftop chess meetup in Bandra'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Leave blank for a random pod\./)).toBeInTheDocument();
  });

  it('falls back to the default label and the CLUB prompt copy', () => {
    renderButton(<AiFillButton entity="CLUB" onFill={vi.fn()} />);

    openPopover(/Fill with AI/);

    expect(screen.getByPlaceholderText('e.g. urban hikers in Bangalore')).toBeInTheDocument();
    expect(screen.getByText(/Leave blank for a random club\./)).toBeInTheDocument();
  });

  it('renders no trigger text at all in icon-only mode, and still opens the popover', () => {
    renderButton(<AiFillButton entity="CLUB" onFill={vi.fn()} iconOnly label="Ignored" />);

    // iconOnly drops the label entirely — neither the override nor the default shows.
    expect(screen.queryByText('Ignored')).toBeNull();
    expect(screen.queryByText('Fill with AI')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Fill with AI' }));

    // Now the popover heading supplies the only "Fill with AI" text on screen.
    expect(screen.getByText('Fill with AI')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. urban hikers in Bangalore')).toBeInTheDocument();
  });

  it('sends a null prompt when the box is blank, hands the parsed JSON to onFill and closes', async () => {
    const onFill = vi.fn();
    renderButton(<AiFillButton entity="CLUB" onFill={onFill} />, [
      okMock('CLUB', null, '{"name":"Urban Hikers","member_count":42}'),
    ]);

    openPopover(/Fill with AI/);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(onFill).toHaveBeenCalledTimes(1));
    expect(onFill).toHaveBeenCalledWith({ name: 'Urban Hikers', member_count: 42 });
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('e.g. urban hikers in Bangalore')).toBeNull(),
    );
  });

  it('trims the typed prompt before sending it', async () => {
    const onFill = vi.fn();
    // Only a mock for the TRIMMED prompt exists: an untrimmed send finds no
    // mock, surfaces an error and never calls onFill.
    renderButton(<AiFillButton entity="POD" onFill={onFill} />, [
      okMock('POD', 'rooftop chess', '{"title":"Rooftop Chess"}'),
    ]);

    openPopover(/Fill with AI/);
    fireEvent.change(screen.getByPlaceholderText(/rooftop chess meetup/), {
      target: { value: '   rooftop chess   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(onFill).toHaveBeenCalledWith({ title: 'Rooftop Chess' }));
  });

  it('generates on Ctrl+Enter from inside the prompt box', async () => {
    const onFill = vi.fn();
    renderButton(<AiFillButton entity="POD" onFill={onFill} />, [
      okMock('POD', null, '{"title":"Chess"}'),
    ]);

    openPopover(/Fill with AI/);
    const box = screen.getByPlaceholderText(/rooftop chess meetup/);
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onFill).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });

    await waitFor(() => expect(onFill).toHaveBeenCalledWith({ title: 'Chess' }));
  });

  it('reports invalid JSON without calling onFill or closing the popover', async () => {
    const onFill = vi.fn();
    renderButton(<AiFillButton entity="CLUB" onFill={onFill} />, [
      okMock('CLUB', null, 'sorry, I am not JSON'),
    ]);

    openPopover(/Fill with AI/);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(errorText()).toBe('AI returned invalid JSON'));
    expect(onFill).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('e.g. urban hikers in Bangalore')).toBeInTheDocument();
  });

  it('reports an empty response', async () => {
    const onFill = vi.fn();
    renderButton(<AiFillButton entity="CLUB" onFill={onFill} />, [okMock('CLUB', null, null)]);

    openPopover(/Fill with AI/);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(errorText()).toBe('No data returned'));
    expect(onFill).not.toHaveBeenCalled();
  });

  it('surfaces the server error message, and Cancel clears it on reopen', async () => {
    const onFill = vi.fn();
    renderButton(<AiFillButton entity="CLUB" onFill={onFill} />, [
      fillMock('CLUB', null, { error: new Error('AI quota exceeded') }),
    ]);

    openPopover(/Fill with AI/);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(errorText()).toBe('AI quota exceeded'));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('e.g. urban hikers in Bangalore')).toBeNull(),
    );

    openPopover(/Fill with AI/);
    expect(errorText()).toBeNull();
    expect(onFill).not.toHaveBeenCalled();
  });

  it('locks the popover controls while the mutation is in flight', async () => {
    const onFill = vi.fn();
    renderButton(<AiFillButton entity="POD" onFill={onFill} />, [
      { ...okMock('POD', null, '{"title":"Chess"}'), delay: 500 },
    ]);

    openPopover(/Fill with AI/);
    expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    // Asserted synchronously: a timer-driven wait could let the mock resolve
    // first on a loaded machine and miss the in-flight state entirely.
    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByPlaceholderText(/rooftop chess meetup/)).toBeDisabled();

    // Escape must not tear the popover down mid-request either.
    fireEvent.keyDown(screen.getByPlaceholderText(/rooftop chess meetup/), { key: 'Escape' });
    expect(screen.getByPlaceholderText(/rooftop chess meetup/)).toBeInTheDocument();

    await waitFor(() => expect(onFill).toHaveBeenCalledWith({ title: 'Chess' }));
  });

  it('dismisses the popover on Escape when idle, clearing the error', async () => {
    const onFill = vi.fn();
    renderButton(<AiFillButton entity="CLUB" onFill={onFill} />, [
      fillMock('CLUB', null, { error: new Error('AI quota exceeded') }),
    ]);

    openPopover(/Fill with AI/);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(errorText()).toBe('AI quota exceeded'));

    fireEvent.keyDown(screen.getByPlaceholderText('e.g. urban hikers in Bangalore'), {
      key: 'Escape',
    });

    await waitFor(() =>
      expect(screen.queryByPlaceholderText('e.g. urban hikers in Bangalore')).toBeNull(),
    );
    openPopover(/Fill with AI/);
    expect(errorText()).toBeNull();
  });
});
