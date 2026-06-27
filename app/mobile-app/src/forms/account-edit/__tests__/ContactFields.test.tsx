import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { Text } from 'tamagui';

import { ContactFields } from '@/forms/account-edit/ContactFields';
import type { AccountEditValues } from '@/forms/account-edit/account-edit.types';
import { renderWithProviders } from '@/utils/test-utils';

function Harness({ initial }: Readonly<{ initial?: Partial<AccountEditValues> }>) {
  const { control, setValue, watch } = useForm<AccountEditValues>({
    defaultValues: {
      phone_extension: '+91',
      phone_number: '',
      whatsapp_extension: '+91',
      whatsapp_number: '',
      ...initial,
    } as AccountEditValues,
  });
  const v = watch();
  return (
    <>
      <ContactFields control={control} setValue={setValue} />
      <Text testID="snapshot">{`${v.whatsapp_extension}|${v.whatsapp_number}`}</Text>
    </>
  );
}

const snapshot = () => screen.getByTestId('snapshot').props.children;
const toggleChecked = () => screen.getByTestId('whatsapp-same-toggle').props['aria-checked'];

describe('ContactFields', () => {
  it('defaults the toggle ON when whatsapp already equals the contact number (bug 3)', () => {
    renderWithProviders(
      <Harness initial={{ phone_number: '9876543210', whatsapp_number: '9876543210' }} />,
    );
    expect(toggleChecked()).toBe(true);
    // The whatsapp country-code picker is locked while mirroring.
    fireEvent.press(screen.getByTestId('whatsapp-code-trigger'));
    expect(screen.queryByTestId('whatsapp-code-sheet')).toBeNull();
  });

  it('defaults the toggle OFF when the numbers differ', () => {
    renderWithProviders(
      <Harness initial={{ phone_number: '9876543210', whatsapp_number: '5550000' }} />,
    );
    expect(toggleChecked()).toBe(false);
    // The whatsapp country-code picker opens when not mirroring.
    fireEvent.press(screen.getByTestId('whatsapp-code-trigger'));
    expect(screen.getByTestId('whatsapp-code-sheet')).toBeOnTheScreen();
  });

  it('mirrors the contact number live while the toggle is on (bug 3)', async () => {
    renderWithProviders(<Harness initial={{ phone_number: '9876543210' }} />);
    expect(toggleChecked()).toBe(false);
    fireEvent.press(screen.getByTestId('whatsapp-same-toggle'));
    expect(toggleChecked()).toBe(true);
    await waitFor(() => expect(snapshot()).toBe('+91|9876543210'));

    // Editing the contact number flows through to the locked whatsapp number.
    fireEvent.changeText(screen.getByTestId('field-phone_number'), '9000000000');
    await waitFor(() => expect(snapshot()).toBe('+91|9000000000'));
  });

  it('stops mirroring when the toggle is switched off and unlocks the picker', () => {
    renderWithProviders(
      <Harness initial={{ phone_number: '9876543210', whatsapp_number: '9876543210' }} />,
    );
    expect(toggleChecked()).toBe(true);
    fireEvent.press(screen.getByTestId('whatsapp-same-toggle'));
    expect(toggleChecked()).toBe(false);
    fireEvent.press(screen.getByTestId('whatsapp-code-trigger'));
    expect(screen.getByTestId('whatsapp-code-sheet')).toBeOnTheScreen();
  });

  it('lets the contact country code be picked', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('phone-code-trigger'));
    expect(screen.getByTestId('phone-code-sheet')).toBeOnTheScreen();
  });
});
