import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PetForm from '../PetForm';
import PetPhotoField from '../PetPhotoField';
import PetProfileSection from '../PetProfileSection';
import PetSummary from '../PetSummary';
import { UPDATE_PET, petSchema, type PetProfile } from '../petQueries';

vi.mock('../../../../components/MediaPickerDialog', () => ({
  default: (p: { open: boolean; onClose: () => void; onPicked: (u: string) => void }) =>
    p.open ? (
      <div data-testid="picker">
        <button data-testid="picker-pick" onClick={() => p.onPicked('https://img/pet.png')} />
        <button data-testid="picker-close" onClick={p.onClose} />
      </div>
    ) : null,
}));

const PET: PetProfile = { name: 'Idli', species: 'Dog', breed: 'Indie', age: 4, photo_url: 'https://img/idli.png', bio: 'Sleepy' };

const saved = (input: object): MockedResponse => ({
  request: { query: UPDATE_PET, variables: { input } },
  result: { data: { updateMyPetProfile: { user_id: 'u1', pet_profile: { name: 'x', species: null, breed: null, age: null, photo_url: null, bio: null } } } },
});
const refused: MockedResponse = {
  request: { query: UPDATE_PET, variables: () => true },
  error: new Error('Pet locked'),
  maxUsageCount: Number.POSITIVE_INFINITY,
};
const wrap = (ui: React.ReactNode, mocks: MockedResponse[]) => render(<MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>{ui}</MockedProvider>);
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe('petSchema age', () => {
  const parse = (age: unknown) => petSchema.safeParse({ name: '', species: '', breed: '', age, photo_url: '', bio: '' });

  it('takes no age, a sensible age and a numeric string, and refuses negative, huge and non-numeric ages', () => {
    expect(parse('').success).toBe(true);
    expect(parse(0).success).toBe(true);
    expect(parse('7').success).toBe(true);
    expect(parse(-1).error?.issues[0]?.message).toBe('Age must be 0 or more');
    expect(parse(101).error?.issues[0]?.message).toBe('Age looks too large');
    expect(parse('abc').success).toBe(false);
  });
});

