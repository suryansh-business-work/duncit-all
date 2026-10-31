/// <reference types="cypress" />
import { expectRefused, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, marked, refusal } from '../../../support/api-apps';
import { ensureVenue, signInRunPartner, type FixtureVenue } from '../../../support/fixture-world';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Recurring availability › "Save as template", as the owner of the run's own
 * venue: a template keeps the weekdays, one time range and a base price, and
 * the recurring dialog's "Use" fills the form from it.
 *
 * venues/slotTemplate/slotTemplate.service.ts: create needs a name, then
 * normalizeConfig refuses weekdays outside 0–6 (or none), times that are not
 * HH:mm and an end not after the start, and stores the weekdays de-duplicated
 * and sorted; listing and deleting are scoped to the
 * template's owner (`loadOwned`: invalid id, not found, not yours). A template
 * this spec saves is not the default (so auto-extend never rolls it forward),
 * carries the run marker, and is deleted again before the spec ends.
 *
 * Scenario map: Partners › Recurring Availability ("Save, apply and delete a
 * slot template" — the server half).
 */

interface Template {
  id: string;
  venue_id: string | null;
  name: string;
  is_default: boolean;
  config: { weekdays: number[]; start_time: string; end_time: string; default_price: number };
}

const FIELDS = 'id venue_id name is_default config { weekdays start_time end_time default_price }';
const LIST = `query E2eFixtureTemplates($venue: ID) { mySlotTemplates(venue_id: $venue) { ${FIELDS} } }`;
const CREATE = `mutation E2eFixtureTemplateCreate($input: CreateSlotTemplateInput!) { createSlotTemplate(input: $input) { ${FIELDS} } }`;
const DELETE = `mutation E2eFixtureTemplateDelete($id: ID!) { deleteSlotTemplate(id: $id) }`;

const bad = (message: string) => refusal('BAD_USER_INPUT', message);

describe('API · Slot templates: the owner’s own, saved only when valid', { testIsolation: false }, () => {
  let token = '';
  let venue: FixtureVenue;
  const name = marked('weekend mornings template');

  const config = (overrides: Record<string, unknown> = {}) => ({
    weekdays: [6, 0, 6],
    start_time: '07:00',
    end_time: '09:00',
    default_price: 450,
    ...overrides,
  });
  const create = (input: Record<string, unknown>) => cy.gqlRaw(CREATE, { input }, { token });
  const mine = () =>
    cy.gql<{ mySlotTemplates: Template[] }>(LIST, { venue: venue.id }, { token }).then((data) =>
      data.mySlotTemplates.filter((row) => row.name === name),
    );
  const removeMine = () => mine().then((rows) => rows.forEach((row) => cy.gql(DELETE, { id: row.id }, { token })));

  before(() => {
    signInRunPartner().then((partner) => {
      token = partner;
      ensureVenue(partner).then((found) => {
        venue = found;
        removeMine();
      });
    });
  });

  after(() => {
    removeMine();
  });

  it('VTP-01 templates are refused signed out', () => {
    cy.gqlRaw(LIST, {}, { token: null }).then((body) => expectRefused('mySlotTemplates', body, SIGNED_OUT));
    cy.gqlRaw(CREATE, { input: { name, config: config() } }, { token: null }).then((body) =>
      expectRefused('createSlotTemplate', body, SIGNED_OUT),
    );
    cy.gqlRaw(DELETE, { id: NO_ID }, { token: null }).then((body) => expectRefused('deleteSlotTemplate', body, SIGNED_OUT));
  });

  it('VTP-02 a template with no name, no or bad weekdays, malformed times or an end before its start is refused unsaved', () => {
    const refused: Array<[Record<string, unknown>, string]> = [
      [{ name: '   ', config: config() }, 'Template name is required'],
      [{ name, config: config({ weekdays: [] }) }, 'config.weekdays must be 1+ integers in 0..6'],
      [{ name, config: config({ weekdays: [1, 7] }) }, 'config.weekdays must be 1+ integers in 0..6'],
      [{ name, config: config({ start_time: '7:00' }) }, 'config times must be HH:mm (24-hour)'],
      [{ name, config: config({ start_time: '09:00', end_time: '09:00' }) }, 'config end_time must be after start_time'],
    ];
    refused.forEach(([input, message]) =>
      create({ venue_id: venue.id, ...input }).then((body) => expectRefused('createSlotTemplate', body, bad(message))),
    );
    mine().then((rows) => expect(rows, 'no refused template was saved').to.deep.equal([]));
  });

  it('VTP-03 a valid template is stored tidied, listed for its venue, and deleted by its owner only once', () => {
    create({ venue_id: venue.id, name, is_default: false, config: config() }).then((body) => {
      expect(body.errors, 'createSlotTemplate errors').to.be.undefined;
      const saved = body.data?.createSlotTemplate as Template;
      expect(saved.venue_id, 'scoped to the venue').to.equal(venue.id);
      expect(saved.is_default, 'not the default').to.equal(false);
      expect(saved.config, 'weekdays de-duplicated and sorted').to.deep.equal({
        weekdays: [0, 6],
        start_time: '07:00',
        end_time: '09:00',
        default_price: 450,
      });
      mine().then((rows) => expect(rows.map((row) => row.id), 'listed for its venue').to.deep.equal([saved.id]));
      cy.gqlRaw(DELETE, { id: saved.id }, { token }).then((deleted) => expectAnswer('deleteSlotTemplate', deleted, true));
      mine().then((rows) => expect(rows, 'gone from the list').to.deep.equal([]));
      cy.gqlRaw(DELETE, { id: saved.id }, { token }).then((again) =>
        expectRefused('deleteSlotTemplate', again, refusal('NOT_FOUND', 'Template not found')),
      );
    });
    cy.gqlRaw(DELETE, { id: 'not-a-template' }, { token }).then((body) =>
      expectRefused('deleteSlotTemplate', body, bad('Invalid template id')),
    );
  });
});
