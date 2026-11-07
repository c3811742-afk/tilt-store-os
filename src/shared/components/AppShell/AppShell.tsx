import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { signOut } from '@/shared/api';
import { routes } from '@/shared/constants';
import { useAppearance, useLocale, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { cx, safeAsync, withDefaults } from '@/shared/utils';
import { BrandLogo } from '../BrandLogo';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { Menu } from '../Menu';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { Thumbnail } from '../Thumbnail';
import { appShellDefaults } from './AppShell.defaults';
import type { AppShellProps } from './AppShell.types';
import { NotificationBell } from './NotificationBell';
import styles from './AppShell.module.css';

// Every role's frame: the side menu (a drawer on phones), the top bar and the page.
export const AppShell = (props: AppShellProps) => {
  const { nav, notificationsTo, topStart } = withDefaults(appShellDefaults, props);
  const { text, switchLocale } = useLocale();
  const { appearance, switchAppearance } = useAppearance();
  const { session, setSession } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname; // closes on the next page

  const onSignOut = async () => {
    await safeAsync(signOut);
    setSession(null);
    navigate(routes.signIn);
  };

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
            <span className={styles.mobileOnly}>
              <IconButton icon="menu" label={text.shell.menu} onClick={() => setMenuOpenOn(pathname)} expanded={menuOpen} />
            </span>
            {topStart}
          </div>
          <div className={styles.topEnd}>
            <IconButton icon="globe" label={text.common.switchLanguage} onClick={switchLocale} />
            <IconButton icon={appearance === 'light' ? 'moon' : 'sun'} label={appearance === 'light' ? text.common.darkMode : text.common.lightMode} onClick={switchAppearance} />
            {notificationsTo && <NotificationBell to={notificationsTo} />}
            <Menu
              trigger={({ open, toggle }) => (
                <button type="button" onClick={toggle} aria-expanded={open} aria-label={text.shell.account} className={styles.link}>
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
              items={[{ key: 'signOut', label: text.shell.signOut, icon: 'logOut', onSelect: () => void onSignOut() }]}
            />
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
