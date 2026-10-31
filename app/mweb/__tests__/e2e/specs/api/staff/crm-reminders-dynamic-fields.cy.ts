/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunAs, signInRunMember, type Refusal } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, NO_ID } from '../../../support/api-staff';
import { runAccount } from '../../../support/run-account';

/**
 * CRM › Reminders (crm/reminder) and Dynamic Fields (crm/crm createCrmDynamicField
 * …), both CRM_RW = SUPER_ADMIN, CRM_MANAGER (crm/crm/crm.constants.ts),
 * driven as CRM_MANAGER — the CRM console's seat, grantable to a run account.
 *
 * Inert by construction: the reminder is a GENERAL one (no lead) due far in
 * the future and nothing sends reminders anywhere (they are only listed, and
 * read into a lead's AI summary when tied to that lead); the dynamic field is
 * saved INACTIVE, so no lead form renders it (crmDynamicFields leaves inactive
 * fields out unless asked). Both are deleted, and swept again in after().
 *
 * Scenario map: CRM › Reminders, Dynamic Fields.
 */

const REMINDER = 'id entity_type lead_id title due_at notes status';
const CREATE_REMINDER = `mutation E2eCreateReminder($input: CreateCrmReminderInput!) { createCrmReminder(input: $input) { ${REMINDER} } }`;
const UPDATE_REMINDER = `mutation E2eUpdateReminder($id: ID!, $input: UpdateCrmReminderInput!) { updateCrmReminder(id: $id, input: $input) { ${REMINDER} } }`;
const TOGGLE = `mutation E2eToggleReminder($id: ID!) { toggleCrmReminderDone(id: $id) { id status } }`;
const DELETE_REMINDER = `mutation E2eDeleteReminder($id: ID!) { deleteCrmReminder(id: $id) }`;
const REMINDERS = `query E2eReminders($filter: CrmReminderFilter) { crmReminders(filter: $filter) { id title status } }`;

const FIELD = 'id name label kind options { value label } applies_to_venue applies_to_host applies_to_ecomm is_active';
const CREATE_FIELD = `mutation E2eCreateField($input: CrmDynamicFieldInput!) { createCrmDynamicField(input: $input) { ${FIELD} } }`;
const UPDATE_FIELD = `mutation E2eUpdateField($id: ID!, $input: CrmDynamicFieldInput!) { updateCrmDynamicField(id: $id, input: $input) { ${FIELD} } }`;
const DELETE_FIELD = `mutation E2eDeleteField($id: ID!) { deleteCrmDynamicField(id: $id) }`;
const FIELDS = `query E2eFields($entity: CrmEntityType, $all: Boolean) { crmDynamicFields(entity: $entity, include_inactive: $all) { id name } }`;

const DAY = 24 * 60 * 60 * 1000;
const bad = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });

