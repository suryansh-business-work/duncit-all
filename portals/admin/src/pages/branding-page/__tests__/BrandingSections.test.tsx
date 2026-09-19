import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LegalLinksSection from '../LegalLinksSection';
import LoginBackgroundSection from '../LoginBackgroundSection';
import PlatformAssetsSection from '../PlatformAssetsSection';
import WebsiteAssetsSection from '../WebsiteAssetsSection';
import { PLATFORM_SECTIONS } from '../sizeGuides';
import type { BrandingFormState } from '../queries';
import { FormHarness } from './form-harness';

vi.mock('../../../components/MediaPickerField', async () => ({
  default: (await import('./form-harness')).MediaPickerFieldStub,
}));

/** The last form a section wrote. */
const lastForm = (onForm: ReturnType<typeof vi.fn>) => onForm.mock.lastCall?.[0] as BrandingFormState;

const typeInto = (name: string, value: string) => {
  fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
};

describe('LegalLinksSection', () => {
  it('stores both legal links with surrounding spaces trimmed', () => {
    const onForm = vi.fn();
    render(
      <FormHarness onForm={onForm}>
        {(form, setForm) => <LegalLinksSection form={form} setForm={setForm} />}
      </FormHarness>,
    );

    typeInto('Terms & Conditions URL', '  https://duncit.com/terms  ');
    expect(lastForm(onForm).terms_url).toBe('https://duncit.com/terms');

    typeInto('Privacy Policy URL', 'https://duncit.com/privacy ');
    expect(lastForm(onForm)).toMatchObject({
      terms_url: 'https://duncit.com/terms',
      privacy_url: 'https://duncit.com/privacy',
    });
  });
});

