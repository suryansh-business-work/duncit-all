import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ReelBriefForm, briefLengthSeconds, reelBriefInitialValues } from '../../src/forms/reel-brief';
import { ReelScriptForm, blankScriptScene, formToScript, scriptToForm } from '../../src/forms/reel-script';
import { ReelSettingsForm, formToSettings, settingsToForm } from '../../src/forms/reel-settings';
import { ReelSubtitlesForm } from '../../src/forms/reel-subtitles';
import { ReelVariantsForm, parseHashtags, rowToVariant, variantPostText, variantsToForm } from '../../src/forms/reel-variants';
import { ReelVoiceoverForm, reelVoiceoverInitialValues } from '../../src/forms/reel-voiceover';
import { renderWithProviders } from '../testkit';
import { reelScript, reelSpec, reelVariant } from '../mocks/reel-apollo-mock';

const type = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const enabled = (testId: string) => waitFor(() => expect(screen.getByTestId(testId)).toBeEnabled());
const disabled = (testId: string) => waitFor(() => expect(screen.getByTestId(testId)).toBeDisabled());
/** MUI's select keeps a native input the form reads; changing it is how a test picks an option. */
const pick = (container: HTMLElement, name: string, value: string) => {
  const input = container.querySelector(`input[name="${name}"]`);
  if (!input) throw new Error(`no select named ${name}`);
  fireEvent.change(input, { target: { value } });
};

const LANGUAGES = [
  { value: 'en-IN', label: 'English (India)' },
  { value: 'hi-IN', label: 'Hindi (India)' },
];

describe('ReelBriefForm', () => {
  it('asks for ideas once there is a topic, with the tone and length picked', async () => {
    const onSubmit = vi.fn();
    const { container } = renderWithProviders(<ReelBriefForm submitting={false} onSubmit={onSubmit} />);
    expect(screen.getByTestId('reel-brief-submit')).toBeDisabled();
    type('reel-brief-topic', 'Sunday pickleball');
    type('reel-brief-audience', 'Beginners');
    pick(container, 'tone', 'PLAYFUL');
    pick(container, 'length_s', '60');
    await enabled('reel-brief-submit');
    fireEvent.submit(screen.getByTestId('reel-brief-form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ topic: 'Sunday pickleball', audience: 'Beginners', tone: 'PLAYFUL', length_s: '60' }));
  });

  it('opens on the brief it was given, and refuses a topic that is only spaces', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<ReelBriefForm initialValues={{ ...reelBriefInitialValues, topic: 'Jam night' }} submitting={false} onSubmit={onSubmit} />);
    expect(screen.getByTestId('reel-brief-topic')).toHaveValue('Jam night');
    type('reel-brief-topic', '   ');
    await disabled('reel-brief-submit');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reads the length back as seconds', () => {
    expect(briefLengthSeconds({ length_s: '45' })).toBe(45);
  });
});

describe('ReelScriptForm', () => {
  it('lets a scene be added, edited and removed, and hands the script back in milliseconds', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<ReelScriptForm script={reelScript()} submitting={false} onSubmit={onSubmit} />);
    expect(screen.getByTestId('reel-script-remove-1')).toBeDisabled();
    fireEvent.click(screen.getByTestId('reel-script-add-scene'));
    expect(screen.getByTestId('reel-script-scene-2')).toBeInTheDocument();
    expect(screen.getByTestId('reel-script-remove-1')).toBeEnabled();
    type('reel-script-text-2', 'Then the rally');
    type('reel-script-shot-2', 'Slow motion');
    type('reel-script-duration-2', '2.5');
    type('reel-script-query-2', 'rally');
    type('reel-script-cta', 'Join us');
    await enabled('reel-script-submit');
    fireEvent.submit(screen.getByTestId('reel-script-form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      hooks: ['Stop scrolling'],
      scenes: [
        { text: 'Sundays start here', shot: 'Court at sunrise', duration_ms: 3000, asset_query: 'pickleball sunrise' },
        { text: 'Then the rally', shot: 'Slow motion', duration_ms: 2500, asset_query: 'rally' },
      ],
      cta: 'Join us',
    });

    fireEvent.click(screen.getByTestId('reel-script-remove-2'));
    expect(screen.queryByTestId('reel-script-scene-2')).not.toBeInTheDocument();
  });

  it('refuses a scene with no words, or one shorter than the timeline allows', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<ReelScriptForm script={reelScript()} submitting={false} onSubmit={onSubmit} />);
    type('reel-script-text-1', '');
    await disabled('reel-script-submit');
    type('reel-script-text-1', 'Back on');
    await enabled('reel-script-submit');
    type('reel-script-duration-1', '0.2');
    await disabled('reel-script-submit');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('converts between the script and the form both ways', () => {
    const form = scriptToForm(reelScript({ hooks: [] }));
    expect(form).toEqual({ hook: '', scenes: [{ text: 'Sundays start here', shot: 'Court at sunrise', duration_s: 3, asset_query: 'pickleball sunrise' }], cta: 'Book your spot' });
    expect(formToScript({ ...form, hook: 'Hi' }).hooks).toEqual(['Hi']);
    expect(blankScriptScene()).toEqual({ text: '', shot: '', duration_s: 3, asset_query: '' });
  });
});

