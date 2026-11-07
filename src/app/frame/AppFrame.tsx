import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { runDailyBackup, setOfflineMode, signOut } from '@/shared/api';
import { AppLayout, type MenuItem } from '@/shared/components';
import { accountDefaults, routes, withQuery } from '@/shared/constants';
import { useConnection, useIdleTimeout, useLocale, useSession } from '@/shared/hooks';
import { safeAsync } from '@/shared/utils';
import { navFor } from '../navigation';
import { BranchPicker } from './BranchPicker';
import { ConnectionBanner } from './ConnectionBanner';
import { ProductSearch } from './ProductSearch';
import styles from './AppFrame.module.css';

// The frame around every signed-in page: the person's menu, branch, search, connection line and account menu.
// It also logs out after a period of inactivity and asks for a new password after a first sign-in.
export const AppFrame = () => {
  const { text } = useLocale();
  const { session, setSession } = useSession();
  const connection = useConnection();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const leave = async (reason: 'manual' | 'idle' | 'switch') => {
    await safeAsync(() => signOut(reason));
    setSession(null);
    navigate(reason === 'manual' ? routes.signIn : withQuery(routes.signIn, { mode: 'pin', reason }));
  };

  useIdleTimeout(accountDefaults.idleLogoutMinutes, () => void leave('idle'));

  // The daily backup runs the first time anyone opens the system that day.
  useEffect(() => {
    void safeAsync(runDailyBackup);
  }, []);

  if (!session) return <Navigate to={routes.signIn} replace />;
  if (session.user.mustChangePassword && pathname !== routes.changePassword) return <Navigate to={routes.changePassword} replace />;

  const accountItems: MenuItem[] = [
    { key: 'account', label: text.shell.myAccount, icon: 'user', to: routes.account },
    { key: 'help', label: text.shell.help, icon: 'info', to: routes.help },
    ...(session.user.brandId ? [] : [{ key: 'switch', label: text.shell.switchAccount, icon: 'users' as const, onSelect: () => void leave('switch') }]),
    { key: 'offline', label: connection.simulated ? text.shell.goOnline : text.shell.workOffline, icon: 'refresh', onSelect: () => setOfflineMode(!connection.simulated) },
  ];

  return (
    <AppLayout
      nav={navFor(session)}
      topStart={
        <>
          <BranchPicker />
          <span className={styles.search}>
            <ProductSearch />
          </span>
        </>
      }
      banner={<ConnectionBanner />}
      accountItems={accountItems}
      onSignOut={() => void leave('manual')}
    />
  );
};
