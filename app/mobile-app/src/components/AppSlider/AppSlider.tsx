import { Slider, type SliderProps } from 'tamagui';

export type AppSliderProps = Omit<SliderProps, 'children'>;

/**
 * The app's one single-thumb slider. Tamagui's default track paints
 * `$background`, so on the page only the thumb showed; the rail takes
 * `inputBorder` (3:1 against every ground, WCAG 1.4.11) and the filled part
 * and thumb the brand `primary`.
 */
export function AppSlider(props: Readonly<AppSliderProps>) {
  return (
    <Slider {...props}>
      <Slider.Track backgroundColor="$inputBorder">
        <Slider.TrackActive backgroundColor="$primary" />
      </Slider.Track>
      <Slider.Thumb index={0} circular size="$2" backgroundColor="$primary" borderWidth={0} />
    </Slider>
  );
}
