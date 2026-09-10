import useMediaPicker from '../../shared/useMediaPicker';

/**
 * The club form's media picker — the shared bridge, rooted at `/clubs` so a
 * club's images land beside each other. The bridge itself is shared with every
 * other console editor (rule 34).
 */
export default function useClubImagePicker() {
  return useMediaPicker('/clubs');
}
