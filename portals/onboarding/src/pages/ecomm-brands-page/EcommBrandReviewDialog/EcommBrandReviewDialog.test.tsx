/**
 * The e-commerce brand review dialog: what a reviewer reads about a brand, the
 * per-brand product commission they may override, and Approve / Reject.
 *
 * The commission is the money half. A stored 0 means "follow Finance's default",
 * so an untouched field holds the default and must never be saved back — that
 * would pin the brand to today's number and cut it out of every later change in
 * Finance > Default Deductions.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import EcommBrandReviewDialog from './EcommBrandReviewDialog';
import { BrandDetails } from './BrandDetails';
import { CommissionPanel } from './CommissionPanel';
import type { ReviewBrand } from './types';

const brand: ReviewBrand = {
  id: 'b1',
  status: 'SUBMITTED',
  brand_name: 'Acme Goods',
  tagline: 'Quality you can keep',
  description: 'Hand made home decor.',
  cover_image_url: 'https://cdn.duncit.com/brands/acme.jpg',
  established_year: 2019,
  registered_business_name: 'Acme Goods Pvt Ltd',
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  website_url: 'https://acme.example',
  instagram_url: 'https://instagram.com/acme',
  contact_person: 'Asha Rao',
  contact_email: 'asha@acme.example',
  contact_phone: '+91 98450 11223',
  address_line1: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560001',
  country: 'India',
  account_holder_name: 'Acme Goods Pvt Ltd',
  account_number: '123456789012',
  ifsc_code: 'HDFC0000123',
  upi_id: 'acme@hdfc',
  product_categories: ['Decor', 'Apparel'],
  product_commission_pct: 8,
  documents: [
    { type: 'GST certificate', url: 'https://cdn.duncit.com/docs/gst.pdf' },
    { type: 'PAN card', url: 'https://cdn.duncit.com/docs/pan.pdf' },
  ],
};

/** A brand with only an id: every optional field the API may omit is missing. */
const bare: ReviewBrand = { id: 'b2' };

const renderDialog = (over: Partial<Parameters<typeof EcommBrandReviewDialog>[0]> = {}) => {
  const handlers = {
    setNotes: vi.fn(),
    setTagsText: vi.fn(),
    onClose: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onSaveCommission: vi.fn(),
  };
  const props = {
    active: brand,
    notes: '',
    tagsText: '',
    savingCommission: false,
    defaultCommissionPct: 15,
    ...handlers,
    ...over,
  };
  const view = render(<EcommBrandReviewDialog {...props} />);
  return { ...handlers, view, props };
};

