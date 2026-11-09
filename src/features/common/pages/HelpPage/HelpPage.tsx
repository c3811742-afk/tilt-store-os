import { useState } from 'react';
import { assets } from '@/shared/assets';
import { Accordion, Button, Card, Grid, PageHeader, SearchBox, Stack, Text } from '@/shared/components';
import { supportDefaults } from '@/shared/constants';
import { useLocale, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, phoneDigits } from '@/shared/utils';
import styles from './HelpPage.module.css';

const guideRoles = ['owner', 'it', 'manager', 'storekeeper', 'cashier', 'brandPartner'] as const;

// Laid out like a help centre: search at the top, getting started for the person's role (a short video beside the
// steps), common questions that open when clicked (narrowed by the search), and support at the end.
export const HelpPage = () => {
  const { text } = useLocale();
  const { session } = useSession();
  const [query, setQuery] = useState('');
  const t = text.help;
  const role = guideRoles.find((current) => session?.roles.includes(current));
  const steps = role ? t.guides[role] : t.guides.other;
  const video = role && role !== 'storekeeper' ? assets.helpVideos[role] : undefined;
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const faqs = (role ? t.faqs[role] : t.faqs.other).filter((faq) => words.every((word) => `${faq.q} ${faq.a}`.toLowerCase().includes(word)));
  const whatsApp = `https://wa.me/${phoneDigits(supportDefaults.whatsApp)}?text=${encodeURIComponent(fillText(t.supportMessage, { name: session?.user.name ?? '' }))}`;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <SearchBox label={t.search} placeholder={t.search} value={query} onChange={setQuery} />
      <Card title={t.gettingStarted}>
        <Grid minColumnWidth={vars.sizes.card.minWidth} alignItems="start">
          {video && <video className={styles.video} src={video} controls preload="metadata" />}
          <ol className={styles.steps}>
            {steps.map((step) => (
              <li key={step}>
                <Text as="span" variant="bodySm">
                  {step}
                </Text>
              </li>
            ))}
          </ol>
        </Grid>
      </Card>
      <Card title={t.faq}>
        <Accordion
          items={faqs.map((faq) => ({ key: faq.q, title: faq.q, content: faq.a }))}
          emptyText={fillText(t.noAnswers, { query: query.trim() })}
        />
      </Card>
      <Card title={t.stillNeedHelp}>
        <Stack direction="row" wrap justify="space-between" align="center" gap={vars.spacing[3]}>
          <Text variant="h4">
            <bdi>{supportDefaults.whatsApp}</bdi>
          </Text>
          <Button href={whatsApp}>{t.contact}</Button>
        </Stack>
      </Card>
    </Stack>
  );
};
