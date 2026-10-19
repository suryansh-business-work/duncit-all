import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { notifySuccess } from '@duncit/dialogs';
import DesignTab from '../../src/pages/cms/design-tab/DesignTab';
import CodeTab from '../../src/pages/cms/code-tab/CodeTab';
import TokenRows from '../../src/pages/cms/design-tab/design-form/TokenRows';
import type { DesignFormValues } from '../../src/pages/cms/design-tab/design-form/design.types';
import { CMS_GOOGLE_FONTS, CMS_SITE_DESIGN, UPDATE_CMS_SITE_CODE, UPDATE_CMS_SITE_DESIGN } from '../../src/pages/cms/queries/sites';
import { renderWithProviders } from '../testkit';
import { en, label } from '../en';
import { answerQuery, mutationOf, queryOptions, resetApollo } from '../hooks-mock';
import { resetMonacoFakes } from '../mocks/monaco-editor';
import { makeSiteDesign } from '../mocks/cms.mock';

const upload = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
}));
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitDirectUpload: () => ({ upload, uploading: false }),
}));
vi.mock('@monaco-editor/react', () => import('../mocks/monaco-editor'));
vi.mock('../../src/pages/cms/components/code-field/useServerProblems', () => ({
  useServerProblems: () => ({ problems: [], checking: false }),
}));

const GOOGLE_PAGE = {
  total: 1,
  categories: ['serif'],
  fonts: [{ family: 'Lora', category: 'serif', weights: [400, 700], italic: true, popularity: 1 }],
};

/** A refusal the server words for the editor (a CONFLICT), as Apollo hands it over. */
const refusal = (message: string) => ({ message: 'x', errors: [{ message, extensions: { code: 'CONFLICT' } }] });

/** A promise the test settles itself, to look at the form mid-save. */
const deferred = () => {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

beforeEach(() => {
  resetApollo();
  resetMonacoFakes();
  upload.mockReset();
  vi.mocked(notifySuccess).mockClear();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'fonts');
});

