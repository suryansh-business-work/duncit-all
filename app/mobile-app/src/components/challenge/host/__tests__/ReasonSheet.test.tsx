import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ReasonSheet } from '@/components/challenge/host/ReasonSheet';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const mount = ({ required = false, busy = false, open = true } = {}) => {
  const onSubmit = jest.fn();
  const onClose = jest.fn();
  const ui = (isOpen: boolean) => (
    <ReasonSheet
      open={isOpen}
      title="Remove this score?"
      message="It stays on file."
      confirmLabel="Remove"
      required={required}
      busy={busy}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
  const view = renderWithProviders(ui(open));
  return { onSubmit, onClose, rerender: (isOpen: boolean) => view.rerender(ui(isOpen)) };
};

const confirm = async () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('challenge-reason-confirm'));
  });

describe('ReasonSheet', () => {
  it('shows the title, the message and the reason field', () => {
    mount();
    expect(screen.getByText('Remove this score?')).toBeOnTheScreen();
    expect(screen.getByText('It stays on file.')).toBeOnTheScreen();
    expect(screen.getByLabelText('mweb.challenge.fields.reason')).toBeOnTheScreen();
    expect(screen.getByText('Remove')).toBeOnTheScreen();
  });

  it('draws nothing while closed', () => {
    mount({ open: false });
    expect(screen.queryByText('Remove this score?')).toBeNull();
  });

  it('sends the reason trimmed', async () => {
    const { onSubmit } = mount({ required: true });
    fireEvent.changeText(screen.getByLabelText('mweb.challenge.fields.reason'), '  Wrong player  ');
    await confirm();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Wrong player'));
  });

  it('lets an optional reason be left blank', async () => {
    const { onSubmit } = mount({ required: false });
    await confirm();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(''));
  });

  it('refuses a missing or too short reason when one is required', async () => {
    const { onSubmit } = mount({ required: true });
    await confirm();
    expect(await screen.findByText('mweb.challenge.errors.reason')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('mweb.challenge.fields.reason'), 'ab');
    await confirm();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a reason longer than the limit', async () => {
    const { onSubmit } = mount({ required: false });
    fireEvent.changeText(screen.getByLabelText('mweb.challenge.fields.reason'), 'x'.repeat(301));
    await confirm();
    expect(await screen.findByText('mweb.challenge.errors.reasonLong')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not crash when the submit handler itself throws', async () => {
    const { onSubmit } = mount();
    onSubmit.mockImplementation(() => {
      throw new Error('boom');
    });
    await confirm();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('challenge-reason-confirm')).toBeOnTheScreen();
  });

  it('closes on cancel without sending', async () => {
    const { onSubmit, onClose } = mount();
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-reason-cancel'));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('starts blank each time it opens', async () => {
    const view = mount({ required: true });
    fireEvent.changeText(screen.getByLabelText('mweb.challenge.fields.reason'), 'Typed before');
    expect(screen.getByDisplayValue('Typed before')).toBeOnTheScreen();
    view.rerender(false);
    view.rerender(true);
    await waitFor(() => expect(screen.queryByDisplayValue('Typed before')).toBeNull());
  });
});
