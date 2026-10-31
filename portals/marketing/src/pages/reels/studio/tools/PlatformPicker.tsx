import { Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PLATFORMS, PLATFORM_LABEL } from '../../../social-accounts-page/copy';
import type { SocialPlatform } from '../../../social-accounts-page/queries';

interface Props {
  label: string;
  value: readonly SocialPlatform[];
  onChange: (next: SocialPlatform[]) => void;
  disabled?: boolean;
}

/** The networks a check or a caption is for — the same list the composer posts to. */
export default function PlatformPicker({ label, value, onChange, disabled = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const toggle = (platform: SocialPlatform, checked: boolean) => {
    const without = value.filter((item) => item !== platform);
    onChange(checked ? [...without, platform] : without);
  };

  return (
    <FormControl component="fieldset" disabled={disabled} data-testid="reel-platform-picker">
      <FormLabel component="legend">{label}</FormLabel>
      <FormGroup row>
        {PLATFORMS.map((platform) => (
          <FormControlLabel
            key={platform}
            control={<Checkbox size="small" checked={value.includes(platform)} onChange={(_event, checked) => toggle(platform, checked)} />}
            label={t(PLATFORM_LABEL[platform])}
            data-testid={`reel-platform-${platform}`}
          />
        ))}
      </FormGroup>
    </FormControl>
  );
}