describe('API · CRM reminders and dynamic fields, round-tripped as the CRM seat', { testIsolation: false }, () => {
  const marker = (): string => runMarker(runAccount().stamp, 'mweb');
  const fieldKey = (): string => `e2e_${runAccount().stamp}`;
  const due = new Date(Date.now() + 400 * DAY);
  due.setUTCHours(9, 0, 0, 0);
  const range = { from: new Date(due.getTime() - DAY).toISOString(), to: new Date(due.getTime() + DAY).toISOString() };
  let token = '';

  before(() => {
    signInRunMember();
    signInRunAs(['CRM_MANAGER']).then((t) => {
      token = t;
    });
  });

  after(() => {
    cy.gql<{ crmReminders: Array<{ id: string; title: string }> }>(REMINDERS, { filter: range }, { token }).then(({ crmReminders }) =>
      crmReminders.filter((r) => r.title.includes(runAccount().stamp)).forEach((r) => cy.gql(DELETE_REMINDER, { id: r.id }, { token })),
    );
    cy.gql<{ crmDynamicFields: Array<{ id: string; name: string }> }>(FIELDS, { all: true }, { token }).then(({ crmDynamicFields }) =>
      crmDynamicFields.filter((f) => f.name === fieldKey()).forEach((f) => cy.gql(DELETE_FIELD, { id: f.id }, { token })),
    );
    revokeRunRoles(['CRM_MANAGER']);
  });

  it('CRF-01 a reminder needs a title and a due date', () => {
    cy.gqlRaw(CREATE_REMINDER, { input: { title: '  ', due_at: due.toISOString() } }, { token }).then((body) =>
      expectRefused('createCrmReminder', body, bad('Title is required')),
    );
    cy.gqlRaw(CREATE_REMINDER, { input: { title: `${marker()} reminder`, due_at: '' } }, { token }).then((body) =>
      expectRefused('createCrmReminder', body, bad('Due date is required')),
    );
  });

  it('CRF-02 a general reminder lands on its due day, is marked done and back, edited, and deleted once', () => {
    cy.gql<{ createCrmReminder: { id: string; entity_type: string; lead_id: string | null; status: string; due_at: string } }>(
      CREATE_REMINDER,
      { input: { title: `${marker()} reminder`, due_at: due.toISOString(), notes: 'e2e' } },
      { token },
    ).then(({ createCrmReminder: reminder }) => {
      expect(reminder).to.deep.include({ entity_type: 'GENERAL', lead_id: null, status: 'PENDING' });
      expect(Date.parse(reminder.due_at), 'its due time').to.equal(due.getTime());
      const listed = (filter: Record<string, unknown>) =>
        cy.gql<{ crmReminders: Array<{ id: string }> }>(REMINDERS, { filter: { ...range, ...filter } }, { token }).then(
          ({ crmReminders }) => crmReminders.map((r) => r.id),
        );
      listed({}).should('include', reminder.id);
      listed({ from: new Date(due.getTime() + DAY).toISOString() }).should('not.include', reminder.id);
      cy.gql<{ toggleCrmReminderDone: { status: string } }>(TOGGLE, { id: reminder.id }, { token }).its('toggleCrmReminderDone.status').should('equal', 'DONE');
      listed({ status: 'DONE', entity_type: 'GENERAL' }).should('include', reminder.id);
      listed({ status: 'PENDING' }).should('not.include', reminder.id);
      cy.gql<{ toggleCrmReminderDone: { status: string } }>(TOGGLE, { id: reminder.id }, { token }).its('toggleCrmReminderDone.status').should('equal', 'PENDING');
      cy.gql<{ updateCrmReminder: { title: string } }>(UPDATE_REMINDER, { id: reminder.id, input: { title: `${marker()} reminder edited` } }, { token })
        .its('updateCrmReminder.title')
        .should('equal', `${marker()} reminder edited`);
      cy.gql<{ deleteCrmReminder: boolean }>(DELETE_REMINDER, { id: reminder.id }, { token }).its('deleteCrmReminder').should('equal', true);
      cy.gqlRaw(DELETE_REMINDER, { id: reminder.id }, { token }).then((body) =>
        expectRefused('deleteCrmReminder', body, { code: 'NOT_FOUND', message: 'Reminder not found' }),
      );
    });
  });

  it('CRF-03 an inactive Select field is kept off the lead forms, its key is unique, and it edits and deletes', () => {
    const input = {
      name: fieldKey(),
      label: `${marker()} parking type`,
      kind: 'select',
      options: [
        { value: 'street', label: 'Street' },
        { value: 'valet', label: 'Valet' },
      ],
      applies_to_venue: true,
      applies_to_host: false,
      applies_to_ecomm: false,
      is_active: false,
    };
    cy.gql<{ createCrmDynamicField: { id: string } & typeof input }>(CREATE_FIELD, { input }, { token }).then(({ createCrmDynamicField: field }) => {
      expect(field).to.deep.include(input);
      cy.gql<{ crmDynamicFields: Array<{ id: string }> }>(FIELDS, { entity: 'VENUE_LEAD', all: true }, { token })
        .its('crmDynamicFields')
        .then((rows) => expect(rows.map((r) => r.id), 'in the settings list').to.include(field.id));
      cy.gql<{ crmDynamicFields: Array<{ id: string }> }>(FIELDS, { entity: 'VENUE_LEAD' }, { token })
        .its('crmDynamicFields')
        .then((rows) => expect(rows.map((r) => r.id), 'an inactive field is not on the venue form').to.not.include(field.id));
      cy.gql<{ crmDynamicFields: Array<{ id: string }> }>(FIELDS, { entity: 'HOST_LEAD', all: true }, { token })
        .its('crmDynamicFields')
        .then((rows) => expect(rows.map((r) => r.id), 'not for hosts').to.not.include(field.id));
      cy.gqlRaw(CREATE_FIELD, { input: { ...input, label: 'Another label' } }, { token }).then((body) =>
        expectRefused('createCrmDynamicField', body, { code: 'CONFLICT', message: 'A dynamic field with that key already exists' }),
      );
      cy.gql<{ updateCrmDynamicField: { name: string; label: string } }>(
        UPDATE_FIELD,
        { id: field.id, input: { ...input, name: 'renamed_key', label: `${marker()} parking` } },
        { token },
      ).then(({ updateCrmDynamicField }) => {
        expect(updateCrmDynamicField.label).to.equal(`${marker()} parking`);
        expect(updateCrmDynamicField.name, 'the storage key never changes').to.equal(fieldKey());
      });
      cy.gql<{ deleteCrmDynamicField: boolean }>(DELETE_FIELD, { id: field.id }, { token }).its('deleteCrmDynamicField').should('equal', true);
      cy.gqlRaw(DELETE_FIELD, { id: field.id }, { token }).then((body) =>
        expectRefused('deleteCrmDynamicField', body, { code: 'NOT_FOUND', message: 'Dynamic field not found' }),
      );
    });
    cy.gqlRaw(CREATE_FIELD, { input: { ...input, name: '   ' } }, { token }).then((body) =>
      expectRefused('createCrmDynamicField', body, bad('Field key is required')),
    );
  });

  it('CRF-04 CITY_ADMIN, outside the CRM seat, is refused the reminders and the field settings', () => {
    revokeRunRoles(['CRM_MANAGER']);
    asRole('CITY_ADMIN', (city) =>
      expectCallsRefused(city, [
        call('crmReminders', REMINDERS, { filter: range }),
        call('createCrmReminder', CREATE_REMINDER, { input: { title: 'e2e refused', due_at: due.toISOString() } }),
        call('crmDynamicFields', FIELDS, { all: true }),
        call('deleteCrmDynamicField', DELETE_FIELD, { id: NO_ID }),
      ]),
    );
    signInRunAs(['CRM_MANAGER']).then((t) => {
      token = t;
    });
  });
});
