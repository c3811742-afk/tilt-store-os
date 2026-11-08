import { assets } from '@/shared/assets';
import { Button, Card, Grid, PageHeader, Stack, Text } from '@/shared/components';
import { supportDefaults } from '@/shared/constants';
import { useLocale, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, phoneDigits } from '@/shared/utils';
import styles from './HelpPage.module.css';

const guideRoles = ['owner', 'it', 'manager', 'cashier', 'brandPartner'] as const;

// A short video and guide for the person's role, and WhatsApp support.
export const HelpPage = () => {
  const { text } = useLocale();
  const { session } = useSession();
  const t = text.help;
  const role = guideRoles.find((current) => session?.roles.includes(current));
  const steps = role ? t.guides[role] : t.guides.other;
  const video = role ? assets.helpVideos[role] : undefined;
  const whatsApp = `https://wa.me/${phoneDigits(supportDefaults.whatsApp)}?text=${encodeURIComponent(fillText(t.supportMessage, { name: session?.user.name ?? '' }))}`;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Grid minColumnWidth={vars.sizes.card.minWidth}>
        {video && (
          <Card title={t.video}>
            <Text variant="bodySm" color={vars.colors.textMuted}>
              {t.videoHint}
            </Text>
            <video className={styles.video} src={video} controls preload="metadata" />
          </Card>
        )}
        <Card title={t.guide}>
          <ol className={styles.steps}>
            {steps.map((step) => (
              <li key={step}>
                <Text as="span" variant="bodySm">
                  {step}
                </Text>
              </li>
            ))}
          </ol>
        </Card>
        <Card title={t.support}>
          <Text variant="bodySm" color={vars.colors.textMuted}>
            {t.supportHint}
          </Text>
          <Text variant="h4">
            <bdi>{supportDefaults.whatsApp}</bdi>
          </Text>
          <div>
            <Button href={whatsApp}>{t.contact}</Button>
          </div>
        </Card>
      </Grid>
    </Stack>
  );
};
