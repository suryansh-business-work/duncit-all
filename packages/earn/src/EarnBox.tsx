import { useState, type ReactNode } from 'react';
import { Box, Card, CardActionArea, CardContent, CardMedia, Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

/** Contextual next-step action shown beside the "Already enabled" chip for a
 * role the user already holds (e.g. host more, register another venue). */
export interface EarnBoxCta {
  label: string;
  onClick: () => void;
}

interface Props {
  icon: ReactNode;
  /** Featured image across the top of the card; the card renders without one
   * when it is missing or fails to load. */
  imageUrl?: string;
  title: string;
  description: string;
  /** Unlocked card click — the surface decides where the application flow lives. */
  onOpen: () => void;
  disabled: boolean;
  /** Chip text shown when disabled (role held / meeting pending). */
  disabledLabel?: string;
  /** When set (approved user), rendered as a button to the right of the chip. */
  cta?: EarnBoxCta;
  /** Root `data-testid`; the parts derive from it (`-open`, `-title`,
   * `-description`, `-enabled`, `-cta`), matching the native EarnBox. */
  testId?: string;
}

/** A single "earn" path card on the Earn with Duncit page. Disabled when the
 * signed-in user already holds the matching role or an onboarding meeting for
 * it is still pending. Approved cards keep the "Already enabled" chip and add a
 * contextual next-step CTA (rendered outside the disabled action area so it
 * stays clickable). */
export default function EarnBox({
  icon,
  imageUrl,
  title,
  description,
  onOpen,
  disabled,
  disabledLabel = 'Already enabled',
  cta,
  testId = 'earn-box',
}: Readonly<Props>) {
  const [brokenImage, setBrokenImage] = useState<string | undefined>(undefined);
  const showImage = Boolean(imageUrl) && brokenImage !== imageUrl;
  return (
    <Card
      data-testid={testId}
      variant="outlined"
      sx={{
        borderRadius: '16px',
        opacity: disabled && !cta ? 0.55 : 1,
        boxShadow: 'none',
        '&:hover': { boxShadow: 'none' },
      }}
    >
      <CardActionArea data-testid={`${testId}-open`} disabled={disabled} onClick={onOpen}>
        {showImage && (
          <CardMedia
            component="img"
            image={imageUrl}
            // Decorative: the card's title says what it is (WCAG 1.1.1).
            alt=""
            loading="lazy"
            height={140}
            onError={() => setBrokenImage(imageUrl)}
            sx={{ objectFit: 'cover', bgcolor: 'action.hover' }}
          />
        )}
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1.25} sx={{
            alignItems: "flex-start"
          }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'primary.contrastText',
                background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
              }}
            >
              {icon}
            </Box>
            <Typography data-testid={`${testId}-title`} variant="subtitle1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography data-testid={`${testId}-description`} variant="body2" sx={{
              color: "text.secondary"
            }}>
              {description}
            </Typography>
            {disabled && !cta && (
              <Chip data-testid={`${testId}-enabled`} size="small" color="success" label={disabledLabel} sx={{ fontWeight: 600 }} />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
      {cta && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              flexWrap: "wrap"
            }}>
            <Chip data-testid={`${testId}-enabled`} size="small" color="success" label={disabledLabel} sx={{ fontWeight: 600 }} />
            <DuncitButton
              data-testid={`${testId}-cta`}
              size="small"
              variant="contained"
              onClick={cta.onClick}
              sx={{ borderRadius: 999, fontWeight: 600, textTransform: 'none' }}
            >
              {cta.label}
            </DuncitButton>
          </Stack>
        </Box>
      )}
    </Card>
  );
}
