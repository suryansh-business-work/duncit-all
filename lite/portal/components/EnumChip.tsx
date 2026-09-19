import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { usePortalT } from '../../shared/i18n';

interface Props {
  value: string;
  /** Enum value → catalogue key. */
  keys: Readonly<Record<string, string>>;
  colors: StatusColorMap;
}

/** A status chip whose label follows the reader's language. */
export function EnumChip({ value, keys, colors }: Readonly<Props>) {
  const { t } = usePortalT();
  const key = keys[value];
  return <StatusChip status={value} label={key ? t(key) : value} colorMap={colors} />;
}
