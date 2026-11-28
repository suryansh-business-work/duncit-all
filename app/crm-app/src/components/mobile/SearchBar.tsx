import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack, useTheme } from 'tamagui';

import { MOBILE, RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  testID?: string;
}

/** A rounded search field with a magnifier and a clear button once something is typed. */
export function SearchBar({ value, onChange, placeholder, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <XStack
      alignItems="center"
      minHeight={MOBILE.touch}
      paddingLeft="$3"
      borderRadius={RADII.pill}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$inputBorder"
    >
      <MaterialIcons name="search" size={MOBILE.icon} color={theme.muted?.val} />
      <Input
        flex={1}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        placeholderTextColor="$muted"
        borderWidth={0}
        backgroundColor="transparent"
        autoCorrect={false}
        returnKeyType="search"
        testID={testID}
      />
      {value ? (
        <XStack
          role="button"
          aria-label={t('crmApp.mobile.clearSearch')}
          onPress={() => onChange('')}
          width={MOBILE.touch}
          height={MOBILE.touch}
          alignItems="center"
          justifyContent="center"
          testID={testID ? `${testID}-clear` : undefined}
        >
          <MaterialIcons name="close" size={MOBILE.iconSm} color={theme.muted?.val} />
        </XStack>
      ) : null}
    </XStack>
  );
}
