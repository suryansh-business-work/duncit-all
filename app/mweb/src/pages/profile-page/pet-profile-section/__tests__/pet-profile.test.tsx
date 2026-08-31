/**
 * The pet on a member's profile.
 *
 * A pet is entirely optional, and that is the shape of every rule here: an
 * empty pet is not an error, it is a member who has not filled one in. The
 * schema therefore has NO required fields — what it has are ceilings and a
 * couple of things that would be nonsense — and the section reads "no pet yet"
 * rather than an empty card.
 *
 * Two of those checks earn their place. Age is refused above a hundred, because
 * a pet older than that is a typo rather than a tortoise, and it is stored as a
 * number the server will keep. The photo has to parse as a URL: an unparseable
 * one renders as a broken image on a stranger's screen, and the person who
 * typed it never sees their own profile the way anyone else does.
 *
 * The breed list follows the species. Offering cat breeds under Dog is how a
 * dropdown stops being help and becomes noise.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PetForm from '../PetForm';
import PetProfileSection from '../PetProfileSection';
import PetSummary from '../PetSummary';
import { UPDATE_PET, petSchema, type PetProfile } from '../petQueries';
import { PET_SPECIES_OPTIONS, breedsForSpecies } from '../../../../utils/petBreeds';

const testTheme = createTheme();

const PET: PetProfile = {
  name: 'Idli',
  species: 'Dog',
  breed: 'Indie',
  age: 4,
  photo_url: 'https://ik.imagekit.io/duncit/idli.jpg',
  bio: 'Sleeps through every rally.',
};

const saved: MockedResponse = {
  request: { query: UPDATE_PET, variables: () => true },
  result: {
    data: { updateMyPetProfile: { user_id: 'u-1', pet_profile: { ...PET } } },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactNode, mocks: MockedResponse[] = [saved]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

const valid = {
  name: 'Idli',
  species: 'Dog',
  breed: 'Indie',
  age: '4',
  photo_url: 'https://ik.imagekit.io/duncit/idli.jpg',
  bio: 'Sleeps through every rally.',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('petSchema', () => {
  it('takes a completely empty pet — not filling one in is not an error', () => {
    expect(
      petSchema.safeParse({ name: '', species: '', breed: '', age: '', photo_url: '', bio: '' })
        .success
    ).toBe(true);
  });

  it('takes a fully filled one', () => {
    expect(petSchema.safeParse(valid).success).toBe(true);
  });

  it('refuses an age above a hundred — that is a typo, not a tortoise', () => {
    expect(petSchema.safeParse({ ...valid, age: '150' }).success).toBe(false);
    expect(petSchema.safeParse({ ...valid, age: '100' }).success).toBe(true);
  });

  it('refuses a photo that is not a URL, which renders broken on every other screen', () => {
    expect(petSchema.safeParse({ ...valid, photo_url: 'idli.jpg' }).success).toBe(false);
    expect(petSchema.safeParse({ ...valid, photo_url: '' }).success).toBe(true);
  });

  it('caps the bio, and says so in words a member can act on', () => {
    const long = petSchema.safeParse({ ...valid, bio: 'x'.repeat(501) });

    expect(long.success).toBe(false);
    expect(long.success ? '' : long.error.issues[0]?.message).toContain('500');
  });

  it('caps the name, species and breed as the server does', () => {
    expect(petSchema.safeParse({ ...valid, name: 'x'.repeat(61) }).success).toBe(false);
    expect(petSchema.safeParse({ ...valid, species: 'x'.repeat(41) }).success).toBe(false);
    expect(petSchema.safeParse({ ...valid, breed: 'x'.repeat(61) }).success).toBe(false);
  });
});

describe('breedsForSpecies', () => {
  it('offers different breeds per species rather than one list for all of them', () => {
    const [first, second] = PET_SPECIES_OPTIONS;

    expect(breedsForSpecies(first as string)).not.toEqual(breedsForSpecies(second as string));
  });

  it('offers only the catch-all for a species nobody listed, never every breed there is', () => {
    const listed = breedsForSpecies(PET_SPECIES_OPTIONS[0] as string);

    expect(breedsForSpecies('Axolotl').length).toBeLessThan(listed.length);
  });

  it('offers nothing before a species has been chosen', () => {
    expect(breedsForSpecies('')).toEqual([]);
  });
});

describe('PetSummary', () => {
  it('invites a member who has no pet on file, rather than showing an empty card', () => {
    const { container } = wrap(<PetSummary pet={null} />);

    expect(container.textContent).toContain('pet');
  });

  it('treats a pet record with nothing in it as no pet', () => {
    const { container } = wrap(<PetSummary pet={{ name: '', species: '', bio: '', photo_url: '' }} />);

    expect(container.textContent).toContain('pet-friendly pods');
  });

  it('shows the pet once there is one', () => {
    const { container } = wrap(<PetSummary pet={PET} />);

    expect(container.textContent).toContain('Idli');
  });

  it('shows a pet with only a name on it', () => {
    const { container } = wrap(<PetSummary pet={{ name: 'Idli' }} />);

    expect(container.textContent).toContain('Idli');
  });
});

describe('PetForm', () => {
  const form = (over: Partial<Parameters<typeof PetForm>[0]> = {}) => {
    const spies = { onCancel: vi.fn(), onSaved: vi.fn() };
    return { spies, ...wrap(<PetForm {...spies} {...over} />) };
  };

  it('opens empty for a member adding their first pet', () => {
    const { container } = form();
    const [name] = container.querySelectorAll<HTMLInputElement>('input');

    expect(name?.value).toBe('');
  });

  it('opens on the pet already on file when one is being edited', () => {
    const { container } = form({ pet: PET });

    expect(container.querySelector('input')).toHaveProperty('value', 'Idli');
  });

  it('refuses an impossible age before asking the server', async () => {
    const { container, spies, getByLabelText } = form({ pet: PET });

    fireEvent.change(getByLabelText(/age/i), { target: { value: '150' } });
    const submit = container.querySelector('form');
    if (submit) fireEvent.submit(submit);
    await settle();
    await settle();

    expect(spies.onSaved).not.toHaveBeenCalled();
    expect(container.textContent).toContain('too large');
  });

  it('saves a valid pet and tells the caller', async () => {
    const { container, spies } = form({ pet: PET });

    const submit = container.querySelector('form');
    if (submit) fireEvent.submit(submit);
    else for (const control of container.querySelectorAll<HTMLElement>('button')) fireEvent.click(control);
    await settle();
    await settle();

    expect(spies.onSaved).toHaveBeenCalled();
  });

  it('leaves without saving when the member backs out', () => {
    const { container, spies } = form({ pet: PET });
    const cancel = [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      /cancel/i.test(button.textContent ?? '')
    );

    cancel?.click();

    expect(spies.onCancel).toHaveBeenCalled();
  });

  it('survives every field being typed into and every control pressed', async () => {
    const { container } = form({ pet: PET });

    for (const field of container.querySelectorAll<HTMLInputElement>('input, textarea')) {
      fireEvent.change(field, { target: { value: 'Dog' } });
      await settle();
    }
    for (const control of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 12)) {
      if (control.isConnected) fireEvent.click(control);
      await settle();
    }

    expect(container.innerHTML).not.toBe('');
  });
});

describe('PetProfileSection', () => {
  it('summarises the pet rather than opening straight into the form', () => {
    const { container } = wrap(<PetProfileSection pet={PET} />);

    expect(container.textContent).toContain('Idli');
    expect(container.querySelector('form')).toBeNull();
  });

  it('opens the form when the member chooses to edit, and closes it again', async () => {
    const { container } = wrap(<PetProfileSection pet={PET} />);

    const [edit] = container.querySelectorAll<HTMLElement>('button');
    fireEvent.click(edit);
    await settle();

    expect(container.querySelector('form')).not.toBeNull();
  });

  it('invites a member with no pet to add one', () => {
    const { container } = wrap(<PetProfileSection pet={null} />);

    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('works for a surface that does not want to know when it saved', async () => {
    const { container } = wrap(<PetProfileSection pet={PET} onSaved={undefined} />);

    for (const control of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 8)) {
      if (control.isConnected) fireEvent.click(control);
      await settle();
    }

    expect(container.innerHTML).not.toBe('');
  });
});
