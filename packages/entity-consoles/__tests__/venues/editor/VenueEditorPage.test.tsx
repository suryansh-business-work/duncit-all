import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import VenueEditorPage, { makeVenueFormSchema } from '../../../src/venues/editor';
import { venueRecord } from '../../fixtures';

/**
 * The page is only WHICH sections a venue has, in what order, and what each is
 * handed — so the sections are stubbed and what they received is what is read.
 */
const state = vi.hoisted(() => ({
  editor: null as Record<string, unknown> | null,
  shell: null as Record<string, unknown> | null,
  sections: {} as Record<string, Record<string, unknown>>,
}));

vi.mock('../../../src/venues/editor/useVenueEditor', () => ({
  useVenueEditor: () => state.editor,
}));
vi.mock('../../../src/shared/useMediaPicker', () => ({
  default: () => ({ pickImage: 'pick-fn', open: false }),
}));
vi.mock('../../../src/shared/EditorPageShell', () => ({
  default: (props: Record<string, unknown> & { children: ReactNode }) => {
    state.shell = props;
    return <div data-testid="shell">{props.children}</div>;
  },
}));
function stub(name: string) {
  return {
    default: (props: Record<string, unknown>) => {
      state.sections[name] = props;
      return <div data-testid={name} data-section="true" />;
    },
  };
}
vi.mock('../../../src/venues/editor/VenueEditorNav', () => stub('nav'));
vi.mock('../../../src/venues/editor/sections/VenueDetailsSection', () => stub('details'));
vi.mock('../../../src/venues/editor/sections/TypeCapacitySection', () => stub('type-capacity'));
vi.mock('../../../src/venues/editor/sections/FoodSection', () => stub('food'));
vi.mock('../../../src/venues/editor/sections/AmenitiesSection', () => stub('amenities'));
vi.mock('../../../src/venues/editor/sections/DocumentsSection', () => stub('documents'));
vi.mock('../../../src/venues/editor/sections/OwnerSection', () => stub('owner'));
vi.mock('../../../src/venues/editor/sections/PayoutSection', () => stub('payout'));
vi.mock('../../../src/venues/editor/sections/LeavesSection', () => stub('leaves'));
vi.mock('../../../src/venues/editor/sections/OperationsSection', () => stub('operations'));
vi.mock('../../../src/venues/editor/sections/CancellationSection', () => stub('cancellation'));
vi.mock('../../../src/venues/editor/sections/StatusSection', () => stub('status'));

const submit = () => undefined;
const CONFIG = { category_limit: 4, capacity_item_limit: 50 };

const editorState = (over: Record<string, unknown> = {}) => ({
  form: { control: 'ctl', setValue: 'setter', handleSubmit: (fn: unknown) => `submit(${String(fn === submit)})` },
  config: CONFIG,
  venue: null,
  isEdit: false,
  canGovern: true,
  busy: false,
  saveError: null,
  loading: false,
  error: undefined,
  submit,
  ...over,
});

const renderPage = (path = '/venues/new') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/venues/new" element={<VenueEditorPage />} />
        <Route path="/venues/:venueId/edit" element={<VenueEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('VenueEditorPage', () => {
  beforeEach(() => {
    state.shell = null;
    state.sections = {};
  });

  it("draws the section strip, then the owner form's eight sections in its order, then the staff-only three", () => {
    state.editor = editorState();
    renderPage();

    const drawn = [...document.querySelectorAll('[data-section="true"]')].map((node) =>
      node.getAttribute('data-testid'),
    );
    expect(drawn).toEqual([
      'nav',
      'details',
      'type-capacity',
      'food',
      'amenities',
      'documents',
      'owner',
      'payout',
      'leaves',
      'operations',
      'cancellation',
      'status',
    ]);
  });

  it('opens the create frame and hands each section the form, the config and the picker it needs', () => {
    state.editor = editorState();
    renderPage();

    expect(state.shell).toMatchObject({
      eyebrow: 'Venues · Add',
      title: 'New venue',
      backTo: '/venues',
      saveLabel: 'Save venue',
      busy: false,
      error: null,
      onSubmit: 'submit(true)',
    });
    // A venue that does not exist yet has no stored category to protect.
    expect(state.sections.details).toEqual({
      control: 'ctl',
      onPick: 'pick-fn',
      categoryLimit: 4,
      minCategories: 0,
    });
    expect(state.sections['type-capacity']).toEqual({ control: 'ctl', setValue: 'setter', config: CONFIG });
    expect(state.sections.food).toEqual({ control: 'ctl', config: CONFIG, onPick: 'pick-fn' });
    expect(state.sections.amenities).toEqual({ control: 'ctl', config: CONFIG });
    expect(state.sections.documents).toEqual({ control: 'ctl', config: CONFIG, onPick: 'pick-fn' });
    expect(state.sections.owner).toEqual({ control: 'ctl', setValue: 'setter', isEdit: false });
    expect(state.sections.payout).toEqual({ control: 'ctl' });
    expect(state.sections.leaves).toEqual({ control: 'ctl' });
    expect(state.sections.operations).toEqual({ control: 'ctl' });
    expect(state.sections.cancellation).toEqual({ control: 'ctl' });
    expect(state.sections.status).toEqual({ control: 'ctl', canGovern: true });
  });

  it('titles an existing venue by name, returns to its record, and keeps its last category row', () => {
    state.editor = editorState({
      isEdit: true,
      venue: venueRecord,
      canGovern: false,
      busy: true,
      saveError: 'Server said no',
    });
    renderPage('/venues/v-1/edit');

    expect(state.shell).toMatchObject({
      eyebrow: 'Venues · Edit',
      title: 'Third Wave Coffee, Indiranagar',
      backTo: '/venues/v-1',
      busy: true,
      error: 'Server said no',
    });
    expect(state.sections.details).toMatchObject({ minCategories: 1 });
    expect(state.sections.owner).toMatchObject({ isEdit: true });
    expect(state.sections.status).toMatchObject({ canGovern: false });
  });

  it('lets every category row go for a stored venue that has none', () => {
    const uncategorised = {
      ...venueRecord,
      venue_categories: [],
      venue_category: { ...venueRecord.venue_category, super_category_name: '', category_name: '', sub_category_name: '', super_category_id: null, category_id: null, sub_category_id: null },
    };
    state.editor = editorState({ isEdit: true, venue: uncategorised });
    renderPage('/venues/v-1/edit');

    expect(state.sections.details).toMatchObject({ minCategories: 0 });
  });

  it('falls back to the generic edit title for a venue with no name', () => {
    state.editor = editorState({ isEdit: true, venue: { ...venueRecord, venue_name: '' } });
    renderPage('/venues/v-1/edit');
    expect(state.shell).toMatchObject({ title: 'Edit venue' });
  });

  it('says the venue was not found instead of drawing an empty form', () => {
    state.editor = editorState({ isEdit: true, venue: null });
    renderPage('/venues/gone/edit');
    expect(screen.getByText('Venue not found.')).toBeInTheDocument();
    expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
  });

  it('shows the load error and no form while the venue fails to load', () => {
    state.editor = editorState({ isEdit: true, error: new Error('boom: network') });
    renderPage('/venues/v-1/edit');
    expect(screen.getByText('boom: network')).toBeInTheDocument();
    expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
  });

  it('re-exports the form schema factory from the editor barrel', () => {
    expect(typeof makeVenueFormSchema).toBe('function');
  });
});