describe('PetForm save', () => {
  it('sends what was entered, with empty text as null and an empty age as null', async () => {
    const onSaved = vi.fn();
    wrap(<PetForm pet={null} onCancel={vi.fn()} onSaved={onSaved} />, [saved({ name: 'Rex', species: null, breed: null, age: null, photo_url: null, bio: null })]);
    fireEvent.change(screen.getByTestId('pet-form-name').querySelector('input') as HTMLElement, { target: { value: 'Rex' } });
    fireEvent.click(screen.getByTestId('pet-form-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('sends every filled field', async () => {
    const onSaved = vi.fn();
    wrap(<PetForm pet={PET} onCancel={vi.fn()} onSaved={onSaved} />, [saved({ name: 'Idli', species: 'Dog', breed: 'Indie', age: 4, photo_url: 'https://img/idli.png', bio: 'Sleepy' })]);
    fireEvent.click(screen.getByTestId('pet-form-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('shows why the save failed, stays open and does not announce a save', async () => {
    const onSaved = vi.fn();
    wrap(<PetForm pet={PET} onCancel={vi.fn()} onSaved={onSaved} />, [refused]);
    fireEvent.click(screen.getByTestId('pet-form-save'));
    expect(await screen.findByTestId('pet-form-error')).toHaveTextContent('Pet locked');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('clears species, age and breed through their clear buttons, and clearing species also clears breed', async () => {
    wrap(<PetForm pet={PET} onCancel={vi.fn()} onSaved={vi.fn()} />, []);
    const input = (id: string) => screen.getByTestId(id).querySelector('input') as HTMLInputElement;
    expect(input('pet-form-species').value).toBe('Dog');
    expect(input('pet-form-breed').value).toBe('Indie');
    expect(input('pet-form-age').value).toBe('4');
    for (const id of ['pet-form-age', 'pet-form-breed', 'pet-form-species']) {
      fireEvent.click(screen.getByTestId(id).querySelector('button[aria-label="Clear"]') as HTMLElement);
      await settle();
    }
    expect(input('pet-form-species').value).toBe('');
    expect(input('pet-form-breed').value).toBe('');
    expect(input('pet-form-age').value).toBe('');
  });

  it('picks a species from the list, which resets the breed', async () => {
    wrap(<PetForm pet={PET} onCancel={vi.fn()} onSaved={vi.fn()} />, []);
    const species = screen.getByTestId('pet-form-species').querySelector('input') as HTMLInputElement;
    fireEvent.mouseDown(species);
    fireEvent.click(await screen.findByRole('option', { name: 'Cat' }));
    await settle();
    expect(species.value).toBe('Cat');
    expect((screen.getByTestId('pet-form-breed').querySelector('input') as HTMLInputElement).value).toBe('');
  });
});

describe('PetPhotoField', () => {
  it('offers Upload with no photo, picks one from the library and reports it', () => {
    const onChange = vi.fn();
    render(<PetPhotoField value="" onChange={onChange} />);
    expect(screen.getByTestId('pet-photo-field-upload')).toHaveTextContent('Upload photo');
    expect(screen.queryByTestId('pet-photo-field-remove')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pet-photo-field-upload'));
    fireEvent.click(screen.getByTestId('picker-close'));
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pet-photo-field-upload'));
    fireEvent.click(screen.getByTestId('picker-pick'));
    expect(onChange).toHaveBeenCalledWith('https://img/pet.png');
  });

  it('offers Change and Remove with a photo, and Remove clears it', () => {
    const onChange = vi.fn();
    render(<PetPhotoField value="https://img/a.png" onChange={onChange} />);
    expect(screen.getByTestId('pet-photo-field-upload')).toHaveTextContent('Change photo');
    fireEvent.click(screen.getByTestId('pet-photo-field-remove'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('shows the error only once the field was touched', () => {
    const { rerender } = render(<PetPhotoField value="x" error="Must be a valid URL" onChange={vi.fn()} />);
    expect(screen.queryByTestId('pet-photo-field-error')).not.toBeInTheDocument();
    rerender(<PetPhotoField value="x" error="Must be a valid URL" touched onChange={vi.fn()} />);
    expect(screen.getByTestId('pet-photo-field-error')).toHaveTextContent('Must be a valid URL');
    rerender(<PetPhotoField value="x" touched onChange={vi.fn()} />);
    expect(screen.queryByTestId('pet-photo-field-error')).not.toBeInTheDocument();
  });

  it('hides a photo that fails to load rather than showing a broken image', () => {
    render(<PetPhotoField value="https://img/broken.png" onChange={vi.fn()} />);
    const img = screen.getByTestId('pet-photo-field-avatar').querySelector('img') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });
});

describe('PetSummary', () => {
  it('hides a photo that fails to load', () => {
    render(<PetSummary pet={PET} />);
    const img = screen.getByTestId('pet-summary-avatar').querySelector('img') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });

  it('shows species, breed and age joined, the bio, and a placeholder name; age 0 still counts', () => {
    render(<PetSummary pet={{ species: 'Cat', breed: null, age: 0, bio: 'Naps', name: null, photo_url: null }} />);
    expect(screen.getByTestId('pet-summary-name')).toHaveTextContent('Unnamed pet');
    expect(screen.getByText('Cat · 0 yrs')).toBeInTheDocument();
    expect(screen.getByText('Naps')).toBeInTheDocument();
  });

  it('leaves out the age line part when there is no age and no bio', () => {
    render(<PetSummary pet={{ name: 'Idli', age: null }} />);
    expect(screen.queryByText(/yrs/)).not.toBeInTheDocument();
  });
});

describe('PetProfileSection', () => {
  it('labels the button Add pet when empty and Edit when a pet exists', () => {
    const { unmount } = render(<PetProfileSection pet={null} />);
    expect(screen.getByTestId('pet-profile-section-edit')).toHaveTextContent('Add pet');
    unmount();
    render(<PetProfileSection pet={PET} />);
    expect(screen.getByTestId('pet-profile-section-edit')).toHaveTextContent('Edit');
  });

  it('counts a pet with only a photo as a pet', () => {
    render(<PetProfileSection pet={{ photo_url: 'https://img/p.png' }} />);
    expect(screen.getByTestId('pet-profile-section-edit')).toHaveTextContent('Edit');
  });

  it('opens the form, goes back to the summary on cancel, and saves with a dismissible confirmation', async () => {
    const onSaved = vi.fn();
    wrap(<PetProfileSection pet={PET} onSaved={onSaved} />, [saved({ name: 'Idli', species: 'Dog', breed: 'Indie', age: 4, photo_url: 'https://img/idli.png', bio: 'Sleepy' })]);
    fireEvent.click(screen.getByTestId('pet-profile-section-edit'));
    expect(screen.queryByTestId('pet-profile-section-edit')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pet-form-cancel'));
    expect(screen.getByTestId('pet-summary')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pet-profile-section-edit'));
    fireEvent.click(screen.getByTestId('pet-form-save'));
    expect(await screen.findByTestId('pet-profile-section-saved')).toHaveTextContent('Pet profile saved');
    expect(onSaved).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByTestId('pet-profile-section-saved')).not.toBeInTheDocument());
  });

  it('clears an old confirmation when editing starts again', async () => {
    wrap(<PetProfileSection pet={PET} />, [saved({ name: 'Idli', species: 'Dog', breed: 'Indie', age: 4, photo_url: 'https://img/idli.png', bio: 'Sleepy' })]);
    fireEvent.click(screen.getByTestId('pet-profile-section-edit'));
    fireEvent.click(screen.getByTestId('pet-form-save'));
    await screen.findByTestId('pet-profile-section-saved');
    fireEvent.click(screen.getByTestId('pet-profile-section-edit'));
    expect(screen.queryByTestId('pet-profile-section-saved')).not.toBeInTheDocument();
  });
});

describe('PetForm field errors', () => {
  const input = (id: string) => screen.getByTestId(id).querySelector('input,textarea') as HTMLInputElement;

  it('shows each field limit on its own field and does not save', async () => {
    const onSaved = vi.fn();
    wrap(<PetForm pet={null} onCancel={vi.fn()} onSaved={onSaved} />, []);
    fireEvent.change(input('pet-form-name'), { target: { value: 'n'.repeat(61) } });
    fireEvent.change(input('pet-form-species'), { target: { value: 's'.repeat(41) } });
    fireEvent.change(input('pet-form-breed'), { target: { value: 'b'.repeat(61) } });
    fireEvent.change(screen.getByTestId('pet-form-bio').querySelector('textarea') as HTMLElement, { target: { value: 'x'.repeat(501) } });
    fireEvent.click(screen.getByTestId('pet-form-save'));
    await waitFor(() => expect(screen.getByText('Bio must be 500 characters or fewer')).toBeInTheDocument());
    expect(document.querySelectorAll('.Mui-error').length).toBeGreaterThanOrEqual(4);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('refuses a photo that is not a URL and does not call the server', async () => {
    const onSaved = vi.fn();
    wrap(<PetForm pet={{ photo_url: 'not a url' }} onCancel={vi.fn()} onSaved={onSaved} />, []);
    fireEvent.click(screen.getByTestId('pet-form-save'));
    await settle();
    await settle();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByTestId('pet-form-error')).not.toBeInTheDocument();
  });

  it('picks an age from the list', async () => {
    wrap(<PetForm pet={null} onCancel={vi.fn()} onSaved={vi.fn()} />, []);
    fireEvent.mouseDown(input('pet-form-age'));
    fireEvent.click(await screen.findByRole('option', { name: '5' }));
    await settle();
    expect(input('pet-form-age').value).toBe('5');
  });

  it('sends nothing for a completely empty pet', async () => {
    const onSaved = vi.fn();
    wrap(<PetForm pet={null} onCancel={vi.fn()} onSaved={onSaved} />, [saved({ name: null, species: null, breed: null, age: null, photo_url: null, bio: null })]);
    fireEvent.click(screen.getByTestId('pet-form-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});
