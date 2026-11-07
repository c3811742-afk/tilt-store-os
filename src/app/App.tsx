import type { ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { routes } from '@/shared/constants';
import { SignInPage } from '@/features/common/pages/SignInPage';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { OwnerRoutes } from '@/features/owner';
import { ManagerRoutes } from '@/features/manager';
import { StorekeeperRoutes } from '@/features/stock';
import { DriverRoutes } from '@/features/driver';
import { OnlineRoutes } from '@/features/online';
import type { BuiltInRole, BranchKind } from '@/shared/types';
import { AppErrorBoundary } from './AppErrorBoundary';
import { ThemeProvider } from './providers/ThemeProvider';
import { SessionProvider } from './providers/SessionProvider';
import { ReferenceProvider } from './providers/ReferenceProvider';
import { RequireOwner } from './routing/RequireOwner';
import { RequireRole } from './routing/RequireRole';
import { BranchScopeProvider } from './providers/BranchScopeProvider';

// Branch staff only see their own branches: managers their stores, storekeepers their stores or the warehouse.
// The online store is run by the online orders staff, so it is not one of a manager's branches.
const managerBranches: readonly BranchKind[] = ['store'];
const storekeeperBranches: readonly BranchKind[] = ['store', 'warehouse'];

// A role's pages, behind its sign-in check and with the reference data loaded.
const rolePages = (role: BuiltInRole, pages: ReactNode, branches?: readonly BranchKind[]) => (
  <RequireRole role={role}>
    <ReferenceProvider>{branches ? <BranchScopeProvider kinds={branches}>{pages}</BranchScopeProvider> : pages}</ReferenceProvider>
  </RequireRole>
);

// HashRouter (URLs like /#/stock/123): GitHub Pages has no server-side routing,
// so normal paths would 404 when a page is refreshed or opened from a link.
export const App = () => (
  <ThemeProvider>
    <HashRouter>
      <AppErrorBoundary>
        <SessionProvider>
          <Routes>
            <Route path={routes.home} element={<Navigate to={routes.signIn} replace />} />
            <Route path={routes.signIn} element={<SignInPage />} />
            <Route
              path={`${routes.owner.dashboard}/*`}
              element={
                <RequireOwner>
                  <ReferenceProvider>
                    <OwnerRoutes />
                  </ReferenceProvider>
                </RequireOwner>
              }
            />
            <Route path={`${routes.manager.dashboard}/*`} element={rolePages('manager', <ManagerRoutes />, managerBranches)} />
            <Route path={`${routes.storekeeper.home}/*`} element={rolePages('storekeeper', <StorekeeperRoutes />, storekeeperBranches)} />
            <Route path={`${routes.driver.jobs}/*`} element={rolePages('driver', <DriverRoutes />)} />
            <Route path={`${routes.online.orders}/*`} element={rolePages('online', <OnlineRoutes />)} />
            <Route path={routes.notFound} element={<NotFoundPage />} />
          </Routes>
        </SessionProvider>
      </AppErrorBoundary>
    </HashRouter>
  </ThemeProvider>
);
