import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LeadDiscoveryForm, leadDiscoveryDefaults, leadDiscoverySchema, toDiscoveryInput, type LeadDiscoveryFormValues } from '.';

vi.mock('@duncit/location', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/location')>()),
  useAdminLocations: () => ({
    loading: false,
    locations: [
      { id: 'loc-mumbai', location_name: 'Mumbai', country: 'India', country_code: 'IN', state: 'Maharashtra', state_code: 'MH', city: 'Mumbai',
        location_zones: [{ zone_name: 'Bandra' }, { zone_name: 'Andheri' }] },
    ],
  }),
}));

// The schema takes the surface's translator; echoing keys keeps the messages assertable.
const schema = leadDiscoverySchema(((key: string) => key) as Parameters<typeof leadDiscoverySchema>[0]);
const valid = { ...leadDiscoveryDefaults, city: 'Mumbai' };
const issues = (values: Partial<Record<keyof LeadDiscoveryFormValues, unknown>>) => {
  const result = schema.safeParse({ ...valid, ...values });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('leadDiscoverySchema', () => {
  it('accepts a city with the defaults and trims the text fields', () => {
    const parsed = schema.safeParse({ ...valid, city: ' Mumbai ', category: ' cafe ', keywords: ' board games ' });
    expect(parsed.success && parsed.data).toMatchObject({ city: 'Mumbai', category: 'cafe', keywords: 'board games' });
  });

  it('needs a city', () => {
    expect(issues({ city: '' })).toEqual(['city:crm.leadResearch.cityRequired']);
    expect(issues({ city: '   ' })).toEqual(['city:crm.leadResearch.cityRequired']);
  });

  it('asks for 1 to 100 qualifying leads, as a whole number', () => {
    expect(issues({ target_count: 1 })).toEqual([]);
    expect(issues({ target_count: 100 })).toEqual([]);
    expect(issues({ target_count: 0 })).toEqual(['target_count:crm.leadResearch.targetRange']);
    expect(issues({ target_count: 101 })).toEqual(['target_count:crm.leadResearch.targetRange']);
    expect(issues({ target_count: 2.5 })).toEqual(['target_count:crm.leadResearch.targetRange']);
    expect(issues({ target_count: Number.NaN })).toEqual(['target_count:crm.leadResearch.targetRange']);
  });

  it('takes no minimum score, or one from 0 to 100 with at most two decimals', () => {
    expect(issues({ min_score: null })).toEqual([]);
    expect(issues({ min_score: 0 })).toEqual([]);
    expect(issues({ min_score: 72.5 })).toEqual([]);
    expect(issues({ min_score: 100 })).toEqual([]);
    expect(issues({ min_score: -1 })).toEqual(['min_score:crm.leadResearch.minScoreRange']);
    expect(issues({ min_score: 100.01 })).toEqual(['min_score:crm.leadResearch.minScoreRange']);
    expect(issues({ min_score: 55.555 })).toEqual(['min_score:crm.leadResearch.minScoreRange']);
  });

  it('keeps place and keyword text within what the server stores', () => {
    expect(issues({ area: 'a'.repeat(80), keywords: 'k'.repeat(200) })).toEqual([]);
    expect(issues({ category: 'c'.repeat(81) })).toEqual(['category:crm.leadResearch.tooLong']);
    expect(issues({ keywords: 'k'.repeat(201) })).toEqual(['keywords:crm.leadResearch.tooLong']);
  });

  it('only searches Instagram and Google Maps', () => {
    expect(issues({ sources: ['INSTAGRAM', 'GOOGLE_MAPS'] })).toEqual([]);
    expect(issues({ sources: ['WEB'] })).toHaveLength(1);
  });
});

describe('toDiscoveryInput', () => {
  it('sends blank optional text and no ticked source as null, so the server uses its defaults', () => {
    expect(toDiscoveryInput(valid)).toEqual({
      lead_type: 'VENUE_LEAD',
      city: 'Mumbai',
      locality: null,
      category: null,
      keywords: null,
      target_count: 20,
      min_score: null,
      sources: null,
      ai_evidence: true,
    });
  });

  it('maps the area to the locality and passes every chosen value through', () => {
    const values: LeadDiscoveryFormValues = {
      lead_type: 'CREATOR_LEAD',
      city: 'Mumbai',
      area: 'Bandra',
      category: 'food blogger',
      keywords: 'vegan',
      target_count: 50,
      min_score: 70,
      sources: ['INSTAGRAM'],
      ai_evidence: false,
    };
    expect(toDiscoveryInput(values)).toEqual({
      lead_type: 'CREATOR_LEAD',
      city: 'Mumbai',
      locality: 'Bandra',
      category: 'food blogger',
      keywords: 'vegan',
      target_count: 50,
      min_score: 70,
      sources: ['INSTAGRAM'],
      ai_evidence: false,
    });
  });
});

describe('LeadDiscoveryForm', () => {
  const submit = () => fireEvent.click(screen.getByTestId('lead-discovery-submit'));
  const pick = async (name: RegExp, option: string) => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByText(option));
  };

  it('refuses to start without a city and says why', async () => {
    const onSubmit = vi.fn();
    render(<LeadDiscoveryForm onSubmit={onSubmit} />);
    submit();
    expect(await screen.findByText('Pick the city to search')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses an out-of-range target and minimum score', async () => {
    const onSubmit = vi.fn();
    render(<LeadDiscoveryForm onSubmit={onSubmit} />);
    await pick(/^City/, 'Mumbai');
    fireEvent.change(screen.getByTestId('lead-discovery-target_count'), { target: { value: '101' } });
    fireEvent.change(screen.getByTestId('lead-discovery-min_score'), { target: { value: '-5' } });
    submit();
    expect(await screen.findByText('Enter a whole number from 1 to 100')).toBeInTheDocument();
    expect(screen.getByText('Enter a score from 0 to 100, with at most 2 decimals')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('lead-discovery-target_count'), { target: { value: '' } });
    submit();
    expect(await screen.findByText('Enter a whole number from 1 to 100')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits every field entered', async () => {
    const onSubmit = vi.fn();
    render(<LeadDiscoveryForm onSubmit={onSubmit} />);
    await pick(/^Lead type/, 'Community lead');
    await pick(/^City/, 'Mumbai');
    await pick(/^Area/, 'Bandra');
    fireEvent.change(screen.getByTestId('lead-discovery-category'), { target: { value: 'running club' } });
    fireEvent.change(screen.getByTestId('lead-discovery-keywords'), { target: { value: ' sunday ' } });
    fireEvent.change(screen.getByTestId('lead-discovery-target_count'), { target: { value: '35' } });
    fireEvent.change(screen.getByTestId('lead-discovery-min_score'), { target: { value: '65.5' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Instagram' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Let AI quote evidence from public pages' }));
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      lead_type: 'COMMUNITY_LEAD',
      city: 'Mumbai',
      area: 'Bandra',
      category: 'running club',
      keywords: 'sunday',
      target_count: 35,
      min_score: 65.5,
      sources: ['INSTAGRAM'],
      ai_evidence: false,
    });
  });

  it('clears a minimum score back to none, and unticks a source', async () => {
    const onSubmit = vi.fn();
    render(<LeadDiscoveryForm onSubmit={onSubmit} />);
    await pick(/^City/, 'Mumbai');
    fireEvent.change(screen.getByTestId('lead-discovery-min_score'), { target: { value: '40' } });
    fireEvent.change(screen.getByTestId('lead-discovery-min_score'), { target: { value: '' } });
    const maps = screen.getByRole('checkbox', { name: 'Google Maps' });
    fireEvent.click(maps);
    fireEvent.click(maps);
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ min_score: null, sources: [] });
  });

  it('labels the button by what is happening and offers Cancel when asked to', () => {
    const onCancel = vi.fn();
    const { rerender } = render(<LeadDiscoveryForm onSubmit={vi.fn()} onCancel={onCancel} />);
    expect(screen.getByTestId('lead-discovery-submit')).toHaveTextContent('Start discovery');
    fireEvent.click(screen.getByTestId('lead-discovery-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(<LeadDiscoveryForm onSubmit={vi.fn()} onCancel={onCancel} submitting />);
    expect(screen.getByTestId('lead-discovery-submit')).toHaveTextContent('Starting…');
    expect(screen.getByTestId('lead-discovery-cancel')).toBeDisabled();
  });
});
