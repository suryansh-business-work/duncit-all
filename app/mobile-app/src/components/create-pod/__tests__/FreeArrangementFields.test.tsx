import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { Text } from 'tamagui';
import { freeJustificationDefaults, type FreeJustificationValues } from '@duncit/forms/schemas';

import {
  FREE_JUSTIFICATION_NAMES,
  FreeArrangementFields,
} from '@/components/create-pod/free-arrangement';
import { renderWithProviders } from '@/utils/test-utils';

/** The fields on a bare form, with what the form holds read back. */
function Harness() {
  const form = useForm<FreeJustificationValues>({ defaultValues: freeJustificationDefaults });
  return (
    <>
      <FreeArrangementFields
        control={form.control}
        names={FREE_JUSTIFICATION_NAMES}
        testIDPrefix="t"
      />
      <Text testID="readout">{JSON.stringify(form.watch())}</Text>
    </>
  );
}

const DETAILS_TITLE = 'How free pods and free venues work';

describe('FreeArrangementFields', () => {
  it("shows Duncit's free policy and the warning on misuse, with the details a tap away", () => {
    renderWithProviders(<Harness />);
    expect(screen.getByTestId('t-free-policy')).toHaveTextContent(/Free is only for special cases/);
    expect(screen.getByTestId('t-free-policy')).toHaveTextContent(/forwarded to the Venue/);
    expect(screen.getByTestId('t-free-warning')).toHaveTextContent(
      /reduce your account health or temporarily hold your payments/,
    );
    expect(screen.queryByText(DETAILS_TITLE)).toBeNull();
    fireEvent.press(screen.getByTestId('t-free-more-details'));
    expect(screen.getByText(DETAILS_TITLE)).toBeOnTheScreen();
    expect(screen.getByText(/Free bookings cannot be countered or bargained/)).toBeOnTheScreen();
    // The header X is DuncitDialog's `-close`; the footer button is the dialog's own.
    fireEvent.press(screen.getByTestId('t-free-policy-dialog-done'));
    expect(screen.queryByText(DETAILS_TITLE)).toBeNull();
  });

  it('asks for details only for Other, and records the reason and the acceptance', () => {
    renderWithProviders(<Harness />);
    expect(screen.queryByTestId('field-free_details')).toBeNull();
    fireEvent.press(screen.getByTestId('t-free-reason-OTHER'));
    expect(screen.getByTestId('t-free-reason-OTHER')).toHaveProp('aria-checked', true);
    fireEvent.changeText(screen.getByTestId('field-free_details'), 'Launch week');
    expect(screen.getByTestId('t-free-accept')).toHaveProp('aria-checked', false);
    fireEvent.press(screen.getByTestId('t-free-accept'));
    expect(screen.getByTestId('t-free-accept')).toHaveProp('aria-checked', true);
    expect(screen.getByTestId('readout')).toHaveTextContent(
      '{"free_reason":"OTHER","free_details":"Launch week","free_accepted":true}',
    );
    // Another reason needs no explanation, so the box goes.
    fireEvent.press(screen.getByTestId('t-free-reason-CAMPAIGN'));
    expect(screen.queryByTestId('field-free_details')).toBeNull();
    // A second tap takes the acceptance back.
    fireEvent.press(screen.getByTestId('t-free-accept'));
    expect(screen.getByTestId('readout')).toHaveTextContent(/"free_accepted":false/);
  });
});
