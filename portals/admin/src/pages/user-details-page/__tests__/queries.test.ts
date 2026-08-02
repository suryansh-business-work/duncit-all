import { describe, expect, it } from 'vitest';
import { argumentsAt, fieldsAt, operationOf, variablesOf } from '../../../__tests__/gql-contract';
import {
  ASSIGN_ROLES,
  DELETE_USER,
  DELETE_USER_ACTIVITY_DAY,
  DELETE_USER_ACTIVITY_YEAR,
  DELETE_USER_CONTACT_ACTION,
  RECORD_USER_CONTACT_ACTION,
  START_RECORDED_USER_CALL,
  STATUS_META,
  UPDATE_USER,
  USER,
  USER_ACTIVITY_YEAR,
  USER_CLICKSTREAM,
  USER_CONTACT_ACTIONS,
  USER_CONTACT_ACTIONS_TABLE,
  USER_SUPPORT_TICKETS,
  type ContactActionRow,
  type EditForm,
} from '../queries';

/**
 * `satisfies` makes these lists exhaustive at compile time: drop a key and tsc
 * fails, add one to the interface without adding it here and tsc fails too. So the
 * runtime assertions below really do cover every field the screen reads.
 */
const EDIT_FORM_FIELDS = Object.keys({
  first_name: 0,
  last_name: 0,
  email: 0,
  phone_extension: 0,
  phone_number: 0,
  city: 0,
  state: 0,
  pincode: 0,
  zone: 0,
  assigned_city: 0,
  assigned_zones: 0,
  bio: 0,
  profile_photo: 0,
  status: 0,
} satisfies Record<keyof EditForm, number>);

const CONTACT_ACTION_ROW_FIELDS = Object.keys({
  id: 0,
  type: 0,
  target: 0,
  subject: 0,
  notes: 0,
  status: 0,
  duration_seconds: 0,
  recording_url: 0,
  created_at: 0,
} satisfies Record<keyof ContactActionRow, number>);

describe('USER', () => {
  it('is the AdminUser query taking a required user_id', () => {
    expect(operationOf(USER)).toEqual({ name: 'AdminUser', type: 'query' });
    expect(variablesOf(USER)).toEqual({ user_id: 'ID!' });
    expect(argumentsAt(USER, 'user')).toEqual({ user_id: '$user_id' });
  });

  it('fetches the roles catalogue alongside the user in one round trip', () => {
    expect(fieldsAt(USER)).toEqual(['user', 'roles']);
    expect(fieldsAt(USER, 'roles')).toEqual(['id', 'key', 'name', 'description', 'is_system']);
  });

  it('selects every field the edit form prefills from', () => {
    const selected = fieldsAt(USER, 'user');
    for (const field of EDIT_FORM_FIELDS) {
      expect(selected).toContain(field);
    }
  });

  it('selects the read-only profile fields the summary card renders', () => {
    const selected = fieldsAt(USER, 'user');
    expect(selected).toEqual(
      expect.arrayContaining([
        'full_name',
        'is_email_verified',
        'is_phone_verified',
        'roles',
        'dob',
        'created_at',
      ]),
    );
  });

  it('expands profile_links and interest_categories rather than returning bare ids', () => {
    expect(fieldsAt(USER, 'user', 'profile_links')).toEqual(['label', 'url']);
    expect(fieldsAt(USER, 'user', 'interest_categories')).toEqual(['id', 'name', 'level', 'parent_id']);
    expect(fieldsAt(USER, 'user')).toContain('interest_category_ids');
  });
});

describe('UPDATE_USER', () => {
  it('is the UpdateUser mutation taking the id and an UpdateUserInput', () => {
    expect(operationOf(UPDATE_USER)).toEqual({ name: 'UpdateUser', type: 'mutation' });
    expect(variablesOf(UPDATE_USER)).toEqual({ user_id: 'ID!', input: 'UpdateUserInput!' });
    expect(argumentsAt(UPDATE_USER, 'updateUser')).toEqual({ user_id: '$user_id', input: '$input' });
  });

  it('returns every edit-form field so the cached user reflects the save', () => {
    const returned = fieldsAt(UPDATE_USER, 'updateUser');
    for (const field of EDIT_FORM_FIELDS) {
      expect(returned).toContain(field);
    }
    expect(returned).toContain('user_id');
  });

  it('does not claim to update roles — that is a separate mutation', () => {
    expect(fieldsAt(UPDATE_USER, 'updateUser')).not.toContain('roles');
  });
});

