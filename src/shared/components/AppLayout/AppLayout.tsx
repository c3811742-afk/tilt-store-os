import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAppearance, useLocale, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { cx, withDefaults } from '@/shared/utils';
import { BrandLogo } from '../BrandLogo';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { Menu } from '../Menu';
import { NotificationBell } from '../NotificationBell';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { Thumbnail } from '../Thumbnail';
import { appLayoutDefaults } from './AppLayout.defaults';
import type { AppLayoutProps } from './AppLayout.types';
import styles from './AppLayout.module.css';

// The frame around every signed-in page: the side menu (a drawer on phones), the top bar and the page.
export const AppLayout = (props: AppLayoutProps) => {
  const { nav, notificationsPath, topStart, banner, accountItems, onSignOut, children } = withDefaults(appLayoutDefaults, props);
  const { text, switchLocale } = useLocale();
  const { appearance, switchAppearance } = useAppearance();
  const { session } = useSession();
  const { pathname } = useLocation();
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname; // closes on the next page

  return (
    <div className={styles.layout}>
      {menuOpen && <button type="button" className={styles.backdrop} aria-label={text.common.close} onClick={() => setMenuOpenOn(null)} />}
      <nav className={cx(styles.sidebar, menuOpen && styles.open)} aria-label={text.shell.mainMenu}>
        <span className={styles.logo}>
          <BrandLogo size="md" />
        </span>
        {nav.map((group) => (
          <div key={group.key} className={styles.group}>
            <span className={styles.groupLabel}>{text.nav.groups[group.key]}</span>
            {group.items.map((item) => (
              <NavLink key={item.key} to={item.to} end={item.end} className={({ isActive }) => cx(styles.link, isActive && styles.active)}>
                <span aria-hidden>
                  <Icon name={item.icon} />
                </span>
                {text.nav[item.key]}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className={styles.main}>
        <header className={styles.topBar}>
          <div className={styles.topStart}>
            {nav.length > 0 && (
              <span className={styles.mobileOnly}>
                <IconButton icon="menu" label={text.shell.menu} onClick={() => setMenuOpenOn(pathname)} expanded={menuOpen} />
              </span>
            )}
            {topStart}
          </div>
          <div className={styles.topEnd}>
            <IconButton icon="globe" label={text.common.switchLanguage} onClick={switchLocale} />
            <IconButton icon={appearance === 'light' ? 'moon' : 'sun'} label={appearance === 'light' ? text.common.darkMode : text.common.lightMode} onClick={switchAppearance} />
            <NotificationBell viewAllPath={notificationsPath} />
            <Menu
              trigger={({ open, toggle }) => (
                <button type="button" onClick={toggle} aria-expanded={open} aria-label={text.shell.account} className={styles.avatarButton}>
                  <Thumbnail name={session?.user.name} src={session?.user.photo} round size={vars.sizes.avatar.sm} />
                </button>
              )}
              header={
                <Stack gap={vars.spacing[1]}>
                  <Text as="span" variant="caption" color={vars.colors.textMuted}>
                    {text.shell.signedInAs}
                  </Text>
                  <Text as="span" variant="h4">
                    {session?.user.name}
                  </Text>
                </Stack>
              }
              items={[...accountItems, { key: 'signOut', label: text.shell.signOut, icon: 'logOut', onSelect: onSignOut }]}
            />
          </div>
        </header>
        {banner}
        <main className={styles.content}>{children ?? <Outlet />}</main>
      </div>
    </div>
  );
};
