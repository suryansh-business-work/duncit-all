import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import AssigneeField from '@/forms/fields/AssigneeField';
import { CRM_ASSIGNABLE_USERS } from '@/api/crmUsers.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

/**
 * Internal Lead Tracking › Assigned To: a searchable CRM team list that stores
 * the member's id and name together, and shows a legacy typed name until a
 * real member is picked.
 */

interface Values {
  assigned_to: string;
  assigned_user_id: string;
}

const priya = { id: 'u-priya', name: 'Priya Sharma', email: 'priya@duncit.test', roles: ['CRM_MANAGER'], is_staff: true };
const amit = { id: 'u-amit', name: 'Amit Rao', email: 'amit@duncit.test', roles: ['SUPER_ADMIN'], is_staff: true };

const search = (term: string | null, users: unknown[]): MockedResponse => ({
  request: { query: CRM_ASSIGNABLE_USERS, variables: { search: term, limit: 20 } },
  result: { data: { crmAssignableUsers: users } },
  maxUsageCount: 5,
});

function Probe() {
  const values = useWatch<Values>();
  return <output data-testid="values">{`${values.assigned_user_id ?? ''}|${values.assigned_to ?? ''}`}</output>;
}

function Form({ initial, children }: Readonly<{ initial: Values; children: ReactNode }>) {
  const methods = useForm<Values>({ defaultValues: initial });
  return (
    <FormProvider {...methods}>
      {children}
      <Probe />
    </FormProvider>
  );
}

const renderField = (initial: Values, mocks: MockedResponse[]) =>
  renderWithApollo(
    <Form initial={initial}>
      <AssigneeField />
    </Form>,
    mocks,
  );

describe('AssigneeField', () => {
  it('searches the team and stores the picked member as id and name', async () => {
    renderField({ assigned_to: '', assigned_user_id: '' }, [search(null, [priya, amit]), search('pri', [priya])]);

    const input = screen.getByTestId('assignee-input');
    expect(screen.getByText('Pick the team member who owns this lead.')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'pri' } });
    // The list re-renders once the narrowed search answers; pick from that list, not the first one.
    await waitFor(() => expect(screen.queryByRole('option', { name: /Amit Rao/ })).toBeNull());
    // Pick from the live list and check the result in one retried step: under coverage on CI
    // the narrowed search re-rendered the list between finding the option and clicking it,
    // so the click landed on a detached node and nothing was picked. Once the pick lands
    // the list closes, so no second click happens.
    await waitFor(
      () => {
        const option = screen.queryByRole('option', { name: /Priya Sharma\s*priya@duncit\.test/ });
        if (option) fireEvent.click(option);
        expect(screen.getByTestId('values')).toHaveTextContent('u-priya|Priya Sharma');
      },
      { timeout: 10_000 },
    );
    expect(input).toHaveValue('Priya Sharma');
  });

  it('keeps the current assignee selected though the first page of results does not include them', async () => {
    renderField({ assigned_to: 'Zed Last', assigned_user_id: 'u-zed' }, [search(null, [priya])]);

    expect(screen.getByTestId('assignee-input')).toHaveValue('Zed Last');
    fireEvent.mouseDown(screen.getByTestId('assignee-input'));
    expect(await screen.findByRole('option', { name: /Zed Last/ })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /Priya Sharma/ })).toBeInTheDocument();
  });

  it('shows a legacy typed name until someone is picked, and clearing leaves the lead unassigned', async () => {
    renderField({ assigned_to: 'Ravi (typed)', assigned_user_id: '' }, [search(null, [priya])]);

    expect(screen.getByText('Currently "Ravi (typed)" (typed by hand). Pick a team member to link the lead to them.')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('assignee-input'));
    fireEvent.click(await screen.findByRole('option', { name: /Priya Sharma/ }));
    expect(screen.getByTestId('values')).toHaveTextContent('u-priya|Priya Sharma');

    // MUI only shows its Clear button while the field is focused.
    fireEvent.focus(screen.getByTestId('assignee-input'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear', hidden: true }));
    expect(screen.getByTestId('values')).toHaveTextContent('|');
    expect(screen.getByTestId('values').textContent).toBe('|');
  });

  it('says when nobody matches and when the team list fails to load', async () => {
    const first = renderField({ assigned_to: '', assigned_user_id: '' }, [search(null, [])]);
    fireEvent.mouseDown(screen.getByTestId('assignee-input'));
    expect(await screen.findByText('No CRM team member matches that name')).toBeInTheDocument();
    first.unmount();

    renderField({ assigned_to: '', assigned_user_id: '' }, [
      { request: { query: CRM_ASSIGNABLE_USERS, variables: { search: null, limit: 20 } }, error: new Error('offline') },
    ]);
    expect(await screen.findByText('The team list could not be loaded. Try again in a moment.')).toBeInTheDocument();
  });
});
