import { Route, Routes } from 'react-router';
import { AppShell, PerRecord } from '@/shared/components';
import { relativeTo, routes } from '@/shared/constants';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { StaffNotificationsPage } from '@/features/common/pages/StaffNotificationsPage';
import { driverNav } from './constants/nav';
import { JobsPage } from './pages/JobsPage';
import { JobPage } from './pages/JobPage';

const base = routes.driver.jobs;
const relative = (path: string) => relativeTo(base, path);

// Paths come from routes.driver; they're matched relative to its home page.
export const DriverRoutes = () => (
  <Routes>
    <Route element={<AppShell nav={driverNav} notificationsTo={routes.driver.notifications} />}>
      <Route path={relative(routes.driver.notifications)} element={<StaffNotificationsPage />} />
      <Route index element={<JobsPage />} />
      <Route path={relative(routes.driver.job)} element={<PerRecord><JobPage /></PerRecord>} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