describe('LoginBackgroundSection', () => {
  it('keeps the gradient (no pickers) until a switch is turned on', () => {
    render(
      <FormHarness onForm={vi.fn()}>
        {(form, setForm) => <LoginBackgroundSection form={form} setForm={setForm} />}
      </FormHarness>,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('switch', { name: 'Background image' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Background video' })).not.toBeChecked();
  });

  it('switches the image backdrop on and stores the picked image', () => {
    const onForm = vi.fn();
    render(
      <FormHarness onForm={onForm}>
        {(form, setForm) => <LoginBackgroundSection form={form} setForm={setForm} />}
      </FormHarness>,
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Background image' }));
    expect(lastForm(onForm).login_background_image_enabled).toBe(true);

    typeInto('Background image', 'https://cdn.duncit.com/login/bg.jpg');
    expect(lastForm(onForm).login_background_image_url).toBe('https://cdn.duncit.com/login/bg.jpg');
  });

  it('switches the video backdrop on and previews the picked video', () => {
    const onForm = vi.fn();
    const { container } = render(
      <FormHarness onForm={onForm}>
        {(form, setForm) => <LoginBackgroundSection form={form} setForm={setForm} />}
      </FormHarness>,
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Background video' }));
    expect(container.querySelector('video')).toBeNull();

    typeInto('Background video', 'https://cdn.duncit.com/login/bg.mp4');
    expect(lastForm(onForm)).toMatchObject({
      login_background_video_enabled: true,
      login_background_video_url: 'https://cdn.duncit.com/login/bg.mp4',
    });
    expect(container.querySelector('video')).toHaveAttribute('src', 'https://cdn.duncit.com/login/bg.mp4');
  });
});

describe('WebsiteAssetsSection', () => {
  it('writes every website asset and store link to its own field', () => {
    const onForm = vi.fn();
    render(
      <FormHarness onForm={onForm}>
        {(form, setForm) => <WebsiteAssetsSection form={form} setForm={setForm} />}
      </FormHarness>,
    );

    typeInto('Header logo', 'https://cdn.duncit.com/web/header.svg');
    typeInto('Footer logo', 'https://cdn.duncit.com/web/footer.svg');
    typeInto('Favicon', 'https://cdn.duncit.com/web/favicon.png');
    typeInto('Android app URL (Google Play)', 'https://play.google.com/store/apps/details?id=com.duncit');
    typeInto('iOS app URL (App Store)', 'https://apps.apple.com/app/duncit/id1');
    typeInto('Minimum supported app version', '1.50.0');

    expect(lastForm(onForm)).toMatchObject({
      website_header_logo_url: 'https://cdn.duncit.com/web/header.svg',
      website_footer_logo_url: 'https://cdn.duncit.com/web/footer.svg',
      website_favicon_url: 'https://cdn.duncit.com/web/favicon.png',
      android_app_url: 'https://play.google.com/store/apps/details?id=com.duncit',
      ios_app_url: 'https://apps.apple.com/app/duncit/id1',
      app_min_supported_version: '1.50.0',
    });
  });
});

describe('PlatformAssetsSection', () => {
  const [mweb] = PLATFORM_SECTIONS;

  it('reads a stored empty splash type as Image and stores favicon, logo and splash per platform', () => {
    const onForm = vi.fn();
    render(
      <FormHarness onForm={onForm} initial={{ mweb_splash_type: '' }}>
        {(form, setForm) => <PlatformAssetsSection prefix="mweb" sizes={mweb.sizes} form={form} setForm={setForm} />}
      </FormHarness>,
    );

    expect(screen.getByRole('button', { name: 'Image' })).toHaveAttribute('aria-pressed', 'true');
    typeInto('Favicon', 'https://cdn.duncit.com/mweb/favicon.png');
    typeInto('Logo', 'https://cdn.duncit.com/mweb/logo.svg');
    typeInto('Splash image', 'https://cdn.duncit.com/mweb/splash.jpg');

    expect(lastForm(onForm)).toMatchObject({
      mweb_favicon_url: 'https://cdn.duncit.com/mweb/favicon.png',
      mweb_logo_url: 'https://cdn.duncit.com/mweb/logo.svg',
      mweb_splash_url: 'https://cdn.duncit.com/mweb/splash.jpg',
    });
  });

  it('switches the splash to a video with a live preview, and ignores re-pressing the active choice', () => {
    const onForm = vi.fn();
    const { container } = render(
      <FormHarness onForm={onForm}>
        {(form, setForm) => (
          <PlatformAssetsSection prefix="mobile" sizes={PLATFORM_SECTIONS[1].sizes} form={form} setForm={setForm} />
        )}
      </FormHarness>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Video' }));
    expect(lastForm(onForm).mobile_splash_type).toBe('VIDEO');
    expect(screen.getByText(PLATFORM_SECTIONS[1].sizes.splashVideo)).toBeInTheDocument();

    typeInto('Splash video', 'https://cdn.duncit.com/mobile/splash.mp4');
    expect(container.querySelector('video')).toHaveAttribute('src', 'https://cdn.duncit.com/mobile/splash.mp4');

    const writes = onForm.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Video' }));
    expect(onForm).toHaveBeenCalledTimes(writes);
  });

  it('shows the size note only for the platforms that carry one', () => {
    const noted = { ...mweb.sizes, note: 'Upload once — every portal shares it.' };
    const { unmount } = render(
      <FormHarness onForm={vi.fn()}>
        {(form, setForm) => <PlatformAssetsSection prefix="portals" sizes={noted} form={form} setForm={setForm} />}
      </FormHarness>,
    );
    expect(screen.getByText('Upload once — every portal shares it.')).toBeInTheDocument();
    unmount();

    render(
      <FormHarness onForm={vi.fn()}>
        {(form, setForm) => (
          <PlatformAssetsSection prefix="portals" sizes={{ ...mweb.sizes, note: undefined }} form={form} setForm={setForm} />
        )}
      </FormHarness>,
    );
    expect(screen.queryByText('Upload once — every portal shares it.')).toBeNull();
  });
});
