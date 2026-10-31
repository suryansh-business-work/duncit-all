import type { StoreOccasionTheme } from '@duncit/gql-types';

/**
 * What each of the store's built-in looks is called in the picker, in the
 * order it lists them. Keys are written out in full so the translation gate
 * can see each one is used.
 */
export const STORE_THEME_KEYS: Record<StoreOccasionTheme, string> = {
  NONE: 'marketing.storeOccasions.themeNone',
  DIWALI: 'marketing.storeOccasions.themeDiwali',
  HOLI: 'marketing.storeOccasions.themeHoli',
  DUSSEHRA: 'marketing.storeOccasions.themeDussehra',
  NAVRATRI: 'marketing.storeOccasions.themeNavratri',
  DURGA_PUJA: 'marketing.storeOccasions.themeDurgaPuja',
  GANESH_CHATURTHI: 'marketing.storeOccasions.themeGaneshChaturthi',
  JANMASHTAMI: 'marketing.storeOccasions.themeJanmashtami',
  MAKAR_SANKRANTI: 'marketing.storeOccasions.themeMakarSankranti',
  LOHRI: 'marketing.storeOccasions.themeLohri',
  PONGAL: 'marketing.storeOccasions.themePongal',
  ONAM: 'marketing.storeOccasions.themeOnam',
  RAKSHA_BANDHAN: 'marketing.storeOccasions.themeRakshaBandhan',
  KARWA_CHAUTH: 'marketing.storeOccasions.themeKarwaChauth',
  BAISAKHI: 'marketing.storeOccasions.themeBaisakhi',
  GURU_NANAK_JAYANTI: 'marketing.storeOccasions.themeGuruNanakJayanti',
  CHHATH_PUJA: 'marketing.storeOccasions.themeChhathPuja',
  EID: 'marketing.storeOccasions.themeEid',
  CHRISTMAS: 'marketing.storeOccasions.themeChristmas',
  HALLOWEEN: 'marketing.storeOccasions.themeHalloween',
  NEW_YEAR: 'marketing.storeOccasions.themeNewYear',
  VALENTINES_DAY: 'marketing.storeOccasions.themeValentinesDay',
  EASTER: 'marketing.storeOccasions.themeEaster',
  FRIENDSHIP_DAY: 'marketing.storeOccasions.themeFriendshipDay',
  MOTHERS_DAY: 'marketing.storeOccasions.themeMothersDay',
  FATHERS_DAY: 'marketing.storeOccasions.themeFathersDay',
  APRIL_FOOLS: 'marketing.storeOccasions.themeAprilFools',
  INDEPENDENCE_DAY: 'marketing.storeOccasions.themeIndependenceDay',
  REPUBLIC_DAY: 'marketing.storeOccasions.themeRepublicDay',
  GANDHI_JAYANTI: 'marketing.storeOccasions.themeGandhiJayanti',
  CHILDRENS_DAY: 'marketing.storeOccasions.themeChildrensDay',
  WOMENS_DAY: 'marketing.storeOccasions.themeWomensDay',
  YOGA_DAY: 'marketing.storeOccasions.themeYogaDay',
  EARTH_DAY: 'marketing.storeOccasions.themeEarthDay',
};

export const STORE_THEMES = Object.keys(STORE_THEME_KEYS) as StoreOccasionTheme[];