describe('ReelVoiceoverForm', () => {
  it('speaks the words in the voice and language picked', async () => {
    const onSubmit = vi.fn();
    const { container } = renderWithProviders(<ReelVoiceoverForm languages={LANGUAGES} defaultLanguage="en-IN" submitting={false} onSubmit={onSubmit} />);
    expect(screen.getByTestId('reel-voiceover-submit')).toBeDisabled();
    type('reel-voiceover-text', 'Welcome to Sunday jam');
    pick(container, 'voice', 'nova');
    pick(container, 'language', 'hi-IN');
    await enabled('reel-voiceover-submit');
    fireEvent.submit(screen.getByTestId('reel-voiceover-form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ text: 'Welcome to Sunday jam', voice: 'nova', language: 'hi-IN' }));
  });

  it('opens on the script’s own lines', () => {
    renderWithProviders(<ReelVoiceoverForm initialText="Line one" languages={LANGUAGES} defaultLanguage="en-IN" submitting={false} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('reel-voiceover-text')).toHaveValue('Line one');
    expect(reelVoiceoverInitialValues('x', 'en-IN')).toEqual({ text: 'x', voice: 'alloy', language: 'en-IN' });
  });
});

describe('ReelSubtitlesForm', () => {
  const sources = [
    { value: 'g1', label: 'voice.mp3' },
    { value: 'v1', label: 'jam.mp4' },
  ];

  it('transcribes the first sound by default, or the one picked', async () => {
    const onSubmit = vi.fn();
    const { container } = renderWithProviders(<ReelSubtitlesForm sources={sources} languages={LANGUAGES} defaultLanguage="en-IN" submitting={false} onSubmit={onSubmit} />);
    await enabled('reel-subtitles-submit');
    pick(container, 'asset_id', 'v1');
    fireEvent.submit(screen.getByTestId('reel-subtitles-form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ asset_id: 'v1', language: 'en-IN' }));
  });

  it('says what to add first when the reel has no sound to transcribe', () => {
    renderWithProviders(<ReelSubtitlesForm sources={[]} languages={LANGUAGES} defaultLanguage="en-IN" submitting={false} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('reel-subtitles-no-sources')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-subtitles-form')).not.toBeInTheDocument();
  });
});

describe('ReelVariantsForm', () => {
  it('hands one network’s edited caption to the post, with the tags cleaned', async () => {
    const onUse = vi.fn();
    renderWithProviders(<ReelVariantsForm variants={[reelVariant(), reelVariant({ platform: 'YOUTUBE', caption: 'Watch', hashtags: [], title: 'Jam' })]} onUse={onUse} />);
    expect(screen.getByTestId('reel-variant-hashtags-INSTAGRAM')).toHaveValue('#pickleball #hsr');
    type('reel-variant-caption-INSTAGRAM', 'Sundays at HSR, every week');
    type('reel-variant-hashtags-INSTAGRAM', 'pickleball, #hsr HSR #pickleball');
    fireEvent.click(screen.getByTestId('reel-variant-use-INSTAGRAM'));
    await waitFor(() =>
      expect(onUse).toHaveBeenCalledWith({ platform: 'INSTAGRAM', title: 'Sunday jam', caption: 'Sundays at HSR, every week', hashtags: ['pickleball', 'hsr', 'HSR'] })
    );
  });

  it('refuses a title past the limit, and takes a fresh generation in', async () => {
    const onUse = vi.fn();
    const { rerender } = renderWithProviders(<ReelVariantsForm variants={[reelVariant()]} onUse={onUse} />);
    type('reel-variant-title-INSTAGRAM', 'x'.repeat(101));
    fireEvent.click(screen.getByTestId('reel-variant-use-INSTAGRAM'));
    await waitFor(() => expect(screen.getByTestId('reel-variant-title-INSTAGRAM')).toHaveAttribute('aria-invalid', 'true'));
    expect(onUse).not.toHaveBeenCalled();

    rerender(<ReelVariantsForm variants={[reelVariant({ title: 'Rewritten' })]} onUse={onUse} />);
    await waitFor(() => expect(screen.getByTestId('reel-variant-title-INSTAGRAM')).toHaveValue('Rewritten'));
  });

  it('parses tags, writes the post text, and converts rows both ways', () => {
    expect(parseHashtags(' #a, b  ##c a ')).toEqual(['a', 'b', 'c']);
    expect(variantPostText({ caption: 'Hi', hashtags: ['a', 'b'] })).toBe('Hi\n\n#a #b');
    expect(variantPostText({ caption: '', hashtags: [] })).toBe('');
    expect(variantsToForm([reelVariant()])).toEqual({ variants: [{ platform: 'INSTAGRAM', title: 'Sunday jam', caption: 'Sundays at HSR', hashtags: '#pickleball #hsr' }] });
    expect(rowToVariant({ platform: 'X', title: 't', caption: 'c', hashtags: 'a b' })).toEqual({ platform: 'X', title: 't', caption: 'c', hashtags: ['a', 'b'] });
  });
});

describe('ReelSettingsForm', () => {
  const pictures = [{ value: 'logo', label: 'logo.png' }];

  it('changes the frame, the captions and the brand as they are picked', async () => {
    const onChange = vi.fn();
    const { container } = renderWithProviders(<ReelSettingsForm spec={reelSpec()} pictures={pictures} onChange={onChange} />);
    expect(screen.queryByTestId('reel-settings-watermark-width')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-settings-voiceover-volume')).not.toBeInTheDocument();

    pick(container, 'aspect', 'SQUARE');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ settings: expect.objectContaining({ aspect: 'SQUARE' }) })));
    pick(container, 'caption_style', 'HIGHLIGHT');
    type('reel-settings-primary-color', '#ff5a1f');
    pick(container, 'watermark_asset_id', 'logo');
    expect(await screen.findByTestId('reel-settings-watermark-width')).toBeInTheDocument();
    type('reel-settings-watermark-width', '30');
    pick(container, 'watermark_corner', 'BOTTOM_LEFT');
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        settings: {
          aspect: 'SQUARE',
          captions: { style: 'HIGHLIGHT' },
          brand: { watermark_asset_id: 'logo', watermark_corner: 'BOTTOM_LEFT', watermark_width_pct: 30, primary_color: '#FF5A1F' },
        },
        voiceover_volume: 1,
      })
    );
  });

  it('keeps a colour that is not a colour off the reel, and offers the voiceover volume only with a voiceover', async () => {
    const onChange = vi.fn();
    renderWithProviders(<ReelSettingsForm spec={reelSpec({ voiceover: { asset_id: 'g1', volume: 0.8 } })} pictures={[]} onChange={onChange} />);
    expect(screen.getByTestId('reel-settings-voiceover-volume')).toHaveValue(80);
    type('reel-settings-primary-color', 'orange');
    await waitFor(() => expect(screen.getByTestId('reel-settings-primary-color')).toHaveAttribute('aria-invalid', 'true'));
    expect(onChange).not.toHaveBeenCalled();
    type('reel-settings-voiceover-volume', '40');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ voiceover_volume: 0.4 })));
  });

  it('converts a spec to the form and back', () => {
    const form = settingsToForm(reelSpec({ brand: { watermark_asset_id: 'logo', watermark_corner: 'CENTER', watermark_width_pct: 12.4, primary_color: '#abcdef' } }));
    expect(form).toMatchObject({ aspect: 'PORTRAIT', caption_style: 'PLAIN', watermark_asset_id: 'logo', watermark_corner: 'CENTER', watermark_width_pct: 12.4, primary_color: '#abcdef', voiceover_volume_pct: 100 });
    expect(formToSettings(form)).toEqual({
      settings: { aspect: 'PORTRAIT', captions: { style: 'PLAIN' }, brand: { watermark_asset_id: 'logo', watermark_corner: 'CENTER', watermark_width_pct: 12, primary_color: '#ABCDEF' } },
      voiceover_volume: 1,
    });
  });
});

describe('ScriptSceneFields in context', () => {
  it('caps the scenes at the timeline’s limit', () => {
    const script = reelScript({ scenes: Array.from({ length: 40 }, (_item, index) => ({ text: `Scene ${index}`, shot: '', duration_ms: 1000, asset_query: '' })) });
    renderWithProviders(<ReelScriptForm script={script} submitting={false} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('reel-script-add-scene')).toBeDisabled();
    expect(within(screen.getByTestId('reel-script-scenes')).getAllByTestId(/^reel-script-scene-/)).toHaveLength(40);
  });
});
