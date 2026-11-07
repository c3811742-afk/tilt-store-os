import { Route, Routes } from 'react-router';
import { AppShell, BranchSwitcher, PerRecord } from '@/shared/components';
import { relativeTo, routes } from '@/shared/constants';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { StaffNotificationsPage } from '@/features/common/pages/StaffNotificationsPage';
import { storekeeperNav } from './constants/nav';
import { ReceivingListPage } from './pages/ReceivingListPage';
import { NewReceivingPage } from './pages/NewReceivingPage';
import { ReceivingPage } from './pages/ReceivingPage';
import { DefectsPage } from './pages/DefectsPage';
import { StockPage } from './pages/StockPage';
import { ItemPage } from './pages/ItemPage';
import { CountsPage } from './pages/CountsPage';
import { CountPage } from './pages/CountPage';
import { TransfersPage } from './pages/TransfersPage';
import { NewTransferPage } from './pages/NewTransferPage';
import { TransferPage } from './pages/TransferPage';
import { BrandReturnsPage } from './pages/BrandReturnsPage';
import { NewBrandReturnPage } from './pages/NewBrandReturnPage';
import { BrandReturnPage } from './pages/BrandReturnPage';
import { TodayPage } from './pages/TodayPage';

const base = routes.storekeeper.home;
const relative = (path: string) => relativeTo(base, path);

// Paths come from routes.storekeeper; they're matched relative to its home page.
export const StorekeeperRoutes = () => (
  <Routes>
    <Route element={<AppShell nav={storekeeperNav} notificationsTo={routes.storekeeper.notifications} topStart={<BranchSwitcher />} />}>
      <Route path={relative(routes.storekeeper.notifications)} element={<StaffNotificationsPage />} />
      <Route path={relative(routes.storekeeper.receiving)} element={<ReceivingListPage />} />
      <Route path={relative(routes.storekeeper.newReceiving)} element={<NewReceivingPage />} />
      <Route path={relative(routes.storekeeper.receivingRecord)} element={<PerRecord><ReceivingPage /></PerRecord>} />
      <Route path={relative(routes.storekeeper.defects)} element={<DefectsPage />} />
      <Route path={relative(routes.storekeeper.stock)} element={<StockPage />} />
      <Route path={relative(routes.storekeeper.item)} element={<PerRecord><ItemPage /></PerRecord>} />
      <Route path={relative(routes.storekeeper.counts)} element={<CountsPage />} />
      <Route path={relative(routes.storekeeper.count)} element={<PerRecord><CountPage /></PerRecord>} />
      <Route path={relative(routes.storekeeper.transfers)} element={<TransfersPage />} />
      <Route path={relative(routes.storekeeper.newTransfer)} element={<NewTransferPage />} />
      <Route path={relative(routes.storekeeper.transfer)} element={<PerRecord><TransferPage /></PerRecord>} />
      <Route path={relative(routes.storekeeper.brandReturns)} element={<BrandReturnsPage />} />
      <Route path={relative(routes.storekeeper.newBrandReturn)} element={<NewBrandReturnPage />} />
      <Route path={relative(routes.storekeeper.brandReturn)} element={<PerRecord><BrandReturnPage /></PerRecord>} />
      <Route index element={<TodayPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
