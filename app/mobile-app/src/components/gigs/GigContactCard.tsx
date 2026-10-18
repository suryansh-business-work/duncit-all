import { Linking } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { gigContactLinks, type GigContact } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { ContactSharingNotice } from './GigNote';

interface Props {
  contact: GigContact;
  /** Heading override — the poster sees a freelancer's card under their name. */
  title?: string;
  testID?: string;
}

/** A shared contact with call, WhatsApp and mail, and the free-for-now notice. mWeb twin: GigContactCard. */
export function GigContactCard({ contact, title, testID = 'gig-contact' }: Readonly<Props>) {
  const { t } = useTranslation();
  const links = gigContactLinks(contact);
  const open = (url: string) => fireAndForget(Linking.openURL(url));
  const actions = [
    { key: 'call', label: t('gigJobs.contact.call'), url: links.call },
    { key: 'whatsapp', label: t('gigJobs.contact.whatsapp'), url: links.whatsapp },
    { key: 'email', label: t('gigJobs.contact.email'), url: links.email },
  ].flatMap((action) => (action.url ? [{ ...action, url: action.url }] : []));

  return (
    <SurfaceCard gap={10} testID={testID}>
      <Text fontSize={13} fontWeight="700" color="$color">
        {title ?? t('gigJobs.contact.title')}
      </Text>
      <YStack gap={2}>
        <Text fontSize={14.5} color="$color">
          {contact.name}
        </Text>
        {contact.phone ? (
          <Text fontSize={13} color="$muted">
            {contact.phone}
          </Text>
        ) : null}
        {contact.email ? (
          <Text fontSize={13} color="$muted">
            {contact.email}
          </Text>
        ) : null}
      </YStack>
      <XStack gap={8} flexWrap="wrap">
        {actions.map((action) => (
          <DuncitButton
            key={action.key}
            label={action.label}
            variant="outline"
            size="sm"
            onPress={() => open(action.url)}
            testID={`${testID}-${action.key}`}
          />
        ))}
      </XStack>
      <ContactSharingNotice />
    </SurfaceCard>
  );
}
