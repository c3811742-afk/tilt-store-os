import { HashRouter, Route, Routes } from 'react-router';
import { routes } from '@/shared/constants';
import { SignInPage } from '@/features/common/pages/SignInPage';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { NotificationsPage } from '@/features/common/pages/NotificationsPage';
import { AccountPage, ChangePasswordPage } from '@/features/common/pages/AccountPage';
import { HelpPage } from '@/features/common/pages/HelpPage';
import { OwnerRoutes } from '@/features/owner';
import { CashierRoutes } from '@/features/cashier';
import { ItRoutes } from '@/features/it';
import { BrandRoutes } from '@/features/brand';
import { installErrorLog } from '@/shared/api';
import { AppErrorBoundary } from './AppErrorBoundary';
import { AppFrame } from './frame/AppFrame';
import { ThemeProvider } from './providers/ThemeProvider';
import { SessionProvider } from './providers/SessionProvider';
import { ReferenceProvider } from './providers/ReferenceProvider';
import { WorkBranchProvider } from './providers/WorkBranchProvider';
import { HomeRedirect } from './routing/HomeRedirect';
import { RequireOwner } from './routing/RequireOwner';
import { RequirePermission } from './routing/RequirePermission';
import { RequireSignedIn } from './routing/RequireSignedIn';

// Errors anywhere in the app are kept for the IT admin's error log.
installErrorLog();

// HashRouter (URLs like /#/stock/123): GitHub Pages has no server-side routing,
// so normal paths would 404 when a page is refreshed or opened from a link.
export const App = () => (
  <ThemeProvider>
    <HashRouter>
      <AppErrorBoundary>
        <SessionProvider>
          <Routes>
            <Route path={routes.home} element={<HomeRedirect />} />
            <Route path={routes.signIn} element={<SignInPage />} />
            {/* Every signed-in page, inside the same frame. Each role's pages check the role. */}
            <Route
              element={
                <RequireSignedIn>
                  <ReferenceProvider>
                    <WorkBranchProvider>
                      <AppFrame />
                    </WorkBranchProvider>
                  </ReferenceProvider>
                </RequireSignedIn>
              }
            >
              <Route
                path={`${routes.owner.dashboard}/*`}
                element={
                  <RequireOwner>
                    <OwnerRoutes />
                  </RequireOwner>
                }
              />
              <Route
                path={`${routes.cashier.sell}/*`}
                element={
                  <RequirePermission permission="sales.sell">
                    <CashierRoutes />
                  </RequirePermission>
                }
              />
              <Route
                path={`${routes.it.data}/*`}
                element={
                  <RequirePermission role="it">
                    <ItRoutes />
                  </RequirePermission>
                }
              />
              <Route
                path={`${routes.brand.home}/*`}
                element={
                  <RequirePermission permission="brandPortal.view">
                    <BrandRoutes />
                  </RequirePermission>
                }
              />
              <Route path={routes.notifications} element={<NotificationsPage />} />
              <Route path={routes.account} element={<AccountPage />} />
              <Route path={routes.changePassword} element={<ChangePasswordPage />} />
              <Route path={routes.help} element={<HelpPage />} />
            </Route>
            <Route path={routes.notFound} element={<NotFoundPage />} />
          </Routes>
        </SessionProvider>
      </AppErrorBoundary>
    </HashRouter>
  </ThemeProvider>
);
