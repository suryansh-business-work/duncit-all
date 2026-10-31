import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { OccasionTheme } from '@duncit/gql-types';
import { OccasionThemeForm, themeValues } from '../../src/pages/occasions-page/occasion-theme-form';
import type { OccasionThemeFormProps } from '../../src/pages/occasions-page/occasion-theme-form';
import { HOUSE_PALETTES } from '../../src/pages/occasions-page/preview/palette';
import { renderWithProviders } from '../testkit';
import { makeFlyer, makeOccasionTheme, makeVectorLayer } from '../mocks/occasions-theme.mock';

/**
 * The phone preview as the design it is handed. The real one runs the canvas
 * renderer, which jsdom cannot paint; what the editor hands it is under test.
 */
vi.mock('../../src/pages/occasions-page/preview/PhonePreview', () => ({
  default: ({ look, mode, label }: { look: unknown; mode: string; label: string }) => (
    <div role="img" aria-label={label} data-mode={mode} data-testid="phone-preview">
      {JSON.stringify(look)}
    </div>
  ),
}));

/** The media picker as a plain address box. The real one uploads to ImageKit. */
vi.mock('../../src/components/MediaPickerField', () => ({
  default: ({ label, value, onChange, helperText }: { label: string; value: string; onChange: (url: string) => void; helperText?: string }) => (
    <div>
      <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
      <span>{helperText}</span>
    </div>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function renderForm(theme: OccasionTheme | null, props: Partial<OccasionThemeFormProps> = {}) {
  const onSubmit = vi.fn<OccasionThemeFormProps['onSubmit']>().mockResolvedValue(undefined);
  const onCancel = vi.fn<OccasionThemeFormProps['onCancel']>();
  renderWithProviders(<OccasionThemeForm theme={theme} onSubmit={onSubmit} onCancel={onCancel} {...props} />);
  return { onSubmit: props.onSubmit ?? onSubmit, onCancel };
}

/** One section of the editor, found by its heading. */
function card(title: string) {
  const element = screen.getByText(title, { selector: 'h6' }).closest<HTMLElement>('.MuiCard-root');
  if (!element) throw new Error(`no section titled ${title}`);
  return within(element);
}

const previewed = () => JSON.parse(screen.getByTestId('phone-preview').textContent ?? 'null') as Record<string, unknown>;

/** Opens a select in `scope` and picks an option from its menu. */
function choose(scope: ReturnType<typeof within>, field: RegExp, option: string) {
  fireEvent.mouseDown(scope.getByRole('combobox', { name: field }));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

const save = () => fireEvent.click(screen.getByTestId('occasion-theme-save'));

describe('OccasionThemeForm — saving', () => {
  it('saves a stored look as it stands, applies it when asked, and cancels with nothing changed', async () => {
    const theme = makeOccasionTheme();
    const { onSubmit, onCancel } = renderForm(theme);
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue('Christmas');

    // Enter in a field does not post the page; only the buttons save.
    fireEvent.submit(screen.getByTestId('occasion-theme-form'));
    expect(onSubmit).not.toHaveBeenCalled();

    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(themeValues(theme), false));
    fireEvent.click(screen.getByTestId('occasion-theme-save-apply'));
    await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith(themeValues(theme), true));
    expect(screen.queryByText('Some fields need fixing. They are marked in red.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledWith(false);
  });

  it('keeps every button off while a save is out, and shows why the server refused the last one', async () => {
    let finish: () => void = () => undefined;
    const onSubmit = vi.fn<OccasionThemeFormProps['onSubmit']>(() => new Promise<void>((resolve) => (finish = resolve)));
    renderForm(makeOccasionTheme(), { onSubmit, serverError: 'A look with this name already exists.' });
    expect(screen.getByRole('alert')).toHaveTextContent('A look with this name already exists.');

    save();
    await waitFor(() => expect(screen.getByTestId('occasion-theme-save')).toBeDisabled());
    expect(screen.getByTestId('occasion-theme-save-apply')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await act(async () => finish());
    await waitFor(() => expect(screen.getByTestId('occasion-theme-save')).toBeEnabled());
  });

  it('refuses a new look without a name, says to fix the fields, and reports typed changes on cancel', async () => {
    const { onSubmit, onCancel } = renderForm(null);
    expect(screen.getByRole('img', { name: 'Preview of Untitled look on a phone' })).toBeInTheDocument();
    save();
    expect(await screen.findByText('Give the look a name.')).toBeInTheDocument();
    expect(screen.getByText('Some fields need fixing. They are marked in red.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Holi' } });
    await waitFor(() => expect(screen.getByRole('img', { name: 'Preview of Holi on a phone' })).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Give the look a name.')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledWith(true);
  });
});

describe('OccasionThemeForm — colours', () => {
  it('edits each mode’s tokens, measures the label pairs, and flags the mode a mistake is in', async () => {
    renderForm(makeOccasionTheme());
    const colours = card('Colours');
    const modes = within(colours.getByRole('group', { name: 'Palette to edit' }));
    expect(colours.getByText('Primary button: 21.0:1, readable')).toBeInTheDocument();
    expect(colours.getByText(/^Accent chip: .*too low/)).toBeInTheDocument();
    expect(colours.getByLabelText('Pick a colour for Primary')).toHaveValue('#000000');

    fireEvent.change(colours.getByRole('textbox', { name: 'Primary' }), { target: { value: 'nope' } });
    expect(await colours.findByText('Enter a hex colour like #8E1B3A, or leave it blank.')).toBeInTheDocument();
    expect(colours.getByText('Primary button: contrast not measurable')).toBeInTheDocument();
    expect(within(modes.getByRole('button', { name: /^Light/ })).getByTitle('Has errors')).toBeInTheDocument();

    fireEvent.click(modes.getByRole('button', { name: /^Dark/ }));
    const darkPrimary = colours.getByRole('textbox', { name: 'Primary' });
    expect(darkPrimary).toHaveValue('');
    expect(darkPrimary).toHaveAttribute('placeholder', HOUSE_PALETTES.dark.primary);
    expect(within(modes.getByRole('button', { name: /^Dark/ })).queryByTitle('Has errors')).not.toBeInTheDocument();
    // Pressing the mode already shown keeps it.
    fireEvent.click(modes.getByRole('button', { name: /^Dark/ }));
    expect(modes.getByRole('button', { name: /^Dark/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens the rarer tokens on request, and keeps them open while one of them is wrong', async () => {
    renderForm(makeOccasionTheme());
    const colours = card('Colours');
    expect(colours.queryByRole('textbox', { name: 'Text' })).not.toBeInTheDocument();
    fireEvent.click(colours.getByRole('button', { name: 'More colours' }));
    const less = colours.getByRole('button', { name: 'Fewer colours' });
    expect(less).toHaveAttribute('aria-expanded', 'true');

    fireEvent.change(colours.getByRole('textbox', { name: 'Text' }), { target: { value: 'zz' } });
    expect(await colours.findByText('Enter a hex colour like #8E1B3A, or leave it blank.')).toBeInTheDocument();
    fireEvent.click(less);
    expect(colours.getByRole('button', { name: 'Fewer colours' })).toHaveAttribute('aria-expanded', 'true');
    expect(colours.getByRole('textbox', { name: 'Text' })).toHaveValue('zz');
  });
});

describe('OccasionThemeForm — particles', () => {
  it('adds a layer of sparks in the look’s brand colour, checks it draws something, and stops at four', async () => {
    renderForm(makeOccasionTheme({ particles: [] }));
    const particles = card('Particles');
    expect(particles.getByText('No particles. Add a layer to start.')).toBeInTheDocument();
    const add = particles.getByRole('button', { name: 'Add layer' });
    fireEvent.click(add);

    const layer = within(particles.getByRole('region', { name: 'Layer 1' }));
    expect(layer.getByRole('button', { name: 'Spark' })).toHaveAttribute('aria-pressed', 'true');
    expect(layer.getByText('#8E1B3A')).toBeInTheDocument();
    expect(layer.getByRole('combobox', { name: /^Motion/ })).toHaveTextContent('Fall');
    expect(layer.getByRole('slider', { name: 'Opacity' })).toHaveAttribute('aria-valuetext', '90%');
    expect(layer.getByRole('slider', { name: 'Size, highest' })).toHaveAttribute('aria-valuetext', '14 px');

    fireEvent.change(layer.getByRole('slider', { name: 'How many' }), { target: { value: '45' } });
    expect(layer.getByRole('slider', { name: 'How many' })).toHaveAttribute('aria-valuetext', '45');

    fireEvent.click(layer.getByRole('button', { name: 'Spark' }));
    expect(await layer.findByText('Pick at least one shape or add a path of your own.')).toBeInTheDocument();
    fireEvent.change(layer.getByRole('textbox', { name: 'Your own shapes (optional)' }), { target: { value: 'hello' } });
    expect(await layer.findByText('Paths may only hold SVG path commands and numbers, up to 4000 characters each.')).toBeInTheDocument();

    fireEvent.click(layer.getByRole('button', { name: 'Remove colour 1' }));
    expect(await layer.findByText('Add at least one colour.')).toBeInTheDocument();

    fireEvent.click(add);
    fireEvent.click(add);
    fireEvent.click(add);
    expect(add).toBeDisabled();
    fireEvent.click(particles.getByRole('button', { name: 'Remove layer 4' }));
    expect(particles.queryByRole('region', { name: 'Layer 4' })).not.toBeInTheDocument();
    expect(add).toBeEnabled();
  });
});

describe('OccasionThemeForm — flyers', () => {
  it('offers a custom drawing only to the flyer that has one, and needs an https image for an uploaded one', async () => {
    renderForm(makeOccasionTheme({ flyers: [makeFlyer({ artwork: 'CUSTOM', custom_layers: [makeVectorLayer()] })] }));
    const flyers = card('Flyers');
    const custom = within(flyers.getByRole('region', { name: 'Flyer 1' }));
    expect(custom.getByText('This artwork was drawn by the Duncit MCP agent. Ask the agent to change it.')).toBeInTheDocument();

    const add = flyers.getByRole('button', { name: 'Add flyer' });
    fireEvent.click(add);
    const star = within(flyers.getByRole('region', { name: 'Flyer 2' }));
    expect(star.getByRole('combobox', { name: /^Artwork/ })).toHaveTextContent('Shooting star');
    fireEvent.mouseDown(star.getByRole('combobox', { name: /^Artwork/ }));
    expect(screen.queryByRole('option', { name: 'Custom drawing' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Uploaded image' }));

    expect(star.getByText('A transparent PNG or GIF.')).toBeInTheDocument();
    save();
    expect(await star.findByText('Upload an image. It must be an https link.')).toBeInTheDocument();
    fireEvent.change(star.getByRole('textbox', { name: 'Image' }), { target: { value: 'https://ik.imagekit.io/duncit/star.png' } });
    await waitFor(() => expect(star.queryByText('Upload an image. It must be an https link.')).not.toBeInTheDocument());

    fireEvent.change(star.getByRole('slider', { name: 'Comes round every' }), { target: { value: '5' } });
    expect(await star.findByText('Set the gap to at least the crossing time.')).toBeInTheDocument();
    expect(star.getByRole('slider', { name: 'Height band, lowest' })).toHaveAttribute('aria-valuetext', '10%');

    fireEvent.click(add);
    expect(add).toBeDisabled();

    // The agent-made drawing stays on offer to the flyer that has one.
    fireEvent.mouseDown(custom.getByRole('combobox', { name: /^Artwork/ }));
    expect(screen.getByRole('option', { name: 'Custom drawing' })).toBeInTheDocument();
  });
});

describe('OccasionThemeForm — fireworks, washes, garland and preview', () => {
  it('shows the firework settings once they are on, and needs a colour to burst in', async () => {
    renderForm(makeOccasionTheme());
    const fireworks = card('Fireworks');
    expect(fireworks.queryByRole('slider', { name: 'Bursts' })).not.toBeInTheDocument();
    fireEvent.click(fireworks.getByLabelText('Show fireworks'));
    expect(fireworks.getByRole('slider', { name: 'Bursts' })).toHaveAttribute('aria-valuetext', '12 a minute');
    expect(fireworks.getByRole('slider', { name: 'Burst size' })).toHaveAttribute('aria-valuetext', '90 px');

    save();
    expect(await fireworks.findByText('Add at least one colour.')).toBeInTheDocument();
    fireEvent.click(fireworks.getByRole('button', { name: 'Add colour' }));
    expect(fireworks.getByText('#8E1B3A')).toBeInTheDocument();
    await waitFor(() => expect(fireworks.queryByText('Add at least one colour.')).not.toBeInTheDocument());
  });

  it('adds a wash in the house colour when the look has no brand colour of its own', async () => {
    renderForm(null);
    const atmosphere = card('Atmosphere');
    expect(atmosphere.getByText('No washes.')).toBeInTheDocument();
    fireEvent.click(atmosphere.getByRole('button', { name: 'Add wash' }));
    const wash = within(atmosphere.getByRole('region', { name: 'Wash 1' }));
    expect(wash.getByRole('combobox', { name: /^Kind/ })).toHaveTextContent('Glow from the top');
    expect(wash.getByRole('textbox', { name: 'Colour' })).toHaveValue(HOUSE_PALETTES.light.brand);
    expect(wash.getByRole('slider', { name: 'Strength' })).toHaveAttribute('aria-valuetext', '20%');
    choose(wash, /^Kind/, 'Fog');
    expect(wash.getByRole('combobox', { name: /^Kind/ })).toHaveTextContent('Fog');

    fireEvent.change(wash.getByRole('textbox', { name: 'Colour' }), { target: { value: 'grey' } });
    expect(await wash.findByText('Enter a hex colour like #FFD54F.')).toBeInTheDocument();
    expect(wash.getByLabelText('Pick a colour for Colour')).toHaveValue('#000000');
  });

  it('asks for garland colours only once a garland is picked', () => {
    renderForm(makeOccasionTheme());
    const garland = card('Garland');
    expect(garland.queryByRole('group', { name: 'Colours' })).not.toBeInTheDocument();
    choose(garland, /^Garland/, 'Bunting');
    expect(garland.getByRole('group', { name: 'Colours' })).toBeInTheDocument();
    expect(garland.getByText('Cycled along the string. Leave empty to use the garland’s own.')).toBeInTheDocument();
    fireEvent.click(garland.getByRole('button', { name: 'Add colour' }));
    expect(garland.getByText('#8E1B3A')).toBeInTheDocument();
  });

  it('runs the look on the phone in the mode picked, until the look pins a mode of its own', async () => {
    renderForm(makeOccasionTheme());
    const preview = within(screen.getByTestId('occasion-editor-preview'));
    expect(previewed()).toMatchObject({ key: 'preview', name: 'Christmas', color_mode: 'AUTO', greeting: 'Merry Christmas' });
    expect(screen.getByTestId('phone-preview')).toHaveAttribute('data-mode', 'light');
    fireEvent.click(preview.getByRole('button', { name: 'Dark' }));
    expect(screen.getByTestId('phone-preview')).toHaveAttribute('data-mode', 'dark');
    expect(preview.queryByText('This look always shows in its own mode.')).not.toBeInTheDocument();

    choose(card('Basics'), /^Colour mode/, 'Always light');
    await waitFor(() => expect(previewed()).toMatchObject({ color_mode: 'LIGHT' }));
    expect(preview.getByText('This look always shows in its own mode.')).toBeInTheDocument();
    expect(preview.getByRole('button', { name: 'Light' })).toBeDisabled();
  });
});
