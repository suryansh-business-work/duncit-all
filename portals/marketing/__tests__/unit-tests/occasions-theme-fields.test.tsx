import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isHexColor } from '@duncit/regex';
import { contrastRatio } from '@duncit/theme';
import { CUSTOM_ARTWORK_BOX, OCCASION_ARTWORKS } from '@duncit/utils';
import ArtworkThumb from '../../src/pages/occasions-page/occasion-theme-form/ArtworkThumb';
import ColorField from '../../src/pages/occasions-page/occasion-theme-form/ColorField';
import ColorListField from '../../src/pages/occasions-page/occasion-theme-form/ColorListField';
import ContrastChip from '../../src/pages/occasions-page/occasion-theme-form/ContrastChip';
import LayerList from '../../src/pages/occasions-page/occasion-theme-form/LayerList';
import ShapePicker from '../../src/pages/occasions-page/occasion-theme-form/ShapePicker';
import SliderField from '../../src/pages/occasions-page/occasion-theme-form/SliderField';
import { renderWithProviders } from '../testkit';

type Values = Record<string, unknown>;

/** A bare react-hook-form around one field, with what the form holds written out for the spec to read. */
function Harness({
  defaultValues = {},
  schema,
  field,
}: Readonly<{ defaultValues?: Values; schema?: z.ZodType<Values, Values>; field: (control: Control<Values>) => ReactNode }>) {
  const { control, watch } = useForm<Values>({ defaultValues, resolver: schema ? zodResolver(schema) : undefined, mode: 'onChange' });
  return (
    <>
      {field(control)}
      <output data-testid="held">{JSON.stringify(watch())}</output>
    </>
  );
}

const held = () => JSON.parse(screen.getByTestId('held').textContent ?? '{}') as Values;

describe('ColorField', () => {
  it('shows the colour a blank falls back to, writes a picked colour as upper-case hex, and says what is wrong', async () => {
    renderWithProviders(
      <Harness
        schema={z.object({ trail: z.string().refine(isHexColor, 'Bad colour') })}
        field={(control) => <ColorField control={control} name="trail" label="Trail colour" hint="Leave blank for none." placeholder="#abc" />}
      />,
    );
    const text = screen.getByRole('textbox', { name: 'Trail colour' });
    const swatch = screen.getByLabelText('Pick a colour for Trail colour');
    // An unset field reads as blank, with the fallback shown faded and in the swatch.
    expect(text).toHaveValue('');
    expect(text).toHaveAttribute('placeholder', '#abc');
    expect(swatch).toHaveValue('#aabbcc');
    expect(screen.getByText('Leave blank for none.')).toBeInTheDocument();

    fireEvent.change(swatch, { target: { value: '#12ab34' } });
    expect(text).toHaveValue('#12AB34');
    expect(held()).toEqual({ trail: '#12AB34' });

    fireEvent.change(text, { target: { value: 'zz' } });
    expect(await screen.findByText('Bad colour')).toBeInTheDocument();
    expect(screen.queryByText('Leave blank for none.')).not.toBeInTheDocument();
    expect(swatch).toHaveValue('#aabbcc');
  });

  it('paints an unfinished colour black when there is nothing to fall back to', () => {
    renderWithProviders(
      <Harness defaultValues={{ wash: '#F0' }} field={(control) => <ColorField control={control} name="wash" label="Colour" />} />,
    );
    expect(screen.getByRole('textbox', { name: 'Colour' })).toHaveValue('#F0');
    expect(screen.getByLabelText('Pick a colour for Colour')).toHaveValue('#000000');
  });
});

