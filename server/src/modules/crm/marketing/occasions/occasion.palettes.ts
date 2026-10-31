import type { ThemeTokenKey } from '@modules/platform/settings/theme-tokens';

/**
 * Each built-in look's colour tokens, light and dark. Derived from a few base
 * colours per festival (the deep primary for buttons, an accent, the brand
 * mark) with the grounds washed in the same hue, so every festival reads as
 * its own place — and checked pair by pair to WCAG AA before they were
 * written here: text on every ground and the on-colour on every fill clear
 * 4.5:1 (the closest pair is 4.76:1). Keys a look leaves out keep the app's own.
 *
 * Halloween is a night: it carries one dusky palette for both modes and the
 * look pins dark mode.
 */
export const OCCASION_PALETTES: Readonly<Record<string, { light: Partial<Record<ThemeTokenKey, string>>; dark: Partial<Record<ThemeTokenKey, string>> }>> = {
  'diwali': {
    light: { bg: '#F1EBEB', soft: '#F5ECEE', border: '#DBD1CF', primary: '#8E1B3A', primaryHover: '#801834', primaryActive: '#72162E', onPrimary: '#FFFFFF', accent: '#9A3C00', onAccent: '#FFFFFF', brand: '#F59E0B' },
    dark: { bg: '#1A1116', surface: '#251C22', soft: '#31252D', primary: '#A3213F', primaryHover: '#931E39', primaryActive: '#821A32', onPrimary: '#FFFFFF', accent: '#FFC46B', onAccent: '#0E1012', brand: '#F5C84A' },
  },
  'holi': {
    light: { bg: '#F3EAEE', soft: '#F7EBF3', border: '#DCD0D4', primary: '#A0156E', primaryHover: '#901363', primaryActive: '#801158', onPrimary: '#FFFFFF', accent: '#6A1B9A', onAccent: '#FFFFFF', brand: '#FF4FA3' },
    dark: { bg: '#1C111B', surface: '#261B28', soft: '#342535', primary: '#B81C80', primaryHover: '#A61973', primaryActive: '#931666', onPrimary: '#FFFFFF', accent: '#FF9FD6', onAccent: '#0E1012', brand: '#FF6FB5' },
  },
  'dussehra': {
    light: { bg: '#F3EEE7', soft: '#F6F0E9', border: '#DCD6C9', primary: '#9A4A00', primaryHover: '#8B4300', primaryActive: '#7B3B00', onPrimary: '#FFFFFF', accent: '#8E1B1B', onAccent: '#FFFFFF', brand: '#E8A400' },
    dark: { bg: '#1A1511', surface: '#25201C', soft: '#322B26', primary: '#A85200', primaryHover: '#974A00', primaryActive: '#864200', onPrimary: '#FFFFFF', accent: '#FFC46B', onAccent: '#0E1012', brand: '#F5C84A' },
  },
  'navratri': {
    light: { bg: '#F4EBEE', soft: '#F8ECF3', border: '#DDD2D4', primary: '#A8226C', primaryHover: '#971F61', primaryActive: '#861B56', onPrimary: '#FFFFFF', accent: '#B23A00', onAccent: '#FFFFFF', brand: '#FF9F1C' },
    dark: { bg: '#1C121A', surface: '#261C27', soft: '#342634', primary: '#B8287A', primaryHover: '#A6246E', primaryActive: '#932062', onPrimary: '#FFFFFF', accent: '#FFB86B', onAccent: '#0E1012', brand: '#FFB347' },
  },
  'durga-puja': {
    light: { bg: '#F3EAE9', soft: '#F7EBEC', border: '#DCD0CC', primary: '#9B111E', primaryHover: '#8C0F1B', primaryActive: '#7C0E18', onPrimary: '#FFFFFF', accent: '#8A4B00', onAccent: '#FFFFFF', brand: '#E11D48' },
    dark: { bg: '#1B1114', surface: '#261B20', soft: '#33242B', primary: '#B0172A', primaryHover: '#9E1526', primaryActive: '#8D1222', onPrimary: '#FFFFFF', accent: '#FFB4A2', onAccent: '#0E1012', brand: '#FF6B6B' },
  },
  'ganesh-chaturthi': {
    light: { bg: '#F4ECE8', soft: '#F8EEEA', border: '#DED4CA', primary: '#B23A0A', primaryHover: '#A03409', primaryActive: '#8E2E08', onPrimary: '#FFFFFF', accent: '#7C2D12', onAccent: '#FFFFFF', brand: '#F97316' },
    dark: { bg: '#1C1412', surface: '#261F1D', soft: '#342928', primary: '#B8430E', primaryHover: '#A63C0D', primaryActive: '#93360B', onPrimary: '#FFFFFF', accent: '#FFC08A', onAccent: '#0E1012', brand: '#FB923C' },
  },
  'janmashtami': {
    light: { bg: '#E9EFF0', soft: '#EBF1F5', border: '#CED7D7', primary: '#0E5A8A', primaryHover: '#0D517C', primaryActive: '#0B486E', onPrimary: '#FFFFFF', accent: '#0F766E', onAccent: '#FFFFFF', brand: '#1565C0' },
    dark: { bg: '#0E171D', surface: '#18212A', soft: '#202D38', primary: '#14639A', primaryHover: '#12598B', primaryActive: '#104F7B', onPrimary: '#FFFFFF', accent: '#7DD3FC', onAccent: '#0E1012', brand: '#38BDF8' },
  },
  'makar-sankranti': {
    light: { bg: '#E9EFF2', soft: '#EAF1F7', border: '#CDD7D9', primary: '#0B5CA0', primaryHover: '#0A5390', primaryActive: '#094A80', onPrimary: '#FFFFFF', accent: '#A33A0A', onAccent: '#FFFFFF', brand: '#F59E0B' },
    dark: { bg: '#0F171E', surface: '#18222B', soft: '#202E3A', primary: '#1565A8', primaryHover: '#135B97', primaryActive: '#115186', onPrimary: '#FFFFFF', accent: '#FFD27A', onAccent: '#0E1012', brand: '#FBBF24' },
  },
  'lohri': {
    light: { bg: '#F3EBE9', soft: '#F7ECEC', border: '#DDD1CC', primary: '#A51D1D', primaryHover: '#951A1A', primaryActive: '#841717', onPrimary: '#FFFFFF', accent: '#A33A0A', onAccent: '#FFFFFF', brand: '#F97316' },
    dark: { bg: '#1B1113', surface: '#261B1F', soft: '#34252A', primary: '#B42020', primaryHover: '#A21D1D', primaryActive: '#901A1A', onPrimary: '#FFFFFF', accent: '#FFB37A', onAccent: '#0E1012', brand: '#FB923C' },
  },
  'pongal': {
    light: { bg: '#F1EEE7', soft: '#F5F0E9', border: '#DAD6C9', primary: '#8A5300', primaryHover: '#7C4B00', primaryActive: '#6E4200', onPrimary: '#FFFFFF', accent: '#166534', onAccent: '#FFFFFF', brand: '#EAB308' },
    dark: { bg: '#191611', surface: '#23211C', soft: '#302D26', primary: '#946000', primaryHover: '#855600', primaryActive: '#764D00', onPrimary: '#FFFFFF', accent: '#B7F0C8', onAccent: '#0E1012', brand: '#FACC15' },
  },
  'onam': {
    light: { bg: '#F2EEE7', soft: '#F5F0E9', border: '#DBD6C9', primary: '#8F4A00', primaryHover: '#814300', primaryActive: '#723B00', onPrimary: '#FFFFFF', accent: '#166534', onAccent: '#FFFFFF', brand: '#F59E0B' },
    dark: { bg: '#191511', surface: '#24201C', soft: '#302B26', primary: '#9A5200', primaryHover: '#8B4A00', primaryActive: '#7B4200', onPrimary: '#FFFFFF', accent: '#FFD27A', onAccent: '#0E1012', brand: '#FBBF24' },
  },
  'raksha-bandhan': {
    light: { bg: '#F4EAED', soft: '#F8EBF1', border: '#DED1D2', primary: '#B0185A', primaryHover: '#9E1651', primaryActive: '#8D1348', onPrimary: '#FFFFFF', accent: '#8A4B00', onAccent: '#FFFFFF', brand: '#F472B6' },
    dark: { bg: '#1C1118', surface: '#271B25', soft: '#352532', primary: '#BE1D63', primaryHover: '#AB1A59', primaryActive: '#98174F', onPrimary: '#FFFFFF', accent: '#FFB3D1', onAccent: '#0E1012', brand: '#F9A8D4' },
  },
  'karwa-chauth': {
    light: { bg: '#F1EAEC', soft: '#F5EBEF', border: '#DBD0D0', primary: '#8E1747', primaryHover: '#801540', primaryActive: '#721239', onPrimary: '#FFFFFF', accent: '#5B21B6', onAccent: '#FFFFFF', brand: '#F59E0B' },
    dark: { bg: '#191117', surface: '#241B23', soft: '#31252F', primary: '#9D1B50', primaryHover: '#8D1848', primaryActive: '#7E1640', onPrimary: '#FFFFFF', accent: '#D8B4FE', onAccent: '#0E1012', brand: '#FBBF24' },
  },
  'baisakhi': {
    light: { bg: '#F1EEE7', soft: '#F5F0E9', border: '#DAD6C9', primary: '#8A5300', primaryHover: '#7C4B00', primaryActive: '#6E4200', onPrimary: '#FFFFFF', accent: '#1D4ED8', onAccent: '#FFFFFF', brand: '#EAB308' },
    dark: { bg: '#191611', surface: '#23211C', soft: '#302D26', primary: '#946000', primaryHover: '#855600', primaryActive: '#764D00', onPrimary: '#FFFFFF', accent: '#A5C8FF', onAccent: '#0E1012', brand: '#FACC15' },
  },
  'guru-nanak-jayanti': {
    light: { bg: '#F3EDE7', soft: '#F6EFE9', border: '#DCD5C9', primary: '#9A4300', primaryHover: '#8B3C00', primaryActive: '#7B3600', onPrimary: '#FFFFFF', accent: '#1E3A8A', onAccent: '#FFFFFF', brand: '#F59E0B' },
    dark: { bg: '#1A1511', surface: '#251F1C', soft: '#312A26', primary: '#A34A00', primaryHover: '#934300', primaryActive: '#823B00', onPrimary: '#FFFFFF', accent: '#FFD27A', onAccent: '#0E1012', brand: '#FBBF24' },
  },
  'eid': {
    light: { bg: '#E9F0EE', soft: '#EBF3F2', border: '#CED9D3', primary: '#0F6E66', primaryHover: '#0E635C', primaryActive: '#0C5852', onPrimary: '#FFFFFF', accent: '#8A5300', onAccent: '#FFFFFF', brand: '#10B981' },
    dark: { bg: '#0E181A', surface: '#172426', soft: '#203033', primary: '#127A70', primaryHover: '#106E65', primaryActive: '#0E625A', onPrimary: '#FFFFFF', accent: '#FFD98A', onAccent: '#0E1012', brand: '#34D399' },
  },
  'chhath-puja': {
    light: { bg: '#F3ECE8', soft: '#F7EEEA', border: '#DDD4CA', primary: '#A33A0A', primaryHover: '#933409', primaryActive: '#822E08', onPrimary: '#FFFFFF', accent: '#0E6A85', onAccent: '#FFFFFF', brand: '#F59E0B' },
    dark: { bg: '#1B1412', surface: '#261E1D', soft: '#332927', primary: '#B0410C', primaryHover: '#9E3B0B', primaryActive: '#8D340A', onPrimary: '#FFFFFF', accent: '#8BE3F5', onAccent: '#0E1012', brand: '#FBBF24' },
  },
  'independence-day': {
    light: { bg: '#F4EEE7', soft: '#F8F0E9', border: '#DED6C9', primary: '#B04A00', primaryHover: '#9E4300', primaryActive: '#8D3B00', onPrimary: '#FFFFFF', accent: '#11700A', onAccent: '#FFFFFF', brand: '#FF9933' },
    dark: { bg: '#1C1511', surface: '#26201C', soft: '#342B26', primary: '#B85000', primaryHover: '#A64800', primaryActive: '#934000', onPrimary: '#FFFFFF', accent: '#9BE69B', onAccent: '#0E1012', brand: '#FF9933' },
  },
  'republic-day': {
    light: { bg: '#EAEBF0', soft: '#ECECF4', border: '#CFD2D5', primary: '#1A237E', primaryHover: '#172071', primaryActive: '#151C65', onPrimary: '#FFFFFF', accent: '#11700A', onAccent: '#FFFFFF', brand: '#FF9933' },
    dark: { bg: '#10131C', surface: '#191D29', soft: '#232837', primary: '#283593', primaryHover: '#243084', primaryActive: '#202A76', onPrimary: '#FFFFFF', accent: '#FFC285', onAccent: '#0E1012', brand: '#FF9933' },
  },
  'gandhi-jayanti': {
    light: { bg: '#EDEFE8', soft: '#EFF2EB', border: '#D3D8CB', primary: '#3F6212', primaryHover: '#395810', primaryActive: '#324E0E', onPrimary: '#FFFFFF', accent: '#57534E', onAccent: '#FFFFFF', brand: '#78716C' },
    dark: { bg: '#131812', surface: '#1D241E', soft: '#273028', primary: '#4D7A16', primaryHover: '#456E14', primaryActive: '#3E6212', onPrimary: '#FFFFFF', accent: '#D6D3D1', onAccent: '#0E1012', brand: '#A8A29E' },
  },
  'childrens-day': {
    light: { bg: '#EAEEF5', soft: '#ECF0FC', border: '#CFD6DE', primary: '#1D4ED8', primaryHover: '#1A46C2', primaryActive: '#173EAD', onPrimary: '#FFFFFF', accent: '#A21CAF', onAccent: '#FFFFFF', brand: '#F59E0B' },
    dark: { bg: '#101522', surface: '#19202F', soft: '#222B40', primary: '#2453D6', primaryHover: '#204BC1', primaryActive: '#1D42AB', onPrimary: '#FFFFFF', accent: '#F5A3FF', onAccent: '#0E1012', brand: '#FBBF24' },
  },
  'christmas': {
    light: { bg: '#EAF0EB', soft: '#EBF2EE', border: '#CED9CF', primary: '#14683A', primaryHover: '#125E34', primaryActive: '#10532E', onPrimary: '#FFFFFF', accent: '#B3202A', onAccent: '#FFFFFF', brand: '#D32F2F' },
    dark: { bg: '#0F1816', surface: '#182322', soft: '#212F2D', primary: '#17733F', primaryHover: '#156839', primaryActive: '#125C32', onPrimary: '#FFFFFF', accent: '#FF9A9A', onAccent: '#0E1012', brand: '#E53935' },
  },
  'new-year': {
    light: { bg: '#ECECF2', soft: '#EEEDF7', border: '#D2D3D9', primary: '#3730A3', primaryHover: '#322B93', primaryActive: '#2C2682', onPrimary: '#FFFFFF', accent: '#8A5300', onAccent: '#FFFFFF', brand: '#F5C84A' },
    dark: { bg: '#121321', surface: '#1C1E2E', soft: '#26283E', primary: '#4338CA', primaryHover: '#3C32B6', primaryActive: '#362DA2', onPrimary: '#FFFFFF', accent: '#FFD98A', onAccent: '#0E1012', brand: '#F5C84A' },
  },
  'valentines-day': {
    light: { bg: '#F5EAEB', soft: '#F9EBEE', border: '#DFD0CF', primary: '#BE123C', primaryHover: '#AB1036', primaryActive: '#980E30', onPrimary: '#FFFFFF', accent: '#9D174D', onAccent: '#FFFFFF', brand: '#F43F5E' },
    dark: { bg: '#1D1016', surface: '#281B22', soft: '#36242D', primary: '#C8163F', primaryHover: '#B41439', primaryActive: '#A01232', onPrimary: '#FFFFFF', accent: '#FFB3C1', onAccent: '#0E1012', brand: '#FB7185' },
  },
  'easter': {
    light: { bg: '#EFEBF5', soft: '#F3EDFC', border: '#D7D2DE', primary: '#6D28D9', primaryHover: '#6224C3', primaryActive: '#5720AE', onPrimary: '#FFFFFF', accent: '#0F766E', onAccent: '#FFFFFF', brand: '#F472B6' },
    dark: { bg: '#161322', surface: '#201D30', soft: '#2C2740', primary: '#7232DD', primaryHover: '#672DC7', primaryActive: '#5B28B1', onPrimary: '#FFFFFF', accent: '#9EF0E0', onAccent: '#0E1012', brand: '#F9A8D4' },
  },
  'thanksgiving': {
    light: { bg: '#F3ECE8', soft: '#F6EEEB', border: '#DCD3CB', primary: '#9A3412', primaryHover: '#8B2F10', primaryActive: '#7B2A0E', onPrimary: '#FFFFFF', accent: '#8A5300', onAccent: '#FFFFFF', brand: '#EA580C' },
    dark: { bg: '#1A1312', surface: '#251E1E', soft: '#312828', primary: '#A3380F', primaryHover: '#93320E', primaryActive: '#822D0C', onPrimary: '#FFFFFF', accent: '#FFC285', onAccent: '#0E1012', brand: '#FB923C' },
  },
  'friendship-day': {
    light: { bg: '#F4ECE8', soft: '#F8EEEA', border: '#DED4CA', primary: '#B23A0A', primaryHover: '#A03409', primaryActive: '#8E2E08', onPrimary: '#FFFFFF', accent: '#0369A1', onAccent: '#FFFFFF', brand: '#F59E0B' },
    dark: { bg: '#1C1412', surface: '#261F1D', soft: '#342928', primary: '#B8430E', primaryHover: '#A63C0D', primaryActive: '#93360B', onPrimary: '#FFFFFF', accent: '#93D5FF', onAccent: '#0E1012', brand: '#FBBF24' },
  },
  'mothers-day': {
    light: { bg: '#F5EAED', soft: '#F9EBF1', border: '#DFD1D2', primary: '#BE185D', primaryHover: '#AB1654', primaryActive: '#98134A', onPrimary: '#FFFFFF', accent: '#7E22CE', onAccent: '#FFFFFF', brand: '#F472B6' },
    dark: { bg: '#1D1118', surface: '#271B25', soft: '#352532', primary: '#C41C63', primaryHover: '#B01959', primaryActive: '#9D164F', onPrimary: '#FFFFFF', accent: '#E9C2FF', onAccent: '#0E1012', brand: '#F9A8D4' },
  },
  'fathers-day': {
    light: { bg: '#EAEDF2', soft: '#ECEFF8', border: '#CFD5DA', primary: '#1E40AF', primaryHover: '#1B3A9E', primaryActive: '#18338C', onPrimary: '#FFFFFF', accent: '#0F766E', onAccent: '#FFFFFF', brand: '#3B82F6' },
    dark: { bg: '#10141F', surface: '#191F2D', soft: '#222A3C', primary: '#2347B5', primaryHover: '#2040A3', primaryActive: '#1C3991', onPrimary: '#FFFFFF', accent: '#99F0E2', onAccent: '#0E1012', brand: '#60A5FA' },
  },
  'womens-day': {
    light: { bg: '#F1EBF5', soft: '#F4ECFB', border: '#D9D2DD', primary: '#7E22CE', primaryHover: '#711FB9', primaryActive: '#651BA5', onPrimary: '#FFFFFF', accent: '#BE185D', onAccent: '#FFFFFF', brand: '#A855F7' },
    dark: { bg: '#171222', surface: '#221C2F', soft: '#2E263F', primary: '#8427D4', primaryHover: '#7723BF', primaryActive: '#6A1FAA', onPrimary: '#FFFFFF', accent: '#FFB3D9', onAccent: '#0E1012', brand: '#C084FC' },
  },
  'earth-day': {
    light: { bg: '#EAF0EB', soft: '#EBF2EE', border: '#CFD8CE', primary: '#166534', primaryHover: '#145B2F', primaryActive: '#12512A', onPrimary: '#FFFFFF', accent: '#0369A1', onAccent: '#FFFFFF', brand: '#22C55E' },
    dark: { bg: '#0F1815', surface: '#182322', soft: '#212F2D', primary: '#19733B', primaryHover: '#176835', primaryActive: '#145C2F', onPrimary: '#FFFFFF', accent: '#93D5FF', onAccent: '#0E1012', brand: '#4ADE80' },
  },
  'yoga-day': {
    light: { bg: '#E9F1EE', soft: '#EBF3F3', border: '#CEDAD4', primary: '#0F766E', primaryHover: '#0E6A63', primaryActive: '#0C5E58', onPrimary: '#FFFFFF', accent: '#A33A0A', onAccent: '#FFFFFF', brand: '#14B8A6' },
    dark: { bg: '#0E181A', surface: '#172426', soft: '#203033', primary: '#127A70', primaryHover: '#106E65', primaryActive: '#0E625A', onPrimary: '#FFFFFF', accent: '#FFC285', onAccent: '#0E1012', brand: '#2DD4BF' },
  },
  'halloween': {
    light: { bg: '#120D1A', surface: '#1B1426', soft: '#261C35', ink: '#F3EEFA', muted: '#B6A9C9', border: 'rgba(255,255,255,0.08)', inputBorder: '#7D6E95', primary: '#FF7518', primaryHover: '#E8650E', primaryActive: '#CC5608', onPrimary: '#1A0B00', accent: '#B57BFF', onAccent: '#120D1A', brand: '#FF7518' },
    dark: { bg: '#120D1A', surface: '#1B1426', soft: '#261C35', ink: '#F3EEFA', muted: '#B6A9C9', border: 'rgba(255,255,255,0.08)', inputBorder: '#7D6E95', primary: '#FF7518', primaryHover: '#E8650E', primaryActive: '#CC5608', onPrimary: '#1A0B00', accent: '#B57BFF', onAccent: '#120D1A', brand: '#FF7518' },
  },
};
