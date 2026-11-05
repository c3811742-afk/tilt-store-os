import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { routes } from '@/shared/constants';
import { SignInPage } from '@/features/common/pages/SignInPage';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { OwnerRoutes } from '@/features/owner';
import { AppErrorBoundary } from './AppErrorBoundary';
import { ThemeProvider } from './providers/ThemeProvider';
import { SessionProvider } from './providers/SessionProvider';
import { ReferenceProvider } from './providers/ReferenceProvider';
import { RequireOwner } from './routing/RequireOwner';

// HashRouter (URLs like /#/stock/123): GitHub Pages has no server-side routing,
// so normal paths would 404 when a page is refreshed or opened from a link.
export const App = () => (
  <ThemeProvider>
    <HashRouter>
      <AppErrorBoundary>
        <SessionProvider>
          <Routes>
            <Route path={routes.home} element={<Navigate to={routes.owner.dashboard} replace />} />
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
            <Route path={routes.notFound} element={<NotFoundPage />} />
          </Routes>
        </SessionProvider>
      </AppErrorBoundary>
    </HashRouter>
  </ThemeProvider>
);
