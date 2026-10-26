import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EarnForm, type WebsiteEarnSection } from '../../src/pages/website/earn/earn-form';
import { en, label } from '../en';

vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitDirectUpload: () => ({ upload: vi.fn(), uploading: false }),
}));

const section: WebsiteEarnSection = {
  site: 'MAIN',
  enabled: true,
  position: 'AFTER_REELS',
  variant: 'WALL',
  accent: 'PRIMARY',
  eyebrow: 'Earn',
  heading: 'Earn with',
  heading_muted: 'Duncit',
  text: 'Host pods and earn.',
  cta_label: 'Start',
  cta_url: 'https://earnwith.duncit.com',
  images: ['https://ik.test/a.jpg'],
  floating_enabled: true,
  floating_label: 'Earn',
  updated_at: null,
};

const mount = (props: Partial<Parameters<typeof EarnForm>[0]> = {}) => {
  const onSubmit = vi.fn();
  render(<EarnForm section={section} submitting={false} errorMessage={null} onSubmit={onSubmit} {...props} />);
  return onSubmit;
};
const field = (key: string) => screen.getByLabelText(label(`websiteApp.earn.${key}`)) as HTMLInputElement;
const save = () => screen.getByRole('button', { name: en('shell.common.save') });
const choose = async (key: string, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label(`websiteApp.earn.${key}`) }));
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: option }));
};

describe('EarnForm', () => {
  it('starts from the stored section', () => {
    mount();
    expect(field('heading').value).toBe('Earn with');
    expect(field('headingMuted').value).toBe('Duncit');
    expect(field('ctaUrl').value).toBe('https://earnwith.duncit.com');
    expect(field('floatingLabel').value).toBe('Earn');
    expect(screen.getByRole('switch', { name: en('websiteApp.earn.enabled') })).toBeChecked();
    expect(screen.getByRole('switch', { name: en('websiteApp.earn.floatingEnabled') })).toBeChecked();
    expect(screen.getByAltText(en('websiteApp.earn.imageAlt', { n: 1 }))).toHaveAttribute('src', 'https://ik.test/a.jpg');
  });

  it('submits the edited values, trimmed and without the site or save time', async () => {
    const onSubmit = mount();
    fireEvent.change(field('heading'), { target: { value: '  Earn more with  ' } });
    fireEvent.change(field('eyebrow'), { target: { value: '' } });
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      enabled: true,
      position: 'AFTER_REELS',
      variant: 'WALL',
      accent: 'PRIMARY',
      eyebrow: '',
      heading: 'Earn more with',
      heading_muted: 'Duncit',
      text: 'Host pods and earn.',
      cta_label: 'Start',
      cta_url: 'https://earnwith.duncit.com',
      images: ['https://ik.test/a.jpg'],
      floating_enabled: true,
      floating_label: 'Earn',
    });
  });

  it('changes where the section sits, its layout and its accent', async () => {
    const onSubmit = mount();
    await choose('position', en('websiteApp.earn.positionBeforeFooter'));
    await choose('variant', en('websiteApp.earn.variantSplit'));
    await choose('accent', en('websiteApp.earn.accentTertiary'));
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ position: 'BEFORE_FOOTER', variant: 'SPLIT', accent: 'TERTIARY' });
  });

  it('switches the section and the floating pill off', async () => {
    const onSubmit = mount();
    fireEvent.click(screen.getByRole('switch', { name: en('websiteApp.earn.enabled') }));
    fireEvent.click(screen.getByRole('switch', { name: en('websiteApp.earn.floatingEnabled') }));
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ enabled: false, floating_enabled: false });
  });

  it('removes a photo from the wall before saving', async () => {
    const onSubmit = mount();
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.earn.imageRemove', { n: 1 }) }));
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].images).toEqual([]);
  });

  it('refuses a button link that is not https, naming the problem, and sends nothing', async () => {
    const onSubmit = mount();
    fireEvent.change(field('ctaUrl'), { target: { value: 'http://earnwith.duncit.com' } });
    fireEvent.click(save());
    expect(await screen.findByText(en('websiteApp.earn.errHttps'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('names a stored photo that is not an https link under the photo wall, and sends nothing', async () => {
    const onSubmit = mount({ section: { ...section, images: ['https://ik.test/ok.jpg', 'http://ik.test/old.jpg'] } });
    fireEvent.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent(en('websiteApp.earn.errHttps'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('names a stored photo list past the cap under the photo wall, and sends nothing', async () => {
    const many = Array.from({ length: 14 }, (_unused, index) => `https://ik.test/${index}.jpg`);
    const onSubmit = mount({ section: { ...section, images: many } });
    fireEvent.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent(en('websiteApp.earn.errImagesMax', { max: 13 }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses copy past its cap, naming the cap', async () => {
    const onSubmit = mount();
    fireEvent.change(field('eyebrow'), { target: { value: 'a'.repeat(41) } });
    fireEvent.click(save());
    expect(await screen.findByText(en('websiteApp.earn.errMax', { max: 40 }))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a save error above the form', () => {
    mount({ errorMessage: en('websiteApp.earn.saveFailed') });
    expect(screen.getByRole('alert')).toHaveTextContent(en('websiteApp.earn.saveFailed'));
  });

  it('shows no error when there is none, and disables Save while saving', () => {
    mount({ submitting: true });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: en('shell.common.saving') })).toBeDisabled();
  });
});
