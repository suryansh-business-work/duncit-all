// Pet breed options grouped by species. "Other" is reserved for free text.
export interface BreedGroup {
  species: string;
  breeds: string[];
}

export const PET_SPECIES_OPTIONS = [
  'Dog',
  'Cat',
  'Bird',
  'Rabbit',
  'Hamster',
  'Fish',
  'Reptile',
  'Other',
];

export const PET_BREEDS: Record<string, string[]> = {
  Dog: [
    'Labrador Retriever',
    'Golden Retriever',
    'German Shepherd',
    'Bulldog',
    'Beagle',
    'Poodle',
    'Indie / Indian Pariah',
    'Pomeranian',
    'Shih Tzu',
    'Pug',
    'Husky',
    'Doberman',
    'Rottweiler',
    'Dachshund',
    'Boxer',
    'Other',
  ],
  Cat: [
    'Indian Billi / Domestic Shorthair',
    'Persian',
    'Siamese',
    'Maine Coon',
    'Ragdoll',
    'Bengal',
    'British Shorthair',
    'Sphynx',
    'Russian Blue',
    'Scottish Fold',
    'Other',
  ],
  Bird: [
    'Budgerigar',
    'Cockatiel',
    'Lovebird',
    'Parrot',
    'Canary',
    'Finch',
    'Macaw',
    'Other',
  ],
  Rabbit: [
    'Holland Lop',
    'Mini Rex',
    'Lionhead',
    'Netherland Dwarf',
    'Flemish Giant',
    'Other',
  ],
  Hamster: ['Syrian', 'Roborovski', 'Winter White', 'Chinese', 'Other'],
  Fish: ['Goldfish', 'Betta', 'Guppy', 'Angelfish', 'Tetra', 'Other'],
  Reptile: ['Turtle', 'Tortoise', 'Gecko', 'Iguana', 'Snake', 'Other'],
  Other: ['Other'],
};

export const breedsForSpecies = (species: string | undefined | null): string[] => {
  if (!species) return [];
  return PET_BREEDS[species] ?? ['Other'];
};
