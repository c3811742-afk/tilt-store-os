import { Route, Routes } from 'react-router';
import { routes } from '@/shared/constants';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { CartProvider } from './hooks/CartProvider';
import { SellPage } from './pages/SellPage';
import { HeldPage } from './pages/HeldPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { StockPage } from './pages/StockPage';
import { CustomerPage, CustomersPage } from './pages/CustomersPage';
import { ShiftPage } from './pages/ShiftPage';
import { MySalesPage } from './pages/MySalesPage';

// The counter's pages, inside the app's frame. Paths come from routes.cashier; they're matched relative to /cashier.
const relative = (path: string) => path.replace(`${routes.cashier.sell}/`, '');

export const CashierRoutes = () => (
  <CartProvider>
    <Routes>
      <Route index element={<SellPage />} />
      <Route path={relative(routes.cashier.held)} element={<HeldPage />} />
      <Route path={relative(routes.cashier.returns)} element={<ReturnsPage />} />
      <Route path={relative(routes.cashier.receipts)} element={<ReceiptsPage />} />
      <Route path={relative(routes.cashier.receipt)} element={<ReceiptPage />} />
      <Route path={relative(routes.cashier.stock)} element={<StockPage />} />
      <Route path={relative(routes.cashier.stockItem)} element={<StockPage />} />
      <Route path={relative(routes.cashier.customers)} element={<CustomersPage />} />
      <Route path={relative(routes.cashier.customer)} element={<CustomerPage />} />
      <Route path={relative(routes.cashier.shift)} element={<ShiftPage />} />
      <Route path={relative(routes.cashier.mySales)} element={<MySalesPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </CartProvider>
);