const commissionField = () => screen.getByLabelText('Product sales commission percentage') as HTMLInputElement;
const saveCommission = () => screen.getByRole('button', { name: /Save commission|Saving…/ });
const valueOf = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('BrandDetails', () => {
  const details = (active: ReviewBrand, over: Partial<Parameters<typeof BrandDetails>[0]> = {}) =>
    render(<BrandDetails active={active} documents={active.documents ?? []} address="" business="" bank="" {...over} />);

  it('shows the cover, the tagline and every profile row of a fully described brand', () => {
    details(brand, {
      address: '12 MG Road, Bengaluru, Karnataka, 560001, India',
      business: 'Business: Acme Goods Pvt Ltd · GSTIN: 29ABCDE1234F1Z5',
      bank: 'Acme Goods Pvt Ltd · 123456789012',
    });

    expect(screen.getByAltText('Acme Goods')).toHaveAttribute('src', 'https://cdn.duncit.com/brands/acme.jpg');
    expect(screen.getByText('Quality you can keep')).toBeInTheDocument();
    expect(valueOf('Description')).toBe('Hand made home decor.');
    expect(valueOf('Categories')).toBe('Decor, Apparel');
    expect(valueOf('Owner')).toBe('Asha Rao · asha@acme.example · +91 98450 11223');
    expect(valueOf('Business & legal')).toBe('Business: Acme Goods Pvt Ltd · GSTIN: 29ABCDE1234F1Z5');
    expect(valueOf('Address')).toBe('12 MG Road, Bengaluru, Karnataka, 560001, India');
    expect(valueOf('Payout')).toBe('Acme Goods Pvt Ltd · 123456789012');
  });

  it('shows a cover with no alternative text for a brand that has a cover but no name', () => {
    const { container } = details({ id: 'b4', cover_image_url: 'https://cdn.duncit.com/brands/x.jpg' });

    const cover = container.querySelector('img');
    expect(cover).toHaveAttribute('src', 'https://cdn.duncit.com/brands/x.jpg');
    expect(cover).toHaveAttribute('alt', '');
  });

  it('links the website and Instagram in new tabs', () => {
    details(brand);

    const website = screen.getByRole('link', { name: 'Website' });
    expect(website).toHaveAttribute('href', 'https://acme.example');
    expect(website).toHaveAttribute('target', '_blank');
    expect(website).toHaveAttribute('rel', 'noreferrer');
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/acme');
  });

  it('links only the profile the brand has when it has just one', () => {
    details({ ...brand, instagram_url: '' });
    expect(screen.getByRole('link', { name: 'Website' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Instagram' })).not.toBeInTheDocument();
  });

  it('links only Instagram when the brand has no website', () => {
    details({ ...brand, website_url: null });
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
  });

  it('lists each uploaded document as a link to the file, named by its type', () => {
    details(brand);

    const documents = screen.getByText('Documents').parentElement as HTMLElement;
    expect(within(documents).getByRole('link', { name: 'GST certificate' })).toHaveAttribute(
      'href',
      'https://cdn.duncit.com/docs/gst.pdf',
    );
    expect(within(documents).getByRole('link', { name: 'PAN card' })).toHaveAttribute(
      'href',
      'https://cdn.duncit.com/docs/pan.pdf',
    );
  });

  it('falls back to dashes and hides everything the API did not send', () => {
    details(bare);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('Payout')).not.toBeInTheDocument();
    expect(screen.queryByText('Documents')).not.toBeInTheDocument();
    for (const label of ['Description', 'Categories', 'Owner', 'Business & legal', 'Address']) {
      expect(valueOf(label)).toBe('—');
    }
  });
});

describe('CommissionPanel', () => {
  const panel = (over: Partial<Parameters<typeof CommissionPanel>[0]> = {}) => {
    const handlers = { setCommission: vi.fn(), saveCommission: vi.fn() };
    render(
      <CommissionPanel
        commission="12"
        commissionValid
        unchanged={false}
        savingCommission={false}
        defaultCommissionPct={15}
        {...handlers}
        {...over}
      />,
    );
    return handlers;
  };

  it('explains the Finance default it follows, and takes a typed override', () => {
    const { setCommission } = panel();

    expect(screen.getByText(/Defaults to the 15% set in Finance → Default Deductions/)).toBeInTheDocument();
    fireEvent.change(commissionField(), { target: { value: '9' } });
    expect(setCommission).toHaveBeenCalledWith('9');
  });

  it('shows a dash for the default while it is still loading', () => {
    panel({ defaultCommissionPct: undefined });
    expect(screen.getByText(/Defaults to the —% set in Finance/)).toBeInTheDocument();
  });

  it('names the range and refuses to save an invalid number', () => {
    panel({ commission: '140', commissionValid: false });

    expect(screen.getByText('Enter a number between 0 and 100.')).toBeInTheDocument();
    expect(commissionField()).toHaveAttribute('aria-invalid', 'true');
    expect(saveCommission()).toBeDisabled();
  });

  it('offers Save only once the number has moved off what is stored', () => {
    const { saveCommission: onSave } = panel({ commission: '12' });

    expect(saveCommission()).toBeEnabled();
    fireEvent.click(saveCommission());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('offers nothing to save for an unchanged number', () => {
    panel({ unchanged: true });
    expect(saveCommission()).toBeDisabled();
  });

  it('shows Saving… and locks Save while the write is in flight', () => {
    panel({ savingCommission: true });
    expect(saveCommission()).toHaveTextContent('Saving…');
    expect(saveCommission()).toBeDisabled();
  });
});

describe('EcommBrandReviewDialog', () => {
  it('renders nothing while no brand is open', () => {
    renderDialog({ active: null as unknown as ReviewBrand });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the brand with its status and the reviewer fields', () => {
    renderDialog({ notes: 'Looks good', tagsText: 'home, decor' });

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Review brand')).toBeInTheDocument();
    expect(dialog.getByText('Acme Goods')).toBeInTheDocument();
    expect(dialog.getByText('SUBMITTED')).toBeInTheDocument();
    expect(dialog.getByLabelText('Reviewer notes')).toHaveValue('Looks good');
    expect(dialog.getByLabelText('Tags')).toHaveValue('home, decor');
    expect(dialog.getByText('Comma separated tags for this approved brand.')).toBeInTheDocument();
  });

  it('reads Brand and no status for a brand with neither a name nor a status', () => {
    renderDialog({ active: bare });

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Brand')).toBeInTheDocument();
    expect(dialog.queryByText('SUBMITTED')).not.toBeInTheDocument();
  });

  it('builds the address, business and payout lines from the parts the brand has', () => {
    renderDialog();

    expect(valueOf('Address')).toBe('12 MG Road, Bengaluru, Karnataka, 560001, India');
    expect(valueOf('Business & legal')).toBe(
      'Business: Acme Goods Pvt Ltd · GSTIN: 29ABCDE1234F1Z5 · PAN: ABCDE1234F · Est. 2019',
    );
    expect(valueOf('Payout')).toBe('Acme Goods Pvt Ltd · 123456789012 · HDFC0000123 · acme@hdfc');
  });

  it('leaves out the parts a sparse brand lacks', () => {
    renderDialog({ active: { id: 'b3', city: 'Pune', gstin: '27AAAAA0000A1Z5', upi_id: 'x@upi' } });

    expect(valueOf('Address')).toBe('Pune');
    expect(valueOf('Business & legal')).toBe('GSTIN: 27AAAAA0000A1Z5');
    expect(valueOf('Payout')).toBe('x@upi');
  });

  it("opens the commission on the brand's own override", () => {
    renderDialog({ active: { ...brand, product_commission_pct: 8 }, defaultCommissionPct: 15 });

    expect(commissionField()).toHaveValue(8);
    // Matches what is stored, so there is nothing to save.
    expect(saveCommission()).toBeDisabled();
  });

  it('opens the commission on the Finance default when the brand has no override, and saves nothing', () => {
    const { onSaveCommission } = renderDialog({ active: { ...brand, product_commission_pct: 0 }, defaultCommissionPct: 15 });

    expect(commissionField()).toHaveValue(15);
    expect(saveCommission()).toBeDisabled();
    fireEvent.click(saveCommission());
    expect(onSaveCommission).not.toHaveBeenCalled();
  });

  it('opens the commission on the default for a brand with no commission field at all', () => {
    renderDialog({ active: { ...brand, product_commission_pct: undefined }, defaultCommissionPct: 12 });
    expect(commissionField()).toHaveValue(12);
  });

  it('waits for the Finance default rather than seeding a misleading 0, then fills it in', () => {
    const { view, props } = renderDialog({ active: { ...brand, product_commission_pct: 0 }, defaultCommissionPct: undefined });
    expect(commissionField()).toHaveValue(null);

    view.rerender(<EcommBrandReviewDialog {...props} defaultCommissionPct={15} />);

    expect(commissionField()).toHaveValue(15);
  });

  it('saves a changed commission as a number', () => {
    const { onSaveCommission } = renderDialog();

    fireEvent.change(commissionField(), { target: { value: '12.5' } });
    expect(saveCommission()).toBeEnabled();
    fireEvent.click(saveCommission());

    expect(onSaveCommission).toHaveBeenCalledWith(12.5);
  });

  it('accepts a commission of 0 and of 100, the two ends of the range', () => {
    const { onSaveCommission } = renderDialog();

    fireEvent.change(commissionField(), { target: { value: '0' } });
    fireEvent.click(saveCommission());
    fireEvent.change(commissionField(), { target: { value: '100' } });
    fireEvent.click(saveCommission());

    expect(onSaveCommission.mock.calls).toEqual([[0], [100]]);
  });

  it('refuses a blank, negative or over-100 commission', () => {
    const { onSaveCommission } = renderDialog();

    for (const bad of ['', '-1', '100.5']) {
      fireEvent.change(commissionField(), { target: { value: bad } });
      expect(saveCommission()).toBeDisabled();
      expect(screen.getByText('Enter a number between 0 and 100.')).toBeInTheDocument();
    }
    expect(onSaveCommission).not.toHaveBeenCalled();
  });

  it('keeps what the reviewer is typing when the parent hands back the same brand with a saved value', () => {
    const { view, props } = renderDialog();
    fireEvent.change(commissionField(), { target: { value: '9' } });

    view.rerender(<EcommBrandReviewDialog {...props} active={{ ...brand, product_commission_pct: 8 }} />);

    expect(commissionField()).toHaveValue(9);
  });

  it('reseeds the commission for a different brand', () => {
    const { view, props } = renderDialog();
    fireEvent.change(commissionField(), { target: { value: '9' } });

    view.rerender(<EcommBrandReviewDialog {...props} active={{ ...brand, id: 'b9', product_commission_pct: 20 }} />);

    expect(commissionField()).toHaveValue(20);
  });

  it('reseeds when the dialog is closed and reopened on the same brand', () => {
    const { view, props } = renderDialog();
    fireEvent.change(commissionField(), { target: { value: '9' } });

    view.rerender(<EcommBrandReviewDialog {...props} active={null as unknown as ReviewBrand} />);
    view.rerender(<EcommBrandReviewDialog {...props} />);

    expect(commissionField()).toHaveValue(8);
  });

  it('writes reviewer notes and tags through to the parent', () => {
    const { setNotes, setTagsText } = renderDialog();

    fireEvent.change(screen.getByLabelText('Reviewer notes'), { target: { value: 'Missing GST proof' } });
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'decor' } });

    expect(setNotes).toHaveBeenCalledWith('Missing GST proof');
    expect(setTagsText).toHaveBeenCalledWith('decor');
  });

  it('will not reject without a reason, and rejects with one', () => {
    const blank = renderDialog({ notes: '   ' });
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    blank.view.unmount();

    const { onReject } = renderDialog({ notes: 'Missing GST proof' });
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('approves and closes through the parent', () => {
    const { onApprove, onClose } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
