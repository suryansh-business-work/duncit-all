import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import DuplicateDialog from '../../src/pages/cms/pages-tab/DuplicateDialog';
import { toDuplicateValues } from '../../src/pages/cms/pages-tab/duplicate-form';
import { DUPLICATE_CMS_PAGE, type CmsPageRow } from '../../src/pages/cms/queries/pages';
import { renderWithProviders } from '../testkit';
import { en, label } from '../en';
import { makeCmsPageRow } from '../mocks/cms.mock';
import { mutationOf, resetApollo } from '../hooks-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));

const about = makeCmsPageRow({ id: 'page-4', title: 'About us', path: '/about' });

const mount = (page: CmsPageRow | null = about) => {
  const onClose = vi.fn();
  const onDuplicated = vi.fn();
  renderWithProviders(<DuplicateDialog page={page} onClose={onClose} onDuplicated={onDuplicated} />);
  return { onClose, onDuplicated };
};

const titleField = () => screen.getByLabelText(label('websiteApp.cms.pageForm.title'));
const pathField = () => screen.getByLabelText(label('websiteApp.cms.pageForm.path'));
const submit = () => fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.pages.duplicate') }));

beforeEach(() => {
  resetApollo();
});

describe('toDuplicateValues', () => {
  it('suggests the copy next to the original, and the home page as /home-copy', () => {
    expect(toDuplicateValues('About us (copy)', '/about')).toEqual({ title: 'About us (copy)', path: '/about-copy' });
    expect(toDuplicateValues('Home (copy)', '/')).toEqual({ title: 'Home (copy)', path: '/home-copy' });
  });
});

describe('DuplicateDialog', () => {
  it('is closed without a page', () => {
    mount(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('suggests a copy title and address, then duplicates the page there', async () => {
    const { onClose, onDuplicated } = mount();
    expect(screen.getByRole('dialog', { name: en('websiteApp.cms.pages.duplicateTitle') })).toBeInTheDocument();
    expect(titleField()).toHaveValue(en('websiteApp.cms.pages.copyOf', { title: 'About us' }));
    expect(pathField()).toHaveValue('/about-copy');

    fireEvent.change(titleField(), { target: { value: '  About the team ' } });
    fireEvent.change(pathField(), { target: { value: ' /About-Team ' } });
    submit();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mutationOf(DUPLICATE_CMS_PAGE)).toHaveBeenCalledWith({ variables: { id: 'page-4', title: 'About the team', path: '/about-team' } });
    expect(onDuplicated).toHaveBeenCalledTimes(1);
  });

  it('refuses a blank title and an address that is not a site path', async () => {
    const { onClose } = mount();
    fireEvent.change(titleField(), { target: { value: '   ' } });
    fireEvent.change(pathField(), { target: { value: 'about/' } });
    submit();
    expect(await screen.findByText(en('websiteApp.cms.pageForm.errTitle'))).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.pageForm.errPath'))).toBeInTheDocument();
    expect(mutationOf(DUPLICATE_CMS_PAGE)).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps the dialog open with the server's reason when the address is taken", async () => {
    mutationOf(DUPLICATE_CMS_PAGE).mockRejectedValue({ message: 'x', errors: [{ message: 'A page already lives at /about-copy.', extensions: { code: 'CONFLICT' } }] });
    const { onClose, onDuplicated } = mount();
    submit();
    expect(await within(screen.getByRole('dialog')).findByText('A page already lives at /about-copy.')).toBeInTheDocument();
    expect(onDuplicated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the console sentence for an unexpected failure', async () => {
    mutationOf(DUPLICATE_CMS_PAGE).mockRejectedValue(new Error('socket hang up'));
    const { onDuplicated } = mount();
    submit();
    expect(await screen.findByText(en('websiteApp.cms.pages.duplicateFailed'))).toBeInTheDocument();
    expect(screen.queryByText(/socket/)).not.toBeInTheDocument();
    expect(onDuplicated).not.toHaveBeenCalled();
  });

  it('closes on Cancel without duplicating', () => {
    const { onClose } = mount();
    fireEvent.click(screen.getByRole('button', { name: en('shell.common.cancel') }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mutationOf(DUPLICATE_CMS_PAGE)).not.toHaveBeenCalled();
  });
});
