import { brand, defaultSettings, mockConfig } from '@/shared/constants';
import { allPermissions, type Permission } from '@/shared/constants/permissions';
import type { Database } from '@/shared/api/database';
import { addMovement, placeIn, recordSale } from '@/shared/api/engine';
import { buildStatement } from '@/shared/api/settlement';
import type { Batch, Branch, Brand, BrandReturn, BrandTerms, Category, CountrySettings, Defect, Id, Product, Role, Variant } from '@/shared/types';
import { addDays, createRandom, makeEan13, monthKey, shopPrice, startOfMonth, toIsoDate, type Random } from '@/shared/utils';
import { seedBrands, seedCategories, seedProducts } from './catalog';
import { seedPeople } from './people';
import { addStaffDemoData } from './staffSeed';

// Builds the demo's starting data: GenZ's real branches, brands and products, and about two months of activity.
// The same seed (mockConfig.seed) always builds the same data.

const atTime = (day: string, hour: number, minute = 0) => new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).toISOString();

// Nothing in the demo has happened after now: a time still ahead becomes a minute ago.
const notAfterNow = (iso: string) => (new Date(iso).getTime() > Date.now() ? new Date(Date.now() - 60_000).toISOString() : iso);

const location = (id: string, kind: 'floor' | 'backRoom' | 'storage', en: string, ar: string) => ({ id, kind, name: { en, ar } });
const floor = (prefix: string) => location(`${prefix}-floor`, 'floor', 'Shop floor', 'صالة العرض');
const backRoom = (prefix: string) => location(`${prefix}-back`, 'backRoom', 'Back room', 'المخزن الخلفي');

const buildBranches = (createdAt: string): Branch[] => {
  const all = defaultSettings.paymentMethods.map((method) => method.id);
  const egypt = all.filter((id) => id !== 'pm-mada' && id !== 'pm-cod');
  const branch = (fields: Omit<Branch, 'archived' | 'createdAt'>): Branch => ({ ...fields, archived: false, createdAt });
  return [
    branch({ id: 'b-park-mall', name: 'Park Mall', kind: 'store', countryCode: 'EG', city: 'New Cairo', address: 'Park Mall, New Cairo', phone: '', currency: 'EGP', paymentMethodIds: egypt, locations: [floor('pm'), backRoom('pm')] }),
    branch({ id: 'b-royal-park', name: 'Arkan', kind: 'store', countryCode: 'EG', city: 'Sheikh Zayed', address: 'Arkan Plaza, El Sheikh Zayed', phone: '', currency: 'EGP', paymentMethodIds: egypt, locations: [floor('rp'), backRoom('rp')] }),
    branch({ id: 'b-souq7', name: 'Souq 7', kind: 'store', countryCode: 'SA', city: 'Jeddah', address: 'Souq 7, Jeddah', phone: '', currency: 'SAR', paymentMethodIds: ['pm-cash', 'pm-card', 'pm-mada', 'pm-credit'], locations: [floor('s7'), backRoom('s7')] }),
    branch({ id: 'b-online', name: 'genz-s.com', kind: 'online', countryCode: 'EG', city: 'Cairo', address: 'Online store', phone: '', currency: 'EGP', paymentMethodIds: ['pm-card', 'pm-instapay', 'pm-wallet', 'pm-cod'], locations: [location('on-store', 'storage', 'Online stock', 'مخزون المتجر الإلكتروني')] }),
    branch({ id: 'b-warehouse', name: 'Main warehouse', kind: 'warehouse', countryCode: 'EG', city: 'Cairo', address: '', phone: '', currency: 'EGP', paymentMethodIds: [], locations: [location('wh-store', 'storage', 'Warehouse', 'المستودع')] }),
  ];
};

const builtInRoles = (): Role[] => {
  const role = (id: string, builtIn: Role['builtIn'], en: string, ar: string, permissions: Permission[]): Role => ({ id, builtIn, name: { en, ar }, permissions });
  return [
    role('role-owner', 'owner', 'Owner', 'المالك', [...allPermissions]),
    role('role-manager', 'manager', 'Branch manager', 'مدير الفرع', ['dashboard.view', 'reports.view', 'stock.view', 'stock.otherBranches', 'stock.manage', 'stock.count', 'transfers.manage', 'sales.sell', 'sales.discount', 'sales.return', 'sales.void', 'registers.manage', 'customers.view', 'approvals.decide']),
    role('role-cashier', 'cashier', 'Cashier', 'كاشير', ['stock.view', 'stock.otherBranches', 'sales.sell', 'sales.discount', 'sales.return', 'customers.view']),
    role('role-storekeeper', 'storekeeper', 'Storekeeper', 'أمين المخزن', ['stock.view', 'stock.otherBranches', 'stock.manage', 'stock.receive', 'stock.count', 'transfers.manage']),
    role('role-driver', 'driver', 'Driver / courier', 'سائق / مندوب', ['transfers.drive']),
    role('role-online', 'online', 'Online orders staff', 'موظف الطلبات الإلكترونية', ['online.orders', 'stock.view', 'stock.otherBranches', 'customers.view']),
    role('role-brand', 'brandPartner', 'Brand partner', 'شريك البراند', ['brandPortal.view']),
    role('role-it', 'it', 'IT admin', 'مسؤول تقنية المعلومات', [...allPermissions]),
  ];
};

// GenZ's own category codes ("07 T-SHIRT"), as their store uses them.
const categories = (): Category[] => seedCategories.map((category) => ({ id: category.id, name: { en: `${category.code} ${category.en}`, ar: `${category.code} ${category.ar}` }, archived: false, minMargin: null }));

// Each brand's deal (to confirm with the owner: the real terms aren't public). Most local brands are on
// commission; a few are bought outright.
const termsFor = (random: Random, index: number): BrandTerms => {
  const base = { ...defaultSettings.defaultBrandTerms };
  if (index % 9 === 4) return { ...base, model: 'bought', commissionRate: 0, discountFunding: 'store', brandSharePercent: 0, defectPolicy: 'brandReplaces' };
  return {
    ...base,
    commissionRate: random.pick([25, 30, 30, 35]),
    monthlyFee: index % 4 === 1 ? random.pick([2500, 3000, 4000]) : 0,
    allowDiscounts: index % 7 !== 3,
    discountFunding: random.pick(['shared', 'shared', 'brand', 'store'] as const),
    defectPolicy: index % 5 === 2 ? 'storeAbsorbs' : 'brandReplaces',
  };
};

