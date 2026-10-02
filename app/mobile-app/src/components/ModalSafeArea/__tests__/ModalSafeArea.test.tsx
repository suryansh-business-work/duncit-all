import { StyleSheet } from 'react-native';
import { Text } from 'tamagui';

import { renderWithProviders } from '@/utils/test-utils';
import { ModalSafeArea } from '../ModalSafeArea';

/** The insets `renderWithProviders` gives its SafeAreaProvider: an iPhone with a notch. */
const TOP = 47;
const BOTTOM = 34;

const styleOf = (element: { props: Record<string, unknown> }) =>
  StyleSheet.flatten(element.props.style as Parameters<typeof StyleSheet.flatten>[0]);

describe('ModalSafeArea', () => {
  it('keeps every edge clear of the notch and home indicator by default', () => {
    const { getByTestId } = renderWithProviders(
      <ModalSafeArea testID="area">
        <Text>Notifications</Text>
      </ModalSafeArea>,
    );
    expect(styleOf(getByTestId('area'))).toEqual({
      paddingTop: TOP,
      paddingRight: 0,
      paddingBottom: BOTTOM,
      paddingLeft: 0,
    });
  });

  it('pads only the edges it is asked to, on top of its own style', () => {
    const { getByTestId } = renderWithProviders(
      <ModalSafeArea testID="area" edges={['top']} style={{ flex: 1 }}>
        <Text>Story</Text>
      </ModalSafeArea>,
    );
    expect(styleOf(getByTestId('area'))).toEqual({ flex: 1, paddingTop: TOP });
  });

  it('adds nothing when it keeps no edge clear', () => {
    const { getByTestId } = renderWithProviders(<ModalSafeArea testID="area" edges={[]} />);
    expect(styleOf(getByTestId('area'))).toEqual({});
  });
});
