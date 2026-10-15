import { diffEntity, snapshotEntity } from '../../entityAudit.service';
import { ENTITY_AUDIT_CONFIG } from '../../entityAudit.fields';

/**
 * A venue's food licences, food tables and videos are part of "the record" the
 * change log watches: an edit to any of them is one row naming that field.
 */

const venue = (over: Record<string, unknown> = {}) => ({
  venue_name: 'Sunset Cafe',
  food_licences: {
    fssai_number: '10020011000123',
    fssai_document_url: 'https://cdn/fssai.pdf',
    liquor_licence_number: '',
    liquor_document_url: '',
  },
  food_tables: ['T1', 'T2'],
  videos: ['https://cdn/a.mp4'],
  ...over,
});

const diffVenue = (before: unknown, after: unknown) =>
  diffEntity('VENUE', snapshotEntity('VENUE', before), snapshotEntity('VENUE', after));

describe('VENUE change log — food licences, tables and videos', () => {
  it('watches every new path under its own label', () => {
    const labels = new Map(ENTITY_AUDIT_CONFIG.VENUE.fields.map((f) => [f.path, f.label]));
    expect(labels.get('food_licences.fssai_number')).toBe('FSSAI Number');
    expect(labels.get('food_licences.fssai_document_url')).toBe('FSSAI Licence Document');
    expect(labels.get('food_licences.liquor_licence_number')).toBe('Liquor Licence Number');
    expect(labels.get('food_licences.liquor_document_url')).toBe('Liquor Licence Document');
    expect(labels.get('food_tables')).toBe('Food Tables');
    expect(labels.get('videos')).toBe('Videos');
  });

  it('records a licence number and document change as one row each', () => {
    const changes = diffVenue(
      venue(),
      venue({
        food_licences: {
          fssai_number: '10020011000999',
          fssai_document_url: 'https://cdn/fssai.pdf',
          liquor_licence_number: 'LIQ-7',
          liquor_document_url: 'https://cdn/liquor.pdf',
        },
      })
    );

    expect(changes).toEqual([
      { field: 'food_licences.fssai_number', field_label: 'FSSAI Number', old_value: '10020011000123', new_value: '10020011000999' },
      { field: 'food_licences.liquor_licence_number', field_label: 'Liquor Licence Number', old_value: '', new_value: 'LIQ-7' },
      { field: 'food_licences.liquor_document_url', field_label: 'Liquor Licence Document', old_value: '', new_value: 'https://cdn/liquor.pdf' },
    ]);
  });

  it('treats tables and videos as ordered lists: a reorder is a change', () => {
    const changes = diffVenue(venue(), venue({ food_tables: ['T2', 'T1'], videos: ['https://cdn/a.mp4', 'https://youtu.be/x'] }));

    expect(changes.map((c) => c.field)).toEqual(['food_tables', 'videos']);
    expect(changes[0]).toMatchObject({ old_value: 'T1, T2', new_value: 'T2, T1' });
    expect(changes[1]).toMatchObject({ old_value: 'https://cdn/a.mp4', new_value: 'https://cdn/a.mp4, https://youtu.be/x' });
  });

  it('records nothing for a re-save, and treats a venue saved before these fields existed as empty', () => {
    expect(diffVenue(venue(), venue())).toEqual([]);

    const legacy = { venue_name: 'Sunset Cafe' };
    const added = diffVenue(legacy, venue({ food_licences: {}, food_tables: [] }));
    expect(added).toEqual([{ field: 'videos', field_label: 'Videos', old_value: '', new_value: 'https://cdn/a.mp4' }]);
  });
});
