import UploadSettingPage from './UploadSettingPage';

/** Admin > Upload Settings > Mobile App. */
export default function MobileUploadSettingPage() {
  return (
    <UploadSettingPage
      surface="MOBILE"
      title="Mobile App Upload Setting"
      subtitle="Upload rules applied to the native app (pods, reels, statuses, avatars)."
    />
  );
}
