import { Text } from 'tamagui';
import { screen } from '@testing-library/react-native';

import { Field } from '@/components/Field';
import { renderWithProviders } from '@/utils/test-utils';

describe('Field', () => {
  it('renders the label above the control and no helper by default (custom gap)', () => {
    renderWithProviders(
      <Field label="Full name" testID="name" gap={4}>
        <Text testID="control">child</Text>
      </Field>,
    );
    expect(screen.getByTestId('name-label')).toHaveTextContent('Full name');
    expect(screen.getByTestId('control')).toBeOnTheScreen();
    expect(screen.queryByTestId('name-hint')).toBeNull();
    expect(screen.queryByTestId('name-error')).toBeNull();
  });

  it('appends a required asterisk after the label when required', () => {
    renderWithProviders(
      <Field label="Full name" required testID="name">
        <Text>child</Text>
      </Field>,
    );
    expect(screen.getByTestId('name-required')).toHaveTextContent('*');
    expect(screen.getByTestId('name-label')).toHaveTextContent('Full name *');
  });

  it('shows the muted hint when there is no error', () => {
    renderWithProviders(
      <Field label="Amount" hint="Max 1999." testID="amount">
        <Text>child</Text>
      </Field>,
    );
    expect(screen.getByTestId('amount-hint')).toHaveTextContent('Max 1999.');
  });

  it('shows the error and hides the hint when both are set', () => {
    renderWithProviders(
      <Field label="Email" hint="We never share it." error="Invalid email" testID="email">
        <Text>child</Text>
      </Field>,
    );
    expect(screen.getByTestId('email-error')).toHaveTextContent('Invalid email');
    expect(screen.queryByTestId('email-hint')).toBeNull();
  });

  it('renders the error with no test ids when no testID is given', () => {
    renderWithProviders(
      <Field label="Bare error" error="boom">
        <Text>child</Text>
      </Field>,
    );
    expect(screen.getByText('Bare error')).toBeOnTheScreen();
    expect(screen.getByText('boom')).toBeOnTheScreen();
  });

  it('renders the hint with no test ids when no testID is given', () => {
    renderWithProviders(
      <Field label="Bare hint" hint="just a hint">
        <Text>child</Text>
      </Field>,
    );
    expect(screen.getByText('Bare hint')).toBeOnTheScreen();
    expect(screen.getByText('just a hint')).toBeOnTheScreen();
  });
});
