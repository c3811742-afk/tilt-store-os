import { Route, Routes } from 'react-router';
import { AppShell, PerRecord } from '@/shared/components';
import { relativeTo, routes } from '@/shared/constants';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { StaffNotificationsPage } from '@/features/common/pages/StaffNotificationsPage';
import { onlineNav } from './constants/nav';
import { OrdersPage } from './pages/OrdersPage';
import { OrderPage } from './pages/OrderPage';
import { OnlineStockPage } from './pages/OnlineStockPage';

const base = routes.online.orders;
const relative = (path: string) => relativeTo(base, path);

// Paths come from routes.online; they're matched relative to its home page.
export const OnlineRoutes = () => (
  <Routes>
    <Route element={<AppShell nav={onlineNav} notificationsTo={routes.online.notifications} />}>
      <Route path={relative(routes.online.notifications)} element={<StaffNotificationsPage />} />
      <Route index element={<OrdersPage />} />
      <Route path={relative(routes.online.order)} element={<PerRecord><OrderPage /></PerRecord>} />
      <Route path={relative(routes.online.stock)} element={<OnlineStockPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