describe('ColorListField', () => {
  it('adds the seed first and then a copy of the last colour, changes and removes each one, and stops at eight', () => {
    renderWithProviders(
      <Harness
        field={(control) => <ColorListField control={control} name="colors" label="Colours" hint="Cycled along the string." seed="#8E1B3A" />}
      />,
    );
    const group = screen.getByRole('group', { name: 'Colours' });
    expect(within(group).queryByLabelText('Colour 1')).not.toBeInTheDocument();
    expect(screen.getByText('Cycled along the string.')).toBeInTheDocument();

    const add = screen.getByRole('button', { name: 'Add colour' });
    fireEvent.click(add);
    expect(held()).toEqual({ colors: ['#8E1B3A'] });
    fireEvent.change(screen.getByLabelText('Colour 1'), { target: { value: '#00ff00' } });
    fireEvent.click(add);
    expect(held()).toEqual({ colors: ['#00FF00', '#00FF00'] });
    fireEvent.change(screen.getByLabelText('Colour 2'), { target: { value: '#0000ff' } });
    expect(held()).toEqual({ colors: ['#00FF00', '#0000FF'] });

    fireEvent.click(screen.getByRole('button', { name: 'Remove colour 1' }));
    expect(held()).toEqual({ colors: ['#0000FF'] });
    expect(within(group).getByText('#0000FF')).toBeInTheDocument();
    expect(within(group).queryByText('#00FF00')).not.toBeInTheDocument();

    for (let i = 0; i < 7; i += 1) fireEvent.click(add);
    expect((held().colors as string[]).length).toBe(8);
    expect(add).toBeDisabled();
  });

  it('shows the list’s own error in place of the hint', async () => {
    renderWithProviders(
      <Harness
        defaultValues={{ colors: ['#FF0000'] }}
        schema={z.object({ colors: z.array(z.string()).min(1, 'Add at least one colour.') })}
        field={(control) => <ColorListField control={control} name="colors" label="Colours" seed="#8E1B3A" />}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove colour 1' }));
    expect(await screen.findByText('Add at least one colour.')).toBeInTheDocument();
  });
});

describe('ShapePicker', () => {
  it('starts with nothing picked, toggles shapes in and out, and shows its hint or its error', async () => {
    renderWithProviders(
      <Harness
        schema={z.object({ shapes: z.array(z.string()).min(1, 'Pick a shape.') })}
        field={(control) => <ShapePicker control={control} name="shapes" label="Shapes" hint="Any number." />}
      />,
    );
    const group = screen.getByRole('group', { name: 'Shapes' });
    expect(within(group).getByRole('button', { name: 'Star' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Any number.')).toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', { name: 'Star' }));
    fireEvent.click(within(group).getByRole('button', { name: 'Heart' }));
    expect(held()).toEqual({ shapes: ['STAR', 'HEART'] });
    expect(within(group).getByRole('button', { name: 'Star' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(group).getByRole('button', { name: 'Star' }));
    fireEvent.click(within(group).getByRole('button', { name: 'Heart' }));
    expect(held()).toEqual({ shapes: [] });
    expect(await screen.findByText('Pick a shape.')).toBeInTheDocument();
  });
});

describe('SliderField', () => {
  it('reads a fraction as a percentage, and writes the dragged value back', () => {
    renderWithProviders(
      <Harness
        defaultValues={{ opacity: 0.9 }}
        field={(control) => <SliderField control={control} name="opacity" label="Opacity" hint="How solid." range={{ min: 0, max: 1, step: 0.05 }} unit="percent" />}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Opacity' });
    // The value written beside the label.
    const shown = screen.getByText('Opacity').nextElementSibling;
    expect(slider).toHaveAttribute('aria-valuetext', '90%');
    expect(shown).toHaveTextContent('90%');
    expect(screen.getByText('How solid.')).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(held()).toEqual({ opacity: 0.5 });
    expect(shown).toHaveTextContent('50%');
  });

  it('gives a range two named thumbs, and shows its error', async () => {
    renderWithProviders(
      <Harness
        defaultValues={{ size: [6, 14] }}
        schema={z.object({ size: z.tuple([z.number(), z.number()]).refine(([low, high]) => high - low <= 10, 'Too wide.') })}
        field={(control) => <SliderField control={control} name="size" label="Size" range={{ min: 2, max: 120, step: 1 }} unit="px" />}
      />,
    );
    expect(screen.getByText('6 px to 14 px')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Size, lowest' })).toHaveAttribute('aria-valuetext', '6 px');
    fireEvent.change(screen.getByRole('slider', { name: 'Size, highest' }), { target: { value: '20' } });
    expect(held()).toEqual({ size: [6, 20] });
    expect(screen.getByText('6 px to 20 px')).toBeInTheDocument();
    expect(await screen.findByText('Too wide.')).toBeInTheDocument();
  });

  it('shows nothing under a plain count with no hint and no error', () => {
    const { container } = renderWithProviders(
      <Harness defaultValues={{ count: 30 }} field={(control) => <SliderField control={control} name="count" label="How many" range={{ min: 0, max: 160, step: 1 }} unit="count" />} />,
    );
    expect(screen.getByRole('slider', { name: 'How many' })).toHaveAttribute('aria-valuetext', '30');
    expect(container.querySelector('.MuiFormHelperText-root')).toBeNull();
  });
});

describe('ContrastChip', () => {
  it('passes a readable pair, warns on a weak one, and says when a colour cannot be measured', () => {
    renderWithProviders(
      <>
        <ContrastChip pair="Primary button" fill="#000000" ink="#FFFFFF" />
        <ContrastChip pair="Accent chip" fill="#777777" ink="#888888" />
        <ContrastChip pair="Stored ink" fill="#777777" ink="rgba(0,0,0,0.5)" />
        <ContrastChip pair="Stored fill" fill="red" ink="#FFFFFF" />
      </>,
    );
    expect(screen.getByText('Primary button: 21.0:1, readable')).toBeInTheDocument();
    expect(screen.getByTestId('CheckCircleRoundedIcon')).toBeInTheDocument();
    const ratio = contrastRatio('#777777', '#888888').toFixed(1);
    expect(screen.getByText(`Accent chip: ${ratio}:1, too low (needs 4.5:1)`)).toBeInTheDocument();
    expect(screen.getByTestId('WarningAmberRoundedIcon')).toBeInTheDocument();
    expect(screen.getByText('Stored ink: contrast not measurable')).toBeInTheDocument();
    expect(screen.getByText('Stored fill: contrast not measurable')).toBeInTheDocument();
  });
});

describe('ArtworkThumb', () => {
  it('draws a built-in artwork from its own layers', () => {
    const { container } = renderWithProviders(<ArtworkThumb artwork="KITE" />);
    const art = OCCASION_ARTWORKS.KITE;
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', `0 0 ${art.width} ${art.height}`);
    expect(svg?.querySelectorAll('path')).toHaveLength(art.layers.length);
  });

  it('draws a custom artwork in its box, leaving a missing fill or stroke unpainted', () => {
    const layers = [
      { path: 'M0 0L10 10', fill: '', stroke: '#000000', stroke_width: 3, x: 4, y: 5 },
      { path: 'M1 1L2 2', fill: '#FFFFFF', stroke: '', stroke_width: 0, x: 0, y: 0 },
    ];
    const { container } = renderWithProviders(<ArtworkThumb artwork="CUSTOM" layers={layers} />);
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', `0 0 ${CUSTOM_ARTWORK_BOX.width} ${CUSTOM_ARTWORK_BOX.height}`);
    const [first, second] = Array.from(container.querySelectorAll('path'));
    expect(first).toHaveAttribute('d', 'M0 0L10 10');
    expect(first).toHaveAttribute('transform', 'translate(4 5)');
    expect(first).toHaveAttribute('fill', 'none');
    expect(first).toHaveAttribute('stroke', '#000000');
    expect(first).toHaveAttribute('stroke-width', '3');
    expect(second).toHaveAttribute('fill', '#FFFFFF');
    expect(second).toHaveAttribute('stroke', 'none');
  });

  it('shows an image glyph for an uploaded image, which has no vector to draw', () => {
    renderWithProviders(<ArtworkThumb artwork="IMAGE" />);
    expect(screen.getByTestId('ImageRoundedIcon')).toBeInTheDocument();
  });
});

describe('LayerList', () => {
  const props = {
    title: 'Washes',
    subtitle: 'Up to 2.',
    addLabel: 'Add wash',
    noneText: 'No washes.',
    max: 2,
    itemTitle: (n: number) => `Wash ${n}`,
    removeLabel: (n: number) => `Remove wash ${n}`,
    renderItem: (index: number) => <span>{`fields of ${index}`}</span>,
  };

  it('says it has none, and adds one', () => {
    const onAdd = vi.fn();
    renderWithProviders(<LayerList {...props} ids={[]} onAdd={onAdd} onRemove={vi.fn()} />);
    expect(screen.getByText('No washes.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add wash' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('gives each entry its own titled card with a remove button, and turns add off at the most', () => {
    const onRemove = vi.fn();
    renderWithProviders(<LayerList {...props} ids={['a', 'b']} onAdd={vi.fn()} onRemove={onRemove} />);
    expect(screen.queryByText('No washes.')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Wash 2' })).getByText('fields of 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add wash' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove wash 2' }));
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
