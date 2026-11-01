import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'tamagui';

import { AppImage } from '@/components/AppImage';

interface Props {
  testID: string;
  icon?: string | null;
  size: number;
  /** The fallback glyph's colour. */
  tint: string;
}

/** A category `icon`: the admin's image for a URL, an emoji for a short string,
 * else a MaterialIcons glyph (mWeb twin: renderSuperCategoryMark). Used by the
 * search tiles and Create Pod's category tiles. */
export function CategoryMark({ testID, icon, size, tint }: Readonly<Props>) {
  const [failed, setFailed] = useState(false);
  const value = (icon ?? '').trim();
  if (value.startsWith('http') && !failed) {
    return (
      <AppImage
        testID={`${testID}-image`}
        source={{ uri: value }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }
  if (value.length > 0 && value.length <= 2) {
    return <Text fontSize={size}>{value}</Text>;
  }
  return <MaterialIcons name="interests" size={size} color={tint} />;
}
