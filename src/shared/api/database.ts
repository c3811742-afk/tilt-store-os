import type {
  ActivityEntry,
  AppNotification,
  ApprovalRequest,
  Batch,
  Branch,
  Brand,
  BrandPayment,
  Category,
  Customer,
  Defect,
  ExchangeRate,
  Expense,
  FeeCharge,
  PriceChange,
  PriceSchedule,
  Product,
  PromoCode,
  Promotion,
  Receiving,
  Role,
  Sale,
  SaleReturn,
  Settings,
  Shift,
  Statement,
  StockCount,
  StockMovement,
  StockRequest,
  TillDevice,
  Transfer,
  User,
  VatRate,
  WriteOff,
} from '@/shared/types';

// The demo's whole data set. In a real system each list is a database table behind an API.
export interface Database {
  version: number;
  settings: Settings;
  branches: Branch[];
  rates: ExchangeRate[];
  vatRates: VatRate[];
  devices: TillDevice[];
  roles: Role[];
  users: User[];
  brands: Brand[];
  categories: Category[];
  products: Product[];
  priceChanges: PriceChange[];
  schedules: PriceSchedule[];
  batches: Batch[];
  movements: StockMovement[];
  defects: Defect[];
  writeOffs: WriteOff[];
  transfers: Transfer[];
  receivings: Receiving[];
  stockRequests: StockRequest[];
  counts: StockCount[];
  customers: Customer[];
  sales: Sale[];
  returns: SaleReturn[];
  shifts: Shift[];
  expenses: Expense[];
  brandPayments: BrandPayment[];
  fees: FeeCharge[];
  statements: Statement[];
  promotions: Promotion[];
  promoCodes: PromoCode[];
  approvals: ApprovalRequest[];
  activity: ActivityEntry[];
  notifications: AppNotification[];
  minQty: Record<string, number>; // `${variantId}|${branchId}` -> the minimum the storekeeper set
  counters: Record<string, number>; // the last number used for each kind of document
}
