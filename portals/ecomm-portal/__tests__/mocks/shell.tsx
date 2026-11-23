/** The shell's translator, reduced to "the key is the text" so tests can name the copy they expect. */
const t = (key: string) => key;

export const useTranslation = () => ({ t });
