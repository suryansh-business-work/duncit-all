import { INDIAN_LOOKS } from './occasion.catalogue.indian';
import { NATIONAL_LOOKS, WORLD_LOOKS } from './occasion.catalogue.world';

/**
 * The looks Duncit ships: India's big festivals, its national days and the
 * days the world celebrates. Seeded once each (an edited one is never
 * overwritten) and restorable with "Reset to built-in".
 */
export const BUILTIN_LOOKS = [...INDIAN_LOOKS, ...NATIONAL_LOOKS, ...WORLD_LOOKS];

export const builtinLook = (key: string) => BUILTIN_LOOKS.find((look) => look.key === key) ?? null;
