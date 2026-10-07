import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodRequestLimitForm, type PodRequestLimitFormProps } from '@/forms/pod-request-limit';
import { renderWithProviders } from '@/utils/test-utils';

const props = (over: Partial<PodRequestLimitFormProps> = {}): PodRequestLimitFormProps => ({
  label: 'Maximum Venue Requests / Month',
  initialLimit: 10,
  override: null,
  saving: false,
  saved: false,
  error: null,
  onSubmit: jest.fn().mockResolvedValue(undefined),
  testID: 'limit-form',
  ...over,
});

describe('PodRequestLimitForm', () => {
  it('starts from the saved cap and submits a new whole number', async () => {
    const p = props();
    renderWithProviders(<PodRequestLimitForm {...p} />);
    expect(screen.getByTestId('field-limit').props.value).toBe('10');
    expect(screen.queryByTestId('limit-form-override')).toBeNull();

    fireEvent.changeText(screen.getByTestId('field-limit'), '25');
    fireEvent.press(screen.getByTestId('limit-form-save'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalledWith(25));
  });

  it.each([
    ['0', 0],
    ['100', 100],
  ])('accepts the boundary %s', async (text, value) => {
    const p = props();
    renderWithProviders(<PodRequestLimitForm {...p} />);
    fireEvent.changeText(screen.getByTestId('field-limit'), text);
    fireEvent.press(screen.getByTestId('limit-form-save'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalledWith(value));
  });

  it.each([
    ['blank', ''],
    ['above 100', '101'],
  ])('refuses a %s cap with the shared message', async (_why, text) => {
    const p = props();
    renderWithProviders(<PodRequestLimitForm {...p} />);
    fireEvent.changeText(screen.getByTestId('field-limit'), text);
    fireEvent.press(screen.getByTestId('limit-form-save'));
    await waitFor(() =>
      expect(screen.getByTestId('limit-error')).toHaveTextContent(
        'Enter a whole number from 0 to 100.',
      ),
    );
    expect(p.onSubmit).not.toHaveBeenCalled();
  });

  it('keeps only digits as the partner types', () => {
    renderWithProviders(<PodRequestLimitForm {...props()} />);
    fireEvent.changeText(screen.getByTestId('field-limit'), '4a-2');
    expect(screen.getByTestId('field-limit').props.value).toBe('42');
  });

  it("shows Duncit's cap, the server's refusal and the saved line", () => {
    renderWithProviders(
      <PodRequestLimitForm {...props({ override: 3, error: 'Forbidden', saved: true })} />,
    );
    expect(screen.getByTestId('limit-form-override')).toHaveTextContent(
      'Set by Duncit: 3 per month.',
    );
    expect(screen.getByTestId('limit-form-error')).toHaveTextContent('Forbidden');
    expect(screen.getByTestId('limit-form-saved')).toHaveTextContent('Saved.');
  });

  it('shows a zero override too (it is a real cap, not "unset")', () => {
    renderWithProviders(<PodRequestLimitForm {...props({ override: 0 })} />);
    expect(screen.getByTestId('limit-form-override')).toHaveTextContent(
      'Set by Duncit: 0 per month.',
    );
  });

  it('refills the box when a refetch brings another saved cap', () => {
    const { rerender } = renderWithProviders(<PodRequestLimitForm {...props()} />);
    rerender(<PodRequestLimitForm {...props({ initialLimit: 30 })} />);
    expect(screen.getByTestId('field-limit').props.value).toBe('30');
  });

  it('locks Save while a save is running', () => {
    renderWithProviders(<PodRequestLimitForm {...props({ saving: true })} />);
    expect(screen.getByTestId('limit-form-save').props['aria-disabled']).toBe(true);
  });
});