describe.each([
  ['DesignTab', () => <DesignTab siteId="site-1" />, 'cms-design-form'],
  ['CodeTab', () => <CodeTab siteId="site-1" />, 'cms-code-form'],
])('%s — loading the site', (_name, ui, formId) => {
  it('asks for this site afresh and shows a placeholder until it arrives', () => {
    answerQuery(CMS_SITE_DESIGN, { loading: true });
    renderWithProviders(ui());
    expect(queryOptions.get(CMS_SITE_DESIGN)?.variables).toEqual({ id: 'site-1' });
    expect(screen.queryByTestId(formId)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says the site could not be loaded when the read fails', () => {
    answerQuery(CMS_SITE_DESIGN, { error: new Error('down') });
    renderWithProviders(ui());
    expect(screen.getByRole('alert')).toHaveTextContent(en('websiteApp.cms.loadFailed'));
    expect(screen.queryByTestId(formId)).not.toBeInTheDocument();
  });

  it('says the same when the site no longer exists', () => {
    answerQuery(CMS_SITE_DESIGN, { data: { cmsSite: null } });
    renderWithProviders(ui());
    expect(screen.getByRole('alert')).toHaveTextContent(en('websiteApp.cms.loadFailed'));
  });
});

describe('DesignTab — tokens and stylesheets', () => {
  const mount = () => {
    answerQuery(CMS_SITE_DESIGN, { data: { cmsSite: makeSiteDesign() } });
    renderWithProviders(<DesignTab siteId="site-1" />);
  };

  it('saves added tokens and stylesheet links, without the ones removed or left blank', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.design.addToken') }));
    const names = screen.getAllByLabelText(label('websiteApp.cms.design.tokenName'));
    expect(names).toHaveLength(2);
    fireEvent.change(names[1], { target: { value: '--space-2' } });
    fireEvent.change(screen.getAllByLabelText(label('websiteApp.cms.design.tokenValue'))[1], { target: { value: '8px' } });
    fireEvent.change(screen.getAllByLabelText(label('websiteApp.cms.design.tokenGroup'))[1], { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.design.addFont') }));
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.design.addFont') }));
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.design.addFont') }));
    const links = screen.getAllByLabelText(label('websiteApp.cms.design.fontUrl'));
    expect(links).toHaveLength(3);
    fireEvent.change(links[0], { target: { value: 'https://fonts.googleapis.com/css2?family=Lora' } });
    fireEvent.change(links[2], { target: { value: 'https://fonts.example/gone.css' } });
    fireEvent.click(screen.getAllByRole('button', { name: en('websiteApp.cms.design.removeFont') })[2]);
    await waitFor(() => expect(screen.getAllByLabelText(label('websiteApp.cms.design.fontUrl'))).toHaveLength(2));

    fireEvent.click(screen.getByTestId('cms-design-save'));
    await waitFor(() => expect(mutationOf(UPDATE_CMS_SITE_DESIGN)).toHaveBeenCalledTimes(1));
    const { variables } = mutationOf(UPDATE_CMS_SITE_DESIGN).mock.calls[0][0] ?? {};
    expect(variables).toMatchObject({
      id: 'site-1',
      input: {
        tokens: [
          { name: '--brand', value: '#ff6600', group: 'color' },
          { name: '--space-2', value: '8px', group: 'color' },
        ],
        font_urls: ['https://fonts.googleapis.com/css2?family=Lora'],
        base_css: '',
      },
    });
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.design.saved')));
  });

  it('drops a removed token, and refuses a new one until it is named', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.design.removeToken') }));
    await waitFor(() => expect(screen.queryAllByLabelText(label('websiteApp.cms.design.tokenName'))).toHaveLength(0));
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.design.addToken') }));
    // A new token starts as "--" in the colour group, with no value.
    expect(screen.getByLabelText(label('websiteApp.cms.design.tokenName'))).toHaveValue('--');
    expect(screen.getByLabelText(label('websiteApp.cms.design.tokenGroup'))).toHaveValue('color');
    fireEvent.click(screen.getByTestId('cms-design-save'));
    expect(await screen.findByText(en('websiteApp.cms.design.errTokenName'))).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.design.errTokenValue'))).toBeInTheDocument();
    expect(mutationOf(UPDATE_CMS_SITE_DESIGN)).not.toHaveBeenCalled();
  });

  it("shows the server's reason when it refuses the save, and the fallback otherwise", async () => {
    mutationOf(UPDATE_CMS_SITE_DESIGN).mockRejectedValueOnce(refusal('Someone else saved this design first.')).mockRejectedValueOnce(new Error('boom'));
    mount();
    fireEvent.click(screen.getByTestId('cms-design-save'));
    expect(await screen.findByText('Someone else saved this design first.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cms-design-save'));
    expect(await screen.findByText(en('websiteApp.cms.design.saveFailed'))).toBeInTheDocument();
    expect(screen.queryByText('Someone else saved this design first.')).not.toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('keeps the save button busy until the server answers', async () => {
    const pending = deferred();
    mutationOf(UPDATE_CMS_SITE_DESIGN).mockReturnValueOnce(pending.promise);
    mount();
    fireEvent.click(screen.getByTestId('cms-design-save'));
    await waitFor(() => expect(screen.getByTestId('cms-design-save')).toBeDisabled());
    pending.resolve({ data: {} });
    await waitFor(() => expect(screen.getByTestId('cms-design-save')).not.toBeDisabled());
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.design.saved'));
  });
});

describe('DesignTab — fonts', () => {
  const mountWithoutFonts = () => {
    const site = makeSiteDesign();
    answerQuery(CMS_SITE_DESIGN, { data: { cmsSite: { ...site, design: { ...site.design, fonts: [] } } } });
    answerQuery(CMS_GOOGLE_FONTS, { data: { cmsGoogleFonts: GOOGLE_PAGE } });
    renderWithProviders(<DesignTab siteId="site-1" />);
  };
  const fonts = () => screen.getByTestId('cms-fonts');

  it('adds a Google family to the site and saves it with the design', async () => {
    mountWithoutFonts();
    expect(within(fonts()).getByText(en('websiteApp.cms.fonts.empty'))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cms-fonts-add-google'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: `${en('websiteApp.cms.fonts.choose')}: Lora` }));
    const form = await within(dialog).findByTestId('cms-google-font-form');
    fireEvent.click(within(form).getByRole('button', { name: en('websiteApp.cms.fonts.add') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(within(fonts()).getByRole('heading', { name: 'Lora' })).toBeInTheDocument();
    expect(within(fonts()).queryByText(en('websiteApp.cms.fonts.empty'))).not.toBeInTheDocument();
    // Adding a font only edits the form; the design is saved by its own button.
    expect(mutationOf(UPDATE_CMS_SITE_DESIGN)).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('cms-design-save'));
    await waitFor(() => expect(mutationOf(UPDATE_CMS_SITE_DESIGN)).toHaveBeenCalledTimes(1));
    expect(mutationOf(UPDATE_CMS_SITE_DESIGN).mock.calls[0][0]?.variables).toMatchObject({
      input: { fonts: [{ family: 'Lora', source: 'GOOGLE', weights: [400, 700], fallback: 'serif', role: 'BODY' }] },
    });
  });

  it('adds an uploaded family through the upload dialog', async () => {
    upload.mockResolvedValue('https://ik.test/website/fonts/Brand-Regular.woff2');
    // jsdom has no font loading; the new row previews the uploaded file through FontFace.
    const addFont = vi.fn();
    vi.stubGlobal(
      'FontFace',
      class {
        load() {
          return Promise.resolve(this);
        }
      },
    );
    Object.defineProperty(document, 'fonts', { configurable: true, value: { add: addFont } });
    mountWithoutFonts();
    fireEvent.click(screen.getByTestId('cms-fonts-upload'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.fonts.family')), { target: { value: 'Brand Sans' } });
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'Brand-Regular.woff2', { type: 'font/woff2' })] } });
    expect(await within(dialog).findByText('Brand-Regular.woff2')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: en('websiteApp.cms.fonts.add') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(fonts()).getByRole('heading', { name: 'Brand Sans' })).toBeInTheDocument();
    expect(within(fonts()).getByText(en('websiteApp.cms.fonts.custom'))).toBeInTheDocument();
    await waitFor(() => expect(addFont).toHaveBeenCalledTimes(1));
  });

  it('closes either picker without adding anything', async () => {
    mountWithoutFonts();
    fireEvent.click(screen.getByTestId('cms-fonts-add-google'));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByTestId('cms-fonts-upload'));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(fonts()).getByText(en('websiteApp.cms.fonts.empty'))).toBeInTheDocument();
  });

  it('removes a chosen font from the site', async () => {
    answerQuery(CMS_SITE_DESIGN, { data: { cmsSite: makeSiteDesign() } });
    renderWithProviders(<DesignTab siteId="site-1" />);
    fireEvent.click(within(fonts()).getByRole('button', { name: `${en('websiteApp.cms.fonts.remove')}: Inter` }));
    await waitFor(() => expect(within(fonts()).getByText(en('websiteApp.cms.fonts.empty'))).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('cms-design-save'));
    await waitFor(() => expect(mutationOf(UPDATE_CMS_SITE_DESIGN)).toHaveBeenCalledTimes(1));
    expect(mutationOf(UPDATE_CMS_SITE_DESIGN).mock.calls[0][0]?.variables).toMatchObject({ input: { fonts: [] } });
  });
});

describe('CodeTab — saving the site code', () => {
  const mount = () => {
    answerQuery(CMS_SITE_DESIGN, { data: { cmsSite: { ...makeSiteDesign(), head_html: '<meta name="a">' } } });
    renderWithProviders(<CodeTab siteId="site-1" />);
  };

  it('sends every code field and confirms the save', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: en('websiteApp.cms.code.customJs') }), { target: { value: 'window.ready = true;' } });
    fireEvent.click(screen.getByTestId('cms-code-save'));
    await waitFor(() =>
      expect(mutationOf(UPDATE_CMS_SITE_CODE)).toHaveBeenCalledWith({
        variables: { id: 'site-1', input: { head_html: '<meta name="a">', body_end_html: '', custom_css: '', custom_js: 'window.ready = true;' } },
      }),
    );
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.code.saved')));
  });

  it("shows the server's reason when it refuses the save, and the fallback otherwise", async () => {
    mutationOf(UPDATE_CMS_SITE_CODE).mockRejectedValueOnce(refusal('The site changed while you were editing.')).mockRejectedValueOnce(new Error('boom'));
    mount();
    fireEvent.click(screen.getByTestId('cms-code-save'));
    expect(await screen.findByText('The site changed while you were editing.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cms-code-save'));
    expect(await screen.findByText(en('websiteApp.cms.code.saveFailed'))).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('keeps the save button busy until the server answers', async () => {
    const pending = deferred();
    mutationOf(UPDATE_CMS_SITE_CODE).mockReturnValueOnce(pending.promise);
    mount();
    fireEvent.click(screen.getByTestId('cms-code-save'));
    await waitFor(() => expect(screen.getByTestId('cms-code-save')).toBeDisabled());
    pending.resolve({ data: {} });
    await waitFor(() => expect(screen.getByTestId('cms-code-save')).not.toBeDisabled());
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.code.saved'));
  });
});

describe('TokenRows — a token saved without a value', () => {
  function Harness() {
    // A token row that came back from the server with no value at all.
    const { control } = useForm<DesignFormValues>({ defaultValues: { tokens: [{ name: '--surface', group: 'color' }], fonts: [], font_urls: [], base_css: '' } });
    return <TokenRows control={control} />;
  }

  it('still lists the token, with an empty value to fill in', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByLabelText(label('websiteApp.cms.design.tokenName'))).toHaveValue('--surface');
    expect(screen.getByLabelText(label('websiteApp.cms.design.tokenValue'))).toHaveValue('');
    fireEvent.change(screen.getByLabelText(label('websiteApp.cms.design.tokenValue')), { target: { value: '#fafafa' } });
    expect(screen.getByLabelText(label('websiteApp.cms.design.tokenValue'))).toHaveValue('#fafafa');
  });
});
