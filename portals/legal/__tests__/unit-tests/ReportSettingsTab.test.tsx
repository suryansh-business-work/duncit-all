import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { ConfirmProvider, notifyError, notifySuccess } from '@duncit/dialogs';
import ReportSettingsTab from '../../src/pages/ugc-monitoring/settings/ReportSettingsTab';
import { renderWithProviders } from '../testkit';
import {
  createReportCategoryMock,
  deleteReportCategoryMock,
  makeReportCategory,
  updateReportCategoryMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

/**
 * Legal owns the list of reasons the report dialog offers. What is saved here
 * is what mWeb and the native app show the next time the dialog opens.
 */
const SPAM = makeReportCategory();
const COPYRIGHT = makeReportCategory({
  id: 'cat-2',
  key: 'COPYRIGHT',
  label: 'Copyright issue',
  description: '',
  requires_details: true,
  sort_order: 5,
  is_active: false,
});

const renderTab = (mocks: MockedResponse[] = []) =>
  renderWithProviders(
    <ConfirmProvider>
      <ReportSettingsTab />
    </ConfirmProvider>,
    { mocks },
  );

const openAdd = async () => {
  fireEvent.click(await screen.findByTestId('report-category-add'));
  return screen.findByTestId('report-category-dialog');
};

const field = (testId: string) => screen.getByTestId(testId);
const typeInto = (testId: string, value: string) =>
  fireEvent.change(field(testId), { target: { value } });

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
  __setTableRows([SPAM, COPYRIGHT]);
});

describe('ReportSettingsTab — the list', () => {
  it('shows each category with whether the reporter must explain and whether it is shown', async () => {
    renderTab();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    const [spam, copyright] = screen.getAllByTestId('table-row');

    expect(within(spam).getByText('Spam or misleading')).toBeInTheDocument();
    expect(within(spam).getByText('Promotions, scams or repeated links.')).toBeInTheDocument();
    expect(within(spam).getAllByText('Optional').length).toBeGreaterThan(0);
    expect(within(spam).getAllByText('Active').length).toBeGreaterThan(0);

    expect(within(copyright).getAllByText('Required').length).toBeGreaterThan(0);
    expect(within(copyright).getAllByText('Inactive').length).toBeGreaterThan(0);
  });

  it('says so when there are no categories', async () => {
    __setTableRows([]);
    renderTab();
    expect(
      await screen.findByText('No report categories yet. Add one so people can report content.'),
    ).toBeInTheDocument();
  });
});

