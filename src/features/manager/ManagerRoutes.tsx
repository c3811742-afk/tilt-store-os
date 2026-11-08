import { Route, Routes } from 'react-router';
import { PerRecord } from '@/shared/components';
import { relativeTo, routes } from '@/shared/constants';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { DashboardPage } from './pages/DashboardPage';
import { StaffPage } from './pages/StaffPage';
import { StockPage } from './pages/StockPage';
import { ItemPage } from './pages/ItemPage';
import { TransfersPage } from './pages/TransfersPage';
import { NewTransferPage } from './pages/NewTransferPage';
import { TransferPage } from './pages/TransferPage';
import { CountsPage } from './pages/CountsPage';
import { CountPage } from './pages/CountPage';
import { DefectsPage } from './pages/DefectsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { RegistersPage } from './pages/RegistersPage';
import { ReportsPage } from './pages/ReportsPage';

const base = routes.manager.dashboard;
const relative = (path: string) => relativeTo(base, path);

// Paths come from routes.manager; they're matched relative to its home page.
export const ManagerRoutes = () => (
  <Routes>
    <Route>
      <Route index element={<DashboardPage />} />
      <Route path={relative(routes.manager.staff)} element={<StaffPage />} />
      <Route path={relative(routes.manager.stock)} element={<StockPage />} />
      <Route path={relative(routes.manager.item)} element={<PerRecord><ItemPage /></PerRecord>} />
      <Route path={relative(routes.manager.transfers)} element={<TransfersPage />} />
      <Route path={relative(routes.manager.newTransfer)} element={<NewTransferPage />} />
      <Route path={relative(routes.manager.transfer)} element={<PerRecord><TransferPage /></PerRecord>} />
      <Route path={relative(routes.manager.counts)} element={<CountsPage />} />
      <Route path={relative(routes.manager.count)} element={<PerRecord><CountPage /></PerRecord>} />
      <Route path={relative(routes.manager.defects)} element={<DefectsPage />} />
      <Route path={relative(routes.manager.approvals)} element={<ApprovalsPage />} />
      <Route path={relative(routes.manager.registers)} element={<RegistersPage />} />
      <Route path={relative(routes.manager.reports)} element={<ReportsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
