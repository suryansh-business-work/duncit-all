import { auth } from '@duncit/auth-tokens';
import { fitScale, fitSize } from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface FitMock {
  /** The window's height inside the safe area, px. */
  available: number;
}

const FIT = auth.fit;

export const fitScaleDemos: PackageDemo[] = [
  defineDemo<FitMock>({
    id: 'fit-scale',
    title: 'fitScale — the login landing fitted to the window, no scroll',
    note:
      'Set available to 640 (a short phone), 760 or 1000. Only the flexible part of the screen (hero, heading, gaps) shrinks; buttons, chips and the social row are fixedHeight and keep their size. The heading never drops under titleMinSize, and under minScale the screen scrolls instead. The numbers are auth.fit from @duncit/auth-tokens — the same ones native AuthScaffold and mWeb AuthHeading read.',
    mock: { available: 760 },
    compute: ({ available }) => {
      const scale = fitScale(available, FIT.designHeight, FIT.minScale, FIT.maxScale, FIT.fixedHeight);
      return {
        scale: Number(scale.toFixed(3)),
        heroRoom: fitSize(FIT.heroRoom, scale),
        logoTile: fitSize(FIT.logoSize, scale),
        title: fitSize(FIT.titleSize, scale, FIT.titleMinSize),
        subtitle: fitSize(FIT.subtitleSize, scale, FIT.subtitleMinSize),
        gap: fitSize(FIT.gap, scale),
      };
    },
  }),
];