describe('ASSIGN_ROLES', () => {
  it('takes role keys as a non-null list of non-null strings', () => {
    expect(operationOf(ASSIGN_ROLES)).toEqual({ name: 'AssignUserRoles', type: 'mutation' });
    expect(variablesOf(ASSIGN_ROLES)).toEqual({ user_id: 'ID!', role_keys: '[String!]!' });
  });

  it('returns the resulting role list so the roles section re-renders', () => {
    expect(fieldsAt(ASSIGN_ROLES, 'assignUserRoles')).toEqual(['user_id', 'roles']);
  });
});

describe('DELETE_USER', () => {
  it('takes a required user_id and resolves to a scalar', () => {
    expect(operationOf(DELETE_USER)).toEqual({ name: 'DeleteUser', type: 'mutation' });
    expect(variablesOf(DELETE_USER)).toEqual({ user_id: 'ID!' });
    expect(fieldsAt(DELETE_USER)).toEqual(['deleteUser']);
    expect(() => fieldsAt(DELETE_USER, 'deleteUser')).toThrow(/selects no sub-fields/);
  });
});

describe('USER_ACTIVITY_YEAR', () => {
  it('leaves the year optional so the first load gets the server default', () => {
    expect(operationOf(USER_ACTIVITY_YEAR)).toEqual({ name: 'UserActivityYear', type: 'query' });
    expect(variablesOf(USER_ACTIVITY_YEAR)).toEqual({ user_id: 'ID!', year: 'Int' });
  });

  it('returns the year picker options and the calendar day tuples', () => {
    expect(fieldsAt(USER_ACTIVITY_YEAR, 'userActivityYear')).toEqual([
      'user_id',
      'year',
      'available_years',
      'total_visits',
      'days',
    ]);
    expect(fieldsAt(USER_ACTIVITY_YEAR, 'userActivityYear', 'days')).toEqual(['date', 'count', 'level']);
  });
});

describe('activity deletion mutations', () => {
  it('deletes a single day by yyyy-MM-dd string', () => {
    expect(operationOf(DELETE_USER_ACTIVITY_DAY)).toEqual({
      name: 'DeleteUserActivityDay',
      type: 'mutation',
    });
    expect(variablesOf(DELETE_USER_ACTIVITY_DAY)).toEqual({ user_id: 'ID!', date: 'String!' });
  });

  it('requires the year when wiping a whole year, unlike the query that reads it', () => {
    expect(variablesOf(DELETE_USER_ACTIVITY_YEAR)).toEqual({ user_id: 'ID!', year: 'Int!' });
    expect(variablesOf(USER_ACTIVITY_YEAR).year).toBe('Int');
  });
});

describe('USER_CLICKSTREAM', () => {
  it('scopes events to one day with an optional limit', () => {
    expect(operationOf(USER_CLICKSTREAM)).toEqual({ name: 'UserClickstream', type: 'query' });
    expect(variablesOf(USER_CLICKSTREAM)).toEqual({ user_id: 'ID!', date: 'String!', limit: 'Int' });
    expect(argumentsAt(USER_CLICKSTREAM, 'userClickstream')).toEqual({
      user_id: '$user_id',
      date: '$date',
      limit: '$limit',
    });
  });

  it('returns the target and journey fields the timeline renders', () => {
    expect(fieldsAt(USER_CLICKSTREAM, 'userClickstream')).toEqual(
      expect.arrayContaining([
        'event_type',
        'path',
        'target_tag',
        'target_text',
        'target_label',
        'target_href',
        'super_category_slug',
        'checkout_url',
        'metadata_json',
        'occurred_at',
      ]),
    );
  });
});

