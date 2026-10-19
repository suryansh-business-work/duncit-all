import { Box } from '@mui/material';

import type { StoreSectionItem } from '../../../../graphql/catalog';
import { useStoreT } from '../../../../i18n';
import { STORE_TOKENS as T } from '../../../../theme/tokens';

interface CarouselDotsProps {
  slides: readonly StoreSectionItem[];
  index: number;
  goTo: (index: number) => void;
}

/** One button per slide; the current one is a wide pill and says so (aria-current). */
export function CarouselDots({ slides, index, goTo }: Readonly<CarouselDotsProps>) {
  const { t } = useStoreT();
  return (
    <>
      {slides.map((item, position) => (
        <Box
          key={item.id}
          component="button"
          type="button"
          aria-label={t('ecommStore.hero.goTo', { vars: { n: position + 1 } })}
          aria-current={position === index ? 'true' : undefined}
          onClick={() => goTo(position)}
          sx={{ border: 0, p: 0, bgcolor: 'transparent', cursor: 'pointer', minWidth: 24, height: 24, display: 'grid', placeItems: 'center' }}
        >
          <Box
            component="span"
            sx={{
              display: 'block',
              width: position === index ? 28 : 10,
              height: 10,
              borderRadius: T.radius.pill,
              bgcolor: position === index ? T.cta : T.inputBorder,
              transition: 'width 200ms ease',
            }}
          />
        </Box>
      ))}
    </>
  );
}
