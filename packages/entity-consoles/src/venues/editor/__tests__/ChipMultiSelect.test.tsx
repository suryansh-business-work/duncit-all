import { describe, expect, it } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChipMultiSelect from '../fields/ChipMultiSelect';
import { renderForm } from './harness';

/**
 * "Pick several" over a catalogue the server serves.
 *
 * Amenities may only come from the catalogue; tags may be invented. The chips
 * on screen are the array that is saved, so adding and removing one must move
 * the form value and nothing else.
 */
interface Values {
  amenities?: string[];
  tags?: string[];
}

const AMENITIES = ['Wi-Fi', 'AC', 'Projector'] as const;

describe('ChipMultiSelect', () => {
  it('shows the stored picks as chips and adds one from the catalogue', async () => {
    const user = userEvent.setup();
    const { form } = renderForm<Values>({ amenities: ['Wi-Fi'] }, ({ control }) => (
      <ChipMultiSelect control={control} name="amenities" label="Amenities" options={AMENITIES} />
    ));

    expect(screen.getByRole('button', { name: 'Wi-Fi' })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Amenities' }));
    await user.click(screen.getByRole('option', { name: 'Projector' }));

    expect(form().getValues('amenities')).toEqual(['Wi-Fi', 'Projector']);
    expect(screen.getByRole('button', { name: 'Projector' })).toBeInTheDocument();
  });

  it('removes a pick when its chip is deleted', async () => {
    const user = userEvent.setup();
    const { form } = renderForm<Values>({ amenities: ['Wi-Fi', 'AC'] }, ({ control }) => (
      <ChipMultiSelect control={control} name="amenities" label="Amenities" options={AMENITIES} />
    ));

    const chip = screen.getByRole('button', { name: 'Wi-Fi' });
    await user.click(within(chip).getByTestId('CancelIcon'));

    expect(form().getValues('amenities')).toEqual(['AC']);
  });

  it('lets tags invent a value, and says how', async () => {
    const user = userEvent.setup();
    const { form } = renderForm<Values>({}, ({ control }) => (
      <ChipMultiSelect
        control={control}
        name="tags"
        label="Tags"
        options={[]}
        freeSolo
        hint="Type a tag and press Enter."
      />
    ));

    expect(screen.getByText('Type a tag and press Enter.')).toBeInTheDocument();
    await user.type(screen.getByRole('combobox', { name: 'Tags' }), 'rooftop{Enter}');

    expect(form().getValues('tags')).toEqual(['rooftop']);
  });

  it('shows the validation message instead of the hint', () => {
    const { form } = renderForm<Values>({ tags: [] }, ({ control }) => (
      <ChipMultiSelect control={control} name="tags" label="Tags" options={[]} hint="Optional." />
    ));

    act(() => {
      form().setError('tags', { message: 'A tag must be 40 characters or fewer' });
    });

    expect(screen.getByText('A tag must be 40 characters or fewer')).toBeInTheDocument();
    expect(screen.queryByText('Optional.')).not.toBeInTheDocument();
  });

  it('can be locked', () => {
    renderForm<Values>({ amenities: [] }, ({ control }) => (
      <ChipMultiSelect
        control={control}
        name="amenities"
        label="Amenities"
        options={AMENITIES}
        disabled
      />
    ));

    expect(screen.getByRole('combobox', { name: 'Amenities' })).toBeDisabled();
  });
});