describe('contact-action documents', () => {
  it('pages the table server-side through a TableQueryInput', () => {
    expect(operationOf(USER_CONTACT_ACTIONS_TABLE)).toEqual({
      name: 'UserContactActionsTable',
      type: 'query',
    });
    expect(variablesOf(USER_CONTACT_ACTIONS_TABLE)).toEqual({
      user_id: 'ID!',
      query: 'TableQueryInput',
    });
    expect(fieldsAt(USER_CONTACT_ACTIONS_TABLE, 'userContactActionsTable')).toEqual(['total', 'rows']);
  });

  it('selects every ContactActionRow field on the paged rows', () => {
    const rows = fieldsAt(USER_CONTACT_ACTIONS_TABLE, 'userContactActionsTable', 'rows');
    for (const field of CONTACT_ACTION_ROW_FIELDS) {
      expect(rows).toContain(field);
    }
  });

  it('keeps the unpaged list on the same row shape as the paged one', () => {
    const unpaged = fieldsAt(USER_CONTACT_ACTIONS, 'userContactActions');
    const paged = fieldsAt(USER_CONTACT_ACTIONS_TABLE, 'userContactActionsTable', 'rows');
    expect(unpaged).toEqual(paged);
    expect(variablesOf(USER_CONTACT_ACTIONS)).toEqual({ user_id: 'ID!' });
  });

  it('records an action through a single input object', () => {
    expect(operationOf(RECORD_USER_CONTACT_ACTION)).toEqual({
      name: 'RecordUserContactAction',
      type: 'mutation',
    });
    expect(variablesOf(RECORD_USER_CONTACT_ACTION)).toEqual({
      input: 'RecordUserContactActionInput!',
    });
    expect(fieldsAt(RECORD_USER_CONTACT_ACTION, 'recordUserContactAction')).toEqual(['id']);
  });

  it('returns the Twilio call sid when a recorded call is started', () => {
    expect(variablesOf(START_RECORDED_USER_CALL)).toEqual({ input: 'StartRecordedUserCallInput!' });
    expect(fieldsAt(START_RECORDED_USER_CALL, 'startRecordedUserCall')).toEqual([
      'id',
      'status',
      'twilio_call_sid',
    ]);
  });

  it('deletes an action by its own id, not by the user id', () => {
    expect(variablesOf(DELETE_USER_CONTACT_ACTION)).toEqual({ action_id: 'ID!' });
    expect(argumentsAt(DELETE_USER_CONTACT_ACTION, 'deleteUserContactAction')).toEqual({
      action_id: '$action_id',
    });
  });
});

describe('USER_SUPPORT_TICKETS', () => {
  it('reads contactSubmissions by email, with both filters optional', () => {
    expect(operationOf(USER_SUPPORT_TICKETS)).toEqual({ name: 'UserSupportTickets', type: 'query' });
    expect(variablesOf(USER_SUPPORT_TICKETS)).toEqual({ email: 'String', status: 'ContactStatus' });
    expect(fieldsAt(USER_SUPPORT_TICKETS)).toEqual(['contactSubmissions']);
    expect(argumentsAt(USER_SUPPORT_TICKETS, 'contactSubmissions')).toEqual({
      email: '$email',
      status: '$status',
    });
  });

  it('returns the attachments the ticket list links to', () => {
    expect(fieldsAt(USER_SUPPORT_TICKETS, 'contactSubmissions')).toEqual([
      'id',
      'name',
      'email',
      'subject',
      'message',
      'attachments',
      'status',
      'created_at',
    ]);
  });
});

describe('STATUS_META', () => {
  it('covers every status the edit form can hold', () => {
    expect(Object.keys(STATUS_META).sort((a, b) => a.localeCompare(b))).toEqual([
      'ACTIVE',
      'INACTIVE',
      'SUSPENDED',
    ]);
  });

  it('labels SUSPENDED as "Blocked" — the wording admins see is not the enum name', () => {
    expect(STATUS_META.SUSPENDED.label).toBe('Blocked');
    expect(STATUS_META.SUSPENDED.color).toBe('error');
  });

  it('gives active users a success chip and inactive users a neutral one', () => {
    expect(STATUS_META.ACTIVE).toEqual({ color: 'success', label: 'Active' });
    expect(STATUS_META.INACTIVE).toEqual({ color: 'default', label: 'Inactive' });
  });
});