describe('ReportSettingsTab — adding a category', () => {
  it('creates it with the trimmed text and the chosen switches, then confirms', async () => {
    renderTab([
      createReportCategoryMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return (
          input.label === 'Harassment' &&
          input.description === 'Targets a person.' &&
          input.requires_details === true &&
          input.sort_order === 3 &&
          input.is_active === false
        );
      }),
    ]);
    const dialog = await openAdd();
    expect(within(dialog).getByText('Add category')).toBeInTheDocument();

    typeInto('report-category-label', '  Harassment ');
    typeInto('report-category-description', ' Targets a person. ');
    typeInto('report-category-order', '3');
    fireEvent.click(field('report-category-requires_details'));
    fireEvent.click(field('report-category-is_active'));
    fireEvent.click(field('report-category-save'));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Category saved'));
    await waitFor(() => expect(screen.queryByTestId('report-category-dialog')).not.toBeInTheDocument());
  });

  it('leaves the position to the server when it is blank', async () => {
    renderTab([
      createReportCategoryMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return input.sort_order === undefined && input.is_active === true;
      }),
    ]);
    await openAdd();
    typeInto('report-category-label', 'Impersonation');
    fireEvent.click(field('report-category-save'));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Category saved'));
  });

  it('refuses a missing name and does not call the server', async () => {
    renderTab();
    await openAdd();
    fireEvent.click(field('report-category-save'));

    expect(await screen.findByText('Give the category a name')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('refuses an over-long name and description', async () => {
    renderTab();
    await openAdd();
    typeInto('report-category-label', 'n'.repeat(81));
    typeInto('report-category-description', 'd'.repeat(201));
    fireEvent.click(field('report-category-save'));

    expect(await screen.findByText('Keep the name under 80 characters')).toBeInTheDocument();
    expect(screen.getByText('Keep the description under 200 characters')).toBeInTheDocument();
  });

  it('refuses a position that is not a whole number', async () => {
    renderTab();
    await openAdd();
    typeInto('report-category-label', 'Impersonation');
    typeInto('report-category-order', '-1');
    fireEvent.click(field('report-category-save'));

    expect(await screen.findByText('Enter a whole number, 0 or more')).toBeInTheDocument();
  });

  it("shows the server's reason when the create is refused", async () => {
    renderTab([createReportCategoryMock(() => true, 'A category with this name exists')]);
    await openAdd();
    typeInto('report-category-label', 'Spam');
    fireEvent.click(field('report-category-save'));

    expect(await screen.findByTestId('report-category-error')).toHaveTextContent(
      'A category with this name exists',
    );
    expect(notifySuccess).not.toHaveBeenCalled();
    // The dialog stays open so nothing typed is lost.
    expect(screen.getByTestId('report-category-dialog')).toBeInTheDocument();
  });

  it('falls back to its own words when the refusal carries none', async () => {
    renderTab([createReportCategoryMock(() => true, '')]);
    await openAdd();
    typeInto('report-category-label', 'Spam');
    fireEvent.click(field('report-category-save'));

    expect(await screen.findByTestId('report-category-error')).toHaveTextContent(
      'Could not save this category',
    );
  });

  it('cannot be dismissed while the save is in flight', async () => {
    renderTab([{ ...createReportCategoryMock(), delay: 400 }]);
    const dialog = await openAdd();
    typeInto('report-category-label', 'Impersonation');
    fireEvent.click(field('report-category-save'));

    await waitFor(() => expect(field('report-category-save')).toBeDisabled());
    expect(field('report-category-cancel')).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(screen.getByTestId('report-category-dialog')).toBeInTheDocument();

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Category saved'));
  });

  it('closes on Escape when nothing is being saved', async () => {
    renderTab();
    const dialog = await openAdd();
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(screen.queryByTestId('report-category-dialog')).not.toBeInTheDocument());
  });

  it('closes on Cancel without saving', async () => {
    renderTab();
    await openAdd();
    fireEvent.click(field('report-category-cancel'));

    await waitFor(() => expect(screen.queryByTestId('report-category-dialog')).not.toBeInTheDocument());
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('ReportSettingsTab — editing a category', () => {
  it('opens from a row click seeded with the saved values and updates by id', async () => {
    renderTab([
      updateReportCategoryMock(
        (variables) =>
          variables.id === 'cat-2' &&
          JSON.stringify(variables.input) ===
            JSON.stringify({
              label: 'Copyright or trademark',
              description: '',
              requires_details: true,
              sort_order: 5,
              is_active: false,
            }),
      ),
    ]);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    fireEvent.click(screen.getAllByTestId('table-row')[1]);

    const dialog = await screen.findByTestId('report-category-dialog');
    expect(within(dialog).getByText('Edit category')).toBeInTheDocument();
    expect(field('report-category-label')).toHaveValue('Copyright issue');
    expect(field('report-category-order')).toHaveValue('5');
    expect(field('report-category-requires_details')).toBeChecked();
    expect(field('report-category-is_active')).not.toBeChecked();

    typeInto('report-category-label', 'Copyright or trademark');
    fireEvent.click(field('report-category-save'));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Category saved'));
  });

  it('opens from the row Edit button, named for the category', async () => {
    renderTab();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Spam or misleading' }));

    await screen.findByTestId('report-category-dialog');
    expect(field('report-category-label')).toHaveValue('Spam or misleading');
  });

  it('re-seeds the form when the dialog is reopened on a different category', async () => {
    renderTab();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Spam or misleading' }));
    await screen.findByTestId('report-category-dialog');
    fireEvent.click(field('report-category-cancel'));
    await waitFor(() => expect(screen.queryByTestId('report-category-dialog')).not.toBeInTheDocument());

    // Adding afterwards starts from a blank form, not the last edited row.
    fireEvent.click(screen.getByTestId('report-category-add'));
    await screen.findByTestId('report-category-dialog');
    expect(field('report-category-label')).toHaveValue('');
    expect(field('report-category-is_active')).toBeChecked();
  });
});

describe('ReportSettingsTab — deleting a category', () => {
  const askToDelete = async () => {
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Spam or misleading' }));
    return screen.findByRole('dialog');
  };

  it('asks first, then deletes and says so', async () => {
    renderTab([deleteReportCategoryMock('cat-1')]);
    const dialog = await askToDelete();
    expect(within(dialog).getByText('Delete this category?')).toBeInTheDocument();
    expect(within(dialog).getByText(/“Spam or misleading” leaves the report dialog/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Category deleted'));
  });

  it('does nothing when the confirmation is declined', async () => {
    // No delete mock is registered: calling the server would surface as an error.
    renderTab();
    const dialog = await askToDelete();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();
    // The Delete click did not also open the row for editing.
    expect(screen.queryByTestId('report-category-dialog')).not.toBeInTheDocument();
  });

  it("tells Legal the server's reason when the category cannot be deleted", async () => {
    renderTab([deleteReportCategoryMock('cat-1', 'Reports were filed under this category')]);
    const dialog = await askToDelete();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('Reports were filed under this category'),
    );
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('falls back to its own words when the refusal carries none', async () => {
    renderTab([deleteReportCategoryMock('cat-1', '')]);
    const dialog = await askToDelete();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not delete this category'));
  });
});
