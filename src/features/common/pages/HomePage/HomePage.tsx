import { BrandLogo, Button, Container, Text } from '@/shared/components';
import { useAppearance, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import styles from './HomePage.module.css';

// Placeholder start page: shows the brand, the theme and both switches. Replace with the login screen.
export const HomePage = () => {
  const { text, switchLocale } = useLocale();
  const { appearance, switchAppearance } = useAppearance();
  const appearanceLabel = appearance === 'light' ? text.common.darkMode : text.common.lightMode;

  return (
    <Container as="main">
      <section className={styles.hero}>
        <BrandLogo size="lg" />
        <Text as="h1" variant="display">
          {text.home.title}
        </Text>
        <Text color={vars.colors.textMuted}>{text.home.subtitle}</Text>
        <div className={styles.actions}>
          <Button>{text.home.cta}</Button>
          <Button variant="secondary" onClick={switchLocale}>
            {text.common.switchLanguage}
          </Button>
          <Button variant="secondary" onClick={switchAppearance}>
            {appearanceLabel}
          </Button>
        </div>
      </section>
    </Container>
  );
};