const egpPerSar = 13.2; // EGP prices aren't public yet: worked out from SAR at this rate

export const buildSeed = (): Database => {
  const random = createRandom(mockConfig.seed);
  let idCounter = 0;
  const newId = () => `id-${(idCounter += 1).toString(36)}`;
  const today = toIsoDate();
  const historyStart = addDays(today, -mockConfig.historyDays);
  const setupDay = addDays(historyStart, -10);
  const setupAt = atTime(setupDay, 9);
  const settings = structuredClone(defaultSettings);
  // Example tax registrations, so receipts show a full header and a valid-looking QR in the demo. Placeholders: the owner
  // replaces them on the Tax page with the real numbers ("Reset to defaults" leaves them empty).
  const company = brand.name.replace(/'s$/, ''); // "GenZ's" -> "GenZ"
  const exampleRegistrations: Record<string, Omit<CountrySettings['registration'], 'countryCode'>> = {
    EG: { legalName: `${company} for Trading S.A.E.`, vatNumber: '100-200-300', commercialRegistration: '123456', address: 'Park Mall, New Cairo, Cairo' },
    SA: { legalName: `${company} Trading Co.`, vatNumber: '300000000000003', commercialRegistration: '4030000000', address: 'Souq 7, Jeddah' },
  };
  settings.countries.forEach((country) => Object.assign(country.registration, exampleRegistrations[country.countryCode] ?? {}));
  const branches = buildBranches(setupAt);
  const roles = builtInRoles();
  const people = seedPeople(branches, setupAt);
  const owners = people.filter((user) => user.roleIds.includes('role-owner'));
  const ownerId = owners[0].id;

  const data: Database = {
    version: mockConfig.databaseVersion,
    settings,
    branches,
    rates: [
      { id: newId(), currency: 'SAR', rate: 13.2, date: addDays(historyStart, -30), byId: ownerId, at: setupAt },
      { id: newId(), currency: 'SAR', rate: 13.05, date: addDays(today, -20), byId: ownerId, at: atTime(addDays(today, -20), 10) },
      { id: newId(), currency: 'USD', rate: 49.5, date: addDays(historyStart, -30), byId: ownerId, at: setupAt },
      { id: newId(), currency: 'AED', rate: 13.48, date: addDays(historyStart, -30), byId: ownerId, at: setupAt },
    ],
    vatRates: [
      { id: newId(), countryCode: 'EG', rate: 14, startDate: '2017-07-01', byId: ownerId, at: setupAt },
      { id: newId(), countryCode: 'SA', rate: 15, startDate: '2020-07-01', byId: ownerId, at: setupAt },
    ],
    devices: [
      { id: 'dev-pm-1', branchId: 'b-park-mall', name: 'Till 1', serial: 'PM-T1', registration: { status: 'registered', authorityId: 'ETA-POS-PM1', at: setupAt } },
      { id: 'dev-pm-2', branchId: 'b-park-mall', name: 'Till 2', serial: 'PM-T2', registration: { status: 'notRegistered' } },
      { id: 'dev-rp-1', branchId: 'b-royal-park', name: 'Till 1', serial: 'RP-T1', registration: { status: 'registered', authorityId: 'ETA-POS-RP1', at: setupAt } },
      { id: 'dev-s7-1', branchId: 'b-souq7', name: 'Till 1', serial: 'S7-T1', registration: { status: 'registered', authorityId: 'ZATCA-EGS-S71', at: setupAt } },
      { id: 'dev-on-1', branchId: 'b-online', name: 'Website', serial: 'WEB-1', registration: { status: 'registered', authorityId: 'ETA-WEB-1', at: setupAt } },
    ],
    roles,
    users: people,
    brands: [],
    categories: categories(),
    products: [],
    priceChanges: [],
    schedules: [],
    batches: [],
    movements: [],
    defects: [],
    writeOffs: [],
    transfers: [],
    receivings: [],
    stockRequests: [],
    counts: [],
    customers: [],
    sales: [],
    returns: [],
    shifts: [],
    expenses: [],
    brandPayments: [],
    fees: [],
    statements: [],
    promotions: [],
    promoCodes: [],
    approvals: [],
    activity: [],
    notifications: [],
    minQty: {},
    counters: {},
    cashChecks: [],
    onlineOrders: [],
    brandReturns: [],
    heldSales: [],
    reservations: [],
  };
  const number = (kind: string, digits = 5) => {
    data.counters[kind] = (data.counters[kind] ?? 0) + 1;
    return `${kind}-${String(data.counters[kind]).padStart(digits, '0')}`;
  };

  // ---- Brands ----
  data.brands = seedBrands.map((seed, index): Brand => {
    const contractStart = addDays(historyStart, -random.int(60, 500));
    return {
      id: seed.id,
      name: seed.name,
      instagram: seed.instagram,
      contactName: seed.founder,
      phone: '',
      email: '',
      payment: { method: index % 3 ? 'bank' : 'instapay', bankName: '', accountName: seed.name, accountNumber: '', instapay: '' },
      contractStart,
      status: 'active',
      termsHistory: [{ id: newId(), effectiveFrom: contractStart, terms: termsFor(random, index), byId: ownerId, at: atTime(contractStart, 11) }],
      createdAt: atTime(contractStart, 11),
    };
  });
  // Two brands changed their commission during the demo period, so past sales show the old rate.
  [data.brands[1], data.brands[6]].forEach((brand) => {
    const old = brand.termsHistory[0].terms;
    if (old.model !== 'commission') return;
    const effectiveFrom = addDays(today, -25);
    brand.termsHistory.push({ id: newId(), effectiveFrom, terms: { ...old, commissionRate: old.commissionRate + 5 }, byId: ownerId, at: atTime(addDays(effectiveFrom, -3), 12), note: 'Renewed contract' });
  });
  const brandById = new Map(data.brands.map((brand) => [brand.id, brand]));

  // ---- Products and variants ----
  let barcodeSequence = 1000;
  data.products = seedProducts.map((seed, index): Product => {
    const terms = brandById.get(seed.brandId)?.termsHistory[0].terms;
    // A product on sale in the store: its regular price is the "was" price, the sale price runs as a scheduled sale.
    const regularSar = seed.sarWas ?? seed.sar;
    const regularEgp = seed.sarWas ? shopPrice(seed.sarWas * egpPerSar) : seed.egp;
    const exVat = regularEgp / 1.14;
    const costShare = terms?.model === 'bought' ? 0.55 : 0.5;
    const variants = seed.variants.map((variant, variantIndex): Variant => {
      barcodeSequence += 1;
      return {
        id: `${seed.id}-${variantIndex}`,
        size: variant.size,
        color: variant.color,
        sku: variant.sku || `${seed.id.slice(3, 9)}-${variantIndex + 1}`,
        barcode: makeEan13(settings.barcodePrefix, barcodeSequence), // GenZ's barcodes aren't published: generated
        barcodeGenerated: true,
        prices: {},
        archived: false,
      };
    });
    if (seed.sarWas) {
      data.schedules.push(
        { id: newId(), productId: seed.id, kind: 'sale', currency: 'SAR', price: seed.sar, startDate: addDays(today, -10), endDate: addDays(today, 20), cancelled: false, byId: ownerId, at: setupAt },
        { id: newId(), productId: seed.id, kind: 'sale', currency: 'EGP', price: seed.egp, startDate: addDays(today, -10), endDate: addDays(today, 20), cancelled: false, byId: ownerId, at: setupAt },
      );
    }
    return {
      id: seed.id,
      brandId: seed.brandId,
      categoryId: seed.categoryId,
      name: seed.name,
      photo: seed.photo || undefined,
      season: seed.season,
      collection: seed.collection,
      // The last product came in without a price in SAR, to show the "no selling price" alert.
      prices: index === seedProducts.length - 1 ? { EGP: regularEgp } : { EGP: regularEgp, SAR: regularSar },
      cost: Math.round(exVat * costShare),
      variants,
      archived: false,
      createdAt: setupAt,
    };
  });
  // The sizes and colours GenZ's products come in.
  settings.sizes = [...new Set(data.products.flatMap((product) => product.variants.map((variant) => variant.size)))];
  settings.colors = [...new Set(data.products.flatMap((product) => product.variants.map((variant) => variant.color)))].sort();

  // ---- Receiving: each store, the online store and the warehouse get a batch of most products ----
  const stockBranches = branches;
  const storekeeper = (branchId: Id) => people.find((user) => user.roleIds.includes('role-storekeeper') && user.branchIds.includes(branchId))?.id ?? ownerId;
  const stock = new Map<string, number>(); // variant|branch -> available pieces, so the seed never sells what isn't there
  const stockKey = (variantId: Id, branchId: Id) => `${variantId}|${branchId}`;
  const located = new Map<string, number>(); // variant|location -> available pieces, the fast lookup for recordSale
  const track = (variantId: Id, locationId: Id, qty: number) => located.set(`${variantId}|${locationId}`, (located.get(`${variantId}|${locationId}`) ?? 0) + qty);

  stockBranches.forEach((branch) => {
    data.products.forEach((product, productIndex) => {
      const carries = branch.kind === 'warehouse' ? productIndex % 3 === 0 : branch.kind === 'online' ? productIndex % 4 !== 3 : branch.countryCode === 'SA' ? productIndex % 4 !== 1 : productIndex % 5 !== 2 || branch.id === 'b-park-mall';
      if (!carries) return;
      const receivedAt = atTime(addDays(setupDay, random.int(0, 8)), 10, random.int(0, 59));
      let batchQty = 0;
      const batchId = newId();
      product.variants.forEach((variant) => {
        const qty = random.int(4, 10);
        batchQty += qty;
        const floorQty = Math.ceil(qty * 0.6);
        const user = storekeeper(branch.id);
        if (branch.kind === 'warehouse' || branch.kind === 'online') {
          // One storage room: the warehouse, and the online store's own stock (orders ship from it first).
          addMovement(data, { variantId: variant.id, qty, to: placeIn(branch, 'storage'), kind: 'receive', ref: { type: 'receiving', id: batchId }, batchId, at: receivedAt, byId: user }, newId);
          track(variant.id, placeIn(branch, 'storage').locationId, qty);
          stock.set(stockKey(variant.id, branch.id), qty);
        } else {
          addMovement(data, { variantId: variant.id, qty: floorQty, to: placeIn(branch, 'floor'), kind: 'receive', ref: { type: 'receiving', id: batchId }, batchId, at: receivedAt, byId: user }, newId);
          addMovement(data, { variantId: variant.id, qty: qty - floorQty, to: placeIn(branch, 'backRoom'), kind: 'receive', ref: { type: 'receiving', id: batchId }, batchId, at: receivedAt, byId: user }, newId);
          track(variant.id, placeIn(branch, 'floor').locationId, floorQty);
          track(variant.id, placeIn(branch, 'backRoom').locationId, qty - floorQty);
          stock.set(stockKey(variant.id, branch.id), qty);
        }
      });
      const defects = productIndex % 11 === 3 ? Math.max(1, Math.round(batchQty * 0.1)) : 0;
      const batch: Batch = {
        id: batchId,
        number: number('B', 4),
        productId: product.id,
        brandId: product.brandId,
        branchId: branch.id,
        receivedAt,
        qty: batchQty,
        totalCost: product.cost * batchQty,
        currency: settings.baseCurrency,
        defects,
        defectHandling: productIndex % 2 ? 'redistribute' : 'writeOff',
        redistribution: defects ? (productIndex % 22 === 3 ? 'pending' : 'approved') : 'none',
        brandCredit: 0,
      };
      data.batches.push(batch);
      // Defective pieces found at receiving are set aside (out of sellable stock). Some have gone back to the brand
      // with a return note, and half of those the brand has already credited against the batch.
      const variant = product.variants[0];
      const kind = branch.kind === 'store' ? 'backRoom' : 'storage';
      const place = placeIn(branch, kind);
      const defectQty = Math.min(defects, located.get(`${variant.id}|${place.locationId}`) ?? 0);
      batch.defects = defectQty;
      if (defectQty) {
        const byId = storekeeper(branch.id);
        const defect: Defect = {
          id: newId(),
          at: receivedAt,
          byId,
          productId: product.id,
          variantId: variant.id,
          batchId,
          branchId: branch.id,
          qty: defectQty,
          reasonId: random.pick(settings.lists.defectReasons).id,
          foundAt: 'receiving',
          liability: brandById.get(product.brandId)?.termsHistory[0].terms.defectPolicy === 'storeAbsorbs' ? 'store' : 'brand',
          status: 'open',
          unitCost: product.cost,
          locationId: place.locationId,
        };
        data.defects.push(defect);
        addMovement(data, { variantId: variant.id, qty: defectQty, from: place, to: placeIn(branch, kind, 'defective'), kind: 'statusChange', ref: { type: 'defect', id: defect.id }, reason: defect.reasonId, at: receivedAt, byId }, newId);
        track(variant.id, place.locationId, -defectQty);
        stock.set(stockKey(variant.id, branch.id), (stock.get(stockKey(variant.id, branch.id)) ?? 0) - defectQty);
        if (productIndex % 4 === 3) {
          const sentAt = atTime(addDays(toIsoDate(receivedAt), 3), 12);
          const record: BrandReturn = { id: newId(), number: number('RB', 4), brandId: product.brandId, branchId: branch.id, at: sentAt, byId, lines: [{ variantId: variant.id, qty: defectQty, condition: 'defective', defectId: defect.id }], status: 'sent' };
          addMovement(data, { variantId: variant.id, qty: defectQty, from: placeIn(branch, kind, 'defective'), to: placeIn(branch, kind, 'returned'), kind: 'returnToBrand', ref: { type: 'brandReturn', id: record.id }, at: sentAt, byId }, newId);
          defect.status = 'returnedToBrand';
          if (productIndex % 8 === 7 && branch.currency === settings.baseCurrency) {
            const amount = defectQty * product.cost;
            record.status = 'settled';
            record.settlement = { kind: 'credit', amount, currency: branch.currency, at: atTime(addDays(toIsoDate(receivedAt), 7), 13), byId };
            batch.brandCredit = amount;
            defect.status = 'credited';
          }
          data.brandReturns.push(record);
        }
      }
    });
  });

  // ---- Customers ----
  const firstNames = ['Omar', 'Youssef', 'Mariam', 'Nour', 'Ahmed', 'Salma', 'Karim', 'Farida', 'Ali', 'Hana', 'Mostafa', 'Jana', 'Ziad', 'Laila', 'Adam', 'Malak', 'Seif', 'Habiba'];
  const lastNames = ['Hassan', 'Mahmoud', 'Adel', 'Fathy', 'Sami', 'Ibrahim', 'Khaled', 'Nabil', 'Tarek', 'Saad', 'Zaki', 'Fouad'];
  data.customers = Array.from({ length: 220 }, (_, index) => ({
    id: `c-${index + 1}`,
    name: `${random.pick(firstNames)} ${random.pick(lastNames)}`,
    // Demo numbers only (01000 0xxxxx), never real ones.
    phone: index % 5 === 4 ? `+9665000${String(index).padStart(5, '0')}` : `010000${String(index).padStart(5, '0')}`,
    createdAt: notAfterNow(atTime(addDays(historyStart, random.int(-60, mockConfig.historyDays)), 12)),
    // Two in three gave their age (16 to 45), worked out from the position so the rest of the demo stays the same.
    birthYear: index % 3 ? new Date().getFullYear() - (16 + ((index * 7) % 30)) : undefined,
  }));
  const egyptCustomers = data.customers.filter((customer) => customer.phone.startsWith('010'));
  const saudiCustomers = data.customers.filter((customer) => customer.phone.startsWith('+966'));

  // ---- Promotions and codes ----
  data.promotions = [
    {
      id: 'promo-summer-end',
      name: 'End of summer',
      target: { kind: 'category', ids: ['cat-shorts'] },
      discountType: 'percent',
      value: 20,
      startDate: addDays(today, -50),
      endDate: addDays(today, -36),
      branchIds: ['b-park-mall', 'b-royal-park', 'b-online'],
      brandSharePercent: 50,
      commissionOnOriginal: false,
      byId: ownerId,
      at: atTime(addDays(today, -52), 10),
    },
    {
      id: 'promo-hoodie-week',
      name: 'Hoodie week',
      target: { kind: 'category', ids: ['cat-hoodies'] },
      discountType: 'percent',
      value: 15,
      startDate: addDays(today, -4),
      endDate: addDays(today, 5),
      branchIds: branches.filter((branch) => branch.kind !== 'warehouse').map((branch) => branch.id),
      brandSharePercent: 100,
      commissionOnOriginal: false,
      byId: ownerId,
      at: atTime(addDays(today, -6), 10),
    },
    {
      id: 'promo-kracked-request',
      name: 'Kracked Studios: 25% off graphic tees',
      target: { kind: 'brand', ids: ['br-kracked-studios'] },
      discountType: 'percent',
      value: 25,
      startDate: addDays(today, 3),
      endDate: addDays(today, 10),
      branchIds: ['b-park-mall', 'b-royal-park'],
      brandSharePercent: 100,
      commissionOnOriginal: false,
      requestedByBrandId: 'br-kracked-studios',
      byId: people.find((user) => user.brandId === 'br-kracked-studios')?.id ?? ownerId,
      at: atTime(addDays(today, -1), 15),
    },
  ];
  data.promoCodes = [
    { id: 'code-welcome', code: 'WELCOME10', kind: 'promo', discountType: 'percent', value: 10, brandSharePercent: 0, startDate: historyStart, endDate: addDays(today, 60), active: true, byId: ownerId, at: setupAt },
    { id: 'code-influencer', code: 'NOUR15', kind: 'influencer', influencer: 'Nour (Instagram)', discountType: 'percent', value: 15, brandSharePercent: 50, startDate: addDays(today, -30), endDate: addDays(today, 30), active: true, byId: ownerId, at: atTime(addDays(today, -30), 10) },
  ];

  // ---- Sales ----
  const cashiersOf = (branchId: Id) => people.filter((user) => user.branchIds.includes(branchId) && (user.roleIds.includes('role-cashier') || user.roleIds.includes('role-online')));
  const sellable = (branch: Branch) => ({ stockBranch: branch.id, variants: data.products.flatMap((product) => product.variants.filter((variant) => (stock.get(stockKey(variant.id, branch.id)) ?? 0) > 0)) });
  const salesBranches = branches.filter((branch) => branch.kind === 'store' || branch.kind === 'online');
  for (let day = historyStart; day <= today; day = addDays(day, 1)) {
    const weekday = new Date(`${day}T12:00:00`).getDay();
    const busy = weekday === 4 || weekday === 5; // Thursday and Friday
    salesBranches.forEach((branch) => {
      const count = branch.kind === 'online' ? random.int(4, 9) : random.int(busy ? 20 : 11, busy ? 30 : 18);
      const cashiers = cashiersOf(branch.id);
      const closeHour = day === today ? Math.min(new Date().getHours(), 22) : 22;
      if (closeHour < 11) return;
      for (let n = 0; n < count; n += 1) {
        const { stockBranch, variants } = sellable(branch);
        if (!variants.length || !cashiers.length) continue;
        const itemCount = random.chance(0.35) ? 2 : random.chance(0.1) ? 3 : 1;
        const picked = new Set<string>();
        for (let i = 0; i < itemCount; i += 1) picked.add(random.pick(variants).id);
        const discounted = random.chance(0.12);
        const items = [...picked].map((variantId) => {
          const product = data.products.find((current) => current.variants.some((variant) => variant.id === variantId));
          const price = product?.prices[branch.currency] ?? 0;
          return {
            variantId,
            qty: 1,
            discount: discounted ? Math.round(price * random.pick([0.05, 0.1, 0.1, 0.15, 0.3])) : 0,
            discountReasonId: random.pick(settings.lists.discountReasons).id,
          };
        });
        const methodIds = branch.paymentMethodIds.filter((id) => id !== 'pm-credit');
        const split = random.chance(0.08) && methodIds.length > 1;
        const at = notAfterNow(atTime(day, random.int(11, closeHour), random.int(0, 59)));
        const customers = branch.countryCode === 'SA' ? saudiCustomers : egyptCustomers;
        const movementsBefore = data.movements.length;
        const sale = recordSale(data, {
          branchId: branch.id,
          cashierId: random.pick(cashiers).id,
          customerId: random.pick(customers).id,
          at,
          items,
          payments: split ? [{ methodId: methodIds[0], share: 0.5 }, { methodId: methodIds[1], share: 0.5 }] : [{ methodId: random.pick(methodIds), share: 1 }],
          promoCodeId: random.chance(0.04) ? random.pick(data.promoCodes).id : undefined,
          eReceiptFails: day >= addDays(today, -3) && random.chance(mockConfig.eReceiptFailureRate * 3),
          availableAt: (variantId, locationId) => located.get(`${variantId}|${locationId}`) ?? 0,
          newId,
          number: number('S', 6),
        });
        data.movements.slice(movementsBefore).forEach((movement) => {
          if (movement.from) track(movement.variantId, movement.from.locationId, -movement.qty);
        });
        sale.lines.forEach((line) => stock.set(stockKey(line.variantId, stockBranch), (stock.get(stockKey(line.variantId, stockBranch)) ?? 0) - line.qty));
      }
    });
  }

  // ---- Returns (about 4% of sales) ----
  const returnReasons = settings.lists.returnReasons;
  data.sales
    .filter((sale, index) => index % 25 === 7 && sale.at < atTime(addDays(today, -1), 0))
    .forEach((sale) => {
      const line = sale.lines[0];
      const branch = branches.find((current) => current.id === sale.branchId);
      if (!branch || !line) return;
      const at = atTime(addDays(toIsoDate(sale.at), random.int(1, 6)), 15);
      if (at > new Date().toISOString()) return;
      const defective = random.chance(0.2);
      const saleReturn = {
        id: newId(),
        number: number('R', 5),
        saleId: sale.id,
        branchId: sale.branchId,
        at,
        byId: sale.cashierId,
        kind: random.chance(0.4) ? ('exchange' as const) : ('return' as const),
        lines: [{ saleLineId: line.id, qty: 1, amount: line.unitPrice - line.discount / line.qty, reasonId: defective ? 'rr-defect' : random.pick(returnReasons).id, condition: defective ? ('defective' as const) : ('available' as const) }],
        refunds: [{ methodId: sale.payments[0].methodId, amount: line.unitPrice - line.discount / line.qty }],
      };
      data.returns.push(saleReturn);
      addMovement(data, { variantId: line.variantId, qty: 1, to: placeIn(branch, defective ? 'backRoom' : 'floor', defective ? 'defective' : 'available'), kind: 'return', ref: { type: 'return', id: saleReturn.id }, at, byId: sale.cashierId }, newId);
    });

  // ---- Shifts: one register per store per day, a few with cash differences ----
  branches
    .filter((branch) => branch.kind === 'store')
    .forEach((branch) => {
      for (let day = historyStart; day < today; day = addDays(day, 1)) {
        const daySales = data.sales.filter((sale) => sale.branchId === branch.id && toIsoDate(sale.at) === day);
        const cash = daySales.reduce((total, sale) => total + sale.payments.filter((payment) => payment.methodId === 'pm-cash').reduce((sum, payment) => sum + payment.amount, 0), 0);
        const openingCash = branch.currency === 'SAR' ? 500 : 2000;
        const difference = random.chance(0.1) ? random.pick([-200, -50, -20, 30, 100]) * (branch.currency === 'SAR' ? 0.1 : 1) : 0;
        data.shifts.push({
          id: newId(),
          branchId: branch.id,
          register: 'Till 1',
          cashierId: cashiersOf(branch.id)[0]?.id ?? ownerId,
          openedAt: atTime(day, 10, 45),
          closedAt: atTime(day, 22, 15),
          currency: branch.currency,
          openingCash,
          expectedCash: openingCash + cash,
          countedCash: openingCash + cash + difference,
          note: difference ? 'Counted twice' : undefined,
          approvedById: people.find((user) => user.roleIds.includes('role-manager') && user.branchIds.includes(branch.id))?.id,
        });
      }
    });

  // ---- Expenses ----
  const firstMonth = startOfMonth(historyStart);
  for (let month = firstMonth; month <= today; month = startOfMonth(addDays(month, 32))) {
    const add = (categoryId: string, branchId: Id | null, currency: string, amount: number, note: string) =>
      data.expenses.push({ id: newId(), categoryId, branchId, currency, amount, date: month, repeatMonthly: categoryId !== 'ex-marketing', note, byId: ownerId, at: atTime(month, 9) });
    add('ex-rent', 'b-park-mall', 'EGP', 120000, 'Park Mall unit');
    add('ex-rent', 'b-royal-park', 'EGP', 100000, 'Arkan unit');
    add('ex-rent', 'b-souq7', 'SAR', 9000, 'Souq 7 unit');
    add('ex-salaries', 'b-park-mall', 'EGP', 60000, 'Store team');
    add('ex-salaries', 'b-royal-park', 'EGP', 50000, 'Store team');
    add('ex-salaries', 'b-souq7', 'SAR', 6000, 'Store team');
    add('ex-utilities', null, 'EGP', 15000, 'Electricity and internet');
    add('ex-marketing', null, 'EGP', random.pick([25000, 30000, 40000]), 'Instagram and TikTok ads');
  }

  // ---- Monthly fees and last month's settlements ----
  data.brands.forEach((brand) => {
    const terms = brand.termsHistory[0].terms;
    if (!terms.monthlyFee) return;
    for (let month = firstMonth; month <= today; month = startOfMonth(addDays(month, 32))) {
      const past = month < startOfMonth(today);
      data.fees.push({ id: newId(), brandId: brand.id, month: monthKey(month), amount: terms.monthlyFee, currency: terms.feeCurrency, paidAt: past && !terms.deductFeeFromPayout ? atTime(addDays(month, 4), 12) : undefined });
    }
  });

  // ---- Past settlements: every full month is on a statement. Commission brands were paid and the months locked,
  // except one brand whose last statement is approved but not paid yet ----
  const commissionBrands = data.brands.filter((brand) => brand.termsHistory[0].terms.model === 'commission');
  for (let month = startOfMonth(historyStart); month < startOfMonth(today); month = startOfMonth(addDays(month, 32))) {
    const period = { from: month, to: addDays(startOfMonth(addDays(month, 32)), -1) };
    const lastMonth = period.to === addDays(startOfMonth(today), -1);
    commissionBrands.forEach((brand, index) => {
      const at = atTime(addDays(period.to, 3), 11);
      const statement = buildStatement(data, brand, period, { id: newId(), number: number('ST', 4), byId: ownerId, at });
      if (!statement.saleLineIds.length) return;
      const unpaid = lastMonth && index === 0;
      statement.status = unpaid ? 'approved' : 'paid';
      statement.approvedById = ownerId;
      statement.locked = !unpaid;
      data.fees.filter((fee) => fee.brandId === brand.id && fee.month <= monthKey(period.to) && !fee.paidAt && !fee.deductedInStatementId).forEach((fee) => (fee.deductedInStatementId = statement.id));
      data.statements.push(statement);
      if (!unpaid && statement.totals.amountDue > 0) {
        const payment = { id: newId(), brandId: brand.id, date: addDays(period.to, 5), amount: Math.round(statement.totals.amountDue * 100) / 100, currency: statement.currency, method: brand.payment.method, reference: `TRX-${statement.number}`, statementId: statement.id, byId: ownerId, at: atTime(addDays(period.to, 5), 13) };
        data.brandPayments.push(payment);
        statement.paymentId = payment.id;
      }
    });
  }

  // ---- Transfers, requests, counts and write-offs waiting for the owner ----
  const driver = people.find((user) => user.roleIds.includes('role-driver'));
  const pickVariants = (branchId: Id, count: number) =>
    data.products
      .flatMap((product) => product.variants)
      .filter((variant) => (stock.get(stockKey(variant.id, branchId)) ?? 0) > 2)
      .slice(0, count);
  const transferFrom = (from: Branch, to: Branch, daysAgo: number, missing: boolean, received: boolean) => {
    const lines = pickVariants(from.id, 3).map((variant) => ({ variantId: variant.id, qty: 2 }));
    // Taken out of the sending branch's stock now, so the next transfer never sends pieces that already left.
    lines.forEach((line) => stock.set(stockKey(line.variantId, from.id), (stock.get(stockKey(line.variantId, from.id)) ?? 0) - line.qty));
    const sentAt = atTime(addDays(today, -daysAgo), 13);
    const id = newId();
    const transfer = {
      id,
      number: number('TR', 4),
      fromBranchId: from.id,
      toBranchId: to.id,
      lines: lines.map((line, index) => ({ ...line, received: received ? (missing && index === 0 ? line.qty - 1 : line.qty) : undefined })),
      status: received ? ('received' as const) : ('sent' as const),
      driverId: driver?.id,
      requestedById: storekeeper(to.id),
      createdAt: atTime(addDays(today, -daysAgo - 1), 11),
      sentAt,
      receivedAt: received ? atTime(addDays(today, -daysAgo), 17) : undefined,
      pickup: { name: driver?.name ?? '', userId: driver?.id, signedAt: sentAt, lines },
      delivery: received ? { name: driver?.name ?? '', userId: driver?.id, signedAt: atTime(addDays(today, -daysAgo), 17), lines } : undefined,
      receipt: received
        ? { name: people.find((user) => user.id === storekeeper(to.id))?.name ?? '', userId: storekeeper(to.id), signedAt: atTime(addDays(today, -daysAgo), 17), lines: lines.map((line, index) => ({ ...line, qty: missing && index === 0 ? line.qty - 1 : line.qty, missing: missing && index === 0 ? 1 : 0 })) }
        : undefined,
    };
    data.transfers.push(transfer);
    transfer.lines.forEach((line) => {
      addMovement(data, { variantId: line.variantId, qty: line.qty, from: placeIn(from, from.kind === 'warehouse' ? 'storage' : 'backRoom'), to: placeIn(to, 'backRoom', 'inTransit'), kind: 'transferOut', ref: { type: 'transfer', id }, at: sentAt, byId: storekeeper(from.id) }, newId);
      if (received) {
        addMovement(data, { variantId: line.variantId, qty: line.received ?? line.qty, from: placeIn(to, 'backRoom', 'inTransit'), to: placeIn(to, 'backRoom'), kind: 'transferIn', ref: { type: 'transfer', id }, at: transfer.receivedAt ?? sentAt, byId: storekeeper(to.id) }, newId);
        const lost = line.qty - (line.received ?? line.qty);
        if (lost) addMovement(data, { variantId: line.variantId, qty: lost, from: placeIn(to, 'backRoom', 'inTransit'), to: placeIn(to, 'backRoom', 'writtenOff'), kind: 'writeOff', ref: { type: 'transfer', id }, reason: 'Missing on arrival', at: transfer.receivedAt ?? sentAt, byId: storekeeper(to.id) }, newId);
      }
    });
    return transfer;
  };
  const [park, royal, souq, , warehouse] = branches;
  transferFrom(warehouse, park, 12, false, true);
  const missingTransfer = transferFrom(warehouse, royal, 3, true, true);
  transferFrom(park, royal, 1, false, false);
  // The driver delivered one piece less than they picked up.
  const mismatchTransfer = transferFrom(warehouse, souq, 6, true, true);
  if (mismatchTransfer.delivery) mismatchTransfer.delivery.lines = mismatchTransfer.delivery.lines.map((line, index) => (index === 0 ? { ...line, qty: line.qty - 1 } : line));

  const manager = (branchId: Id) => people.find((user) => user.roleIds.includes('role-manager') && user.branchIds.includes(branchId))?.id ?? ownerId;
  const requestLines = pickVariants(royal.id, 2).map((variant) => ({ variantId: variant.id, qty: 6 }));
  const stockRequest = { id: newId(), number: number('RQ', 4), branchId: royal.id, requestedById: manager(royal.id), at: atTime(addDays(today, -1), 12), lines: requestLines, status: 'pending' as const };
  data.stockRequests.push(stockRequest);

  const countLines = pickVariants(park.id, 6).map((variant, index) => {
    const expected = stock.get(stockKey(variant.id, park.id)) ?? 0;
    return { variantId: variant.id, expected, counted: index < 2 ? Math.max(expected - 4, 0) : expected, reasonId: index < 2 ? 'cr-not-scanned' : undefined };
  });
  const count = { id: newId(), number: number('SC', 4), branchId: park.id, at: atTime(addDays(today, -1), 21), byId: storekeeper(park.id), blind: true, lines: countLines, status: 'pending' as const };
  data.counts.push(count);

  const lostVariant = pickVariants(souq.id, 1)[0];
  const writeOff = lostVariant
    ? { id: newId(), at: atTime(addDays(today, -2), 20), byId: manager(souq.id), variantId: lostVariant.id, branchId: souq.id, qty: 2, kind: 'lost' as const, reasonId: 'wo-stolen', unitCost: data.products.find((product) => product.variants.includes(lostVariant))?.cost ?? 0, status: 'pending' as const }
    : undefined;
  if (writeOff) data.writeOffs.push(writeOff);

  // ---- Approvals waiting for an owner ----
  const pendingBatch = data.batches.find((batch) => batch.redistribution === 'pending');
  const approval = (fields: Omit<Database['approvals'][number], 'id' | 'status' | 'level'>) =>
    data.approvals.push({ id: newId(), status: 'pending', level: 'owner', ...fields });
  approval({ kind: 'discount', branchId: park.id, requestedById: manager(park.id), at: notAfterNow(atTime(today, 12, 10)), percent: 35, amount: 1400, currency: 'EGP', summary: 'Kracked Studios hoodie, regular customer', channel: 'phone' });
  approval({ kind: 'refund', branchId: royal.id, requestedById: manager(royal.id), at: atTime(addDays(today, -1), 18), amount: 12500, currency: 'EGP', summary: 'Refund of 7 pieces, wrong sizes', channel: 'app' });
  approval({ kind: 'stockCount', branchId: park.id, requestedById: storekeeper(park.id), at: count.at, ref: { type: 'stockCount', id: count.id }, summary: count.number });
  if (writeOff) approval({ kind: 'writeOff', branchId: souq.id, requestedById: writeOff.byId, at: writeOff.at, ref: { type: 'writeOff', id: writeOff.id }, summary: '2 pieces lost' });
  if (pendingBatch) approval({ kind: 'costRedistribution', branchId: pendingBatch.branchId, requestedById: storekeeper(pendingBatch.branchId), at: pendingBatch.receivedAt, ref: { type: 'batch', id: pendingBatch.id }, summary: pendingBatch.number });
  approval({ kind: 'promotion', requestedById: data.promotions[2].byId, at: data.promotions[2].at, ref: { type: 'promotion', id: data.promotions[2].id }, summary: data.promotions[2].name });
  approval({ kind: 'stockRequest', branchId: royal.id, requestedById: stockRequest.requestedById, at: stockRequest.at, ref: { type: 'stockRequest', id: stockRequest.id }, summary: stockRequest.number });

  // ---- A few alerts ----
  const owners2 = owners.map((owner) => owner.id);
  const alert = (kind: Database['notifications'][number]['kind'], params: Record<string, string>, link: string, at: string) =>
    data.notifications.push({ id: newId(), at, kind, userIds: owners2, openedBy: [], params, link });
  alert('transferMissing', { number: missingTransfer.number, branch: royal.name, qty: '1' }, `/owner/transfers?tab=differences`, atTime(addDays(today, -3), 17, 5));
  alert('stockRequest', { number: stockRequest.number, branch: royal.name }, '/owner/approvals', stockRequest.at);
  alert('noSellingPrice', { product: data.products[data.products.length - 1].name, currency: 'SAR' }, `/owner/products/${data.products[data.products.length - 1].id}`, atTime(addDays(today, -2), 10));
  const failedSale = data.sales.filter((sale) => sale.eReceipt.status === 'failed').at(-1);
  if (failedSale) alert('eReceiptFailed', { number: failedSale.number }, '/owner/tax?tab=receipts', failedSale.at);
  // One of each other alert, so the notifications page shows them all.
  const lowVariant = data.products[3]?.variants[0];
  if (lowVariant) alert('lowStock', { product: `${data.products[3].name} ${lowVariant.size}`, branch: park.name, qty: '1', min: String(settings.lowStockDefault) }, `/owner/stock/item/${lowVariant.id}`, notAfterNow(atTime(today, 13, 20)));
  // The cost per piece before the defects (all pieces) and after (spread over the good ones).
  if (pendingBatch && pendingBatch.qty > pendingBatch.defects)
    alert('batchCostChanged', { batch: pendingBatch.number, from: (pendingBatch.totalCost / pendingBatch.qty).toFixed(2), to: (pendingBatch.totalCost / (pendingBatch.qty - pendingBatch.defects)).toFixed(2) }, `/owner/costing/${pendingBatch.id}`, pendingBatch.receivedAt);
  // A monthly fee that fell due and isn't paid yet.
  const dueFee = data.fees.filter((fee) => !fee.paidAt && !fee.deductedInStatementId).at(-1);
  const dueBrand = dueFee && data.brands.find((brand) => brand.id === dueFee.brandId);
  if (dueFee && dueBrand)
    alert('brandPaymentDue', { feeId: dueFee.id, brand: dueBrand.name, what: 'fee', amount: `${dueFee.currency} ${dueFee.amount}`, date: `${dueFee.month}-${String(settings.feeDueDay).padStart(2, '0')}` }, `/owner/payouts/${dueBrand.id}?tab=fees`, notAfterNow(atTime(`${dueFee.month}-${String(settings.feeDueDay).padStart(2, '0')}`, 9)));
  alert('largeDiscountOrRefund', { kind: 'refund', branch: royal.name, amount: 'EGP 12500', user: people.find((user) => user.id === manager(royal.id))?.name ?? '' }, '/owner/approvals', atTime(addDays(today, -1), 18, 2));
  const shortShift = data.shifts.filter((shift) => (shift.countedCash ?? 0) < (shift.expectedCash ?? 0)).at(-1);
  if (shortShift) alert('cashDifference', { branch: branches.find((branch) => branch.id === shortShift.branchId)?.name ?? '', register: shortShift.register, amount: `${shortShift.currency} ${Math.round((shortShift.countedCash ?? 0) - (shortShift.expectedCash ?? 0))}` }, '/owner/reports/shifts', shortShift.closedAt ?? setupAt);
  alert('pickupMismatch', { number: mismatchTransfer.number }, '/owner/transfers?tab=differences', mismatchTransfer.receivedAt ?? setupAt);
  const defectiveReturn = data.returns.find((saleReturn) => saleReturn.lines.some((line) => line.condition === 'defective'));
  if (defectiveReturn) alert('defectiveReturn', { branch: branches.find((branch) => branch.id === defectiveReturn.branchId)?.name ?? '', product: data.products.find((product) => product.variants.some((variant) => variant.id === data.sales.find((sale) => sale.id === defectiveReturn.saleId)?.lines[0]?.variantId))?.name ?? '' }, '/owner/reports/returns', defectiveReturn.at);
  alert('approvalWaiting', { summary: data.approvals[0]?.summary ?? '', user: people.find((user) => user.id === data.approvals[0]?.requestedById)?.name ?? '' }, '/owner/approvals', data.approvals[0]?.at ?? setupAt);

  // A few flagged entries in the activity log.
  const flag = (userId: Id, action: Database['activity'][number]['action'], target: Database['activity'][number]['target'], at: string, extra: Partial<Database['activity'][number]> = {}) =>
    data.activity.push({ id: newId(), at, userId, action, target, flagged: true, ...extra });
  flag(manager(park.id), 'discount', { type: 'sale', id: data.sales.at(-5)?.id ?? '', label: data.sales.at(-5)?.number ?? '' }, atTime(addDays(today, -1), 16), { branchId: park.id, changes: [{ field: 'discount', from: 0, to: '30%' }] });
  flag(ownerId, 'priceChange', { type: 'product', id: data.products[5].id, label: data.products[5].name }, atTime(addDays(today, -4), 11), { changes: [{ field: 'EGP', from: data.products[5].prices.EGP + 100, to: data.products[5].prices.EGP }] });
  if (shortShift) flag(shortShift.cashierId, 'cashDifference', { type: 'shift', id: shortShift.id, label: shortShift.register }, shortShift.closedAt ?? setupAt, { branchId: shortShift.branchId, changes: [{ field: 'cash', from: shortShift.expectedCash ?? 0, to: shortShift.countedCash ?? 0 }] });
  data.activity.sort((a, b) => b.at.localeCompare(a.at));
  data.notifications.sort((a, b) => b.at.localeCompare(a.at));

  data.activity.push({ id: newId(), at: setupAt, userId: ownerId, action: 'create', target: { type: 'settings', id: 'settings', label: settings.company.name }, flagged: false });
  // The branch staff screens' own demo data (manager, storekeeper, driver, online orders).
  addStaffDemoData(data, newId, today);

  return data;
};
