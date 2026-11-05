import type { BrandTerms, ConfigOption, CountrySettings, Localized, PaymentMethod, Settings } from '@/shared/types';
import { brand } from './brand';

// The shared defaults file: every value the owner can change starts here.
// The owner's settings pages save their changes over these; "Reset to defaults" brings these back.
// Change a default here, never inside a page or component.

const option = (id: string, en: string, ar: string): ConfigOption => ({ id, label: { en, ar } });
const both = (en: string, ar: string): Localized => ({ en, ar });

export const defaultBrandTerms: BrandTerms = {
  model: 'commission',
  commissionRate: 30,
  monthlyFee: 0,
  feeCurrency: 'EGP',
  deductFeeFromPayout: true,
  payoutFrequency: 'monthly',
  payoutCurrency: 'EGP',
  allowDiscounts: true,
  discountFunding: 'shared',
  brandSharePercent: 50,
  defectPolicy: 'brandReplaces',
  minMargin: null,
};

export const defaultPaymentMethods: PaymentMethod[] = [
  { id: 'pm-cash', name: both('Cash', 'نقدًا'), kind: 'cash', feePercent: 0, active: true },
  { id: 'pm-card', name: both('Card', 'بطاقة'), kind: 'card', feePercent: 2.25, active: true },
  { id: 'pm-instapay', name: both('InstaPay', 'إنستاباي'), kind: 'instapay', feePercent: 0.1, active: true },
  { id: 'pm-wallet', name: both('Mobile wallet', 'محفظة إلكترونية'), kind: 'wallet', feePercent: 1, active: true },
  { id: 'pm-mada', name: both('Mada', 'مدى'), kind: 'card', feePercent: 0.8, active: true },
  { id: 'pm-credit', name: both('Store credit', 'رصيد المتجر'), kind: 'storeCredit', feePercent: 0, active: true },
  { id: 'pm-cod', name: both('Cash on delivery', 'الدفع عند الاستلام'), kind: 'cod', feePercent: 0, active: true },
];

const egypt: CountrySettings = {
  countryCode: 'EG',
  authority: 'eta',
  registration: {
    countryCode: 'EG',
    legalName: `${brand.name} for Ready-Made Garments`,
    vatNumber: '',
    commercialRegistration: '',
    address: '',
  },
  receipt: {
    header: both(brand.name, brand.name),
    footer: both('Thank you for shopping local.', 'شكرًا لدعمك للبراندات المحلية.'),
    returnPolicy: both('Returns and exchanges within 14 days with the receipt.', 'الاسترجاع والاستبدال خلال ١٤ يومًا مع الإيصال.'),
    showLogo: true,
  },
  returns: { days: 14, receiptRequired: true, saleItems: 'exchangeOnly', refundMethods: ['cash', 'cardReversal', 'storeCredit'], otherBranch: true },
};

const saudiArabia: CountrySettings = {
  countryCode: 'SA',
  authority: 'zatca',
  registration: { countryCode: 'SA', legalName: `${brand.name} Trading Company`, vatNumber: '', commercialRegistration: '', address: '' },
  receipt: {
    header: both(brand.name, brand.name),
    footer: both('Thank you for shopping local.', 'شكرًا لدعمك للبراندات المحلية.'),
    returnPolicy: both('Returns and exchanges within 7 days with the receipt.', 'الاسترجاع والاستبدال خلال ٧ أيام مع الإيصال.'),
    showLogo: true,
  },
  returns: { days: 7, receiptRequired: true, saleItems: 'exchangeOnly', refundMethods: ['cardReversal', 'storeCredit'], otherBranch: false },
};

// Settings for a country added later, before the owner fills them in.
export const newCountrySettings = (countryCode: string): CountrySettings => ({
  ...structuredClone(egypt),
  countryCode,
  authority: 'none',
  registration: { countryCode, legalName: '', vatNumber: '', commercialRegistration: '', address: '' },
});

export const defaultSettings: Settings = {
  company: { name: brand.name },
  baseCurrency: 'EGP',
  reportingCurrency: 'EGP',
  receiptLanguage: 'both',
  countries: [egypt, saudiArabia],
  crossCountryExchange: false,
  nonReturnable: { productIds: [], categoryIds: [] },
  paymentMethods: defaultPaymentMethods,
  discountLimits: { cashier: 10, manager: 25 },
  approvalRules: { discountAboveLimit: true, returnOutsidePolicy: true, returnWithoutReceipt: true, void: true, priceOverride: true },
  refundApprovalAbove: 3000,
  ownerApprovalAbove: 10000,
  stockCountApprovalAbove: 5,
  approvalPinTries: 3,
  manualDiscountOnPromotion: false,
  staffDiscount: { percent: 20, monthlyLimit: 5000 },
  defaultMinMargin: 35,
  defaultBrandTerms,
  lowStockDefault: 2,
  slowMoverWeeks: 6,
  agingBuckets: [30, 60, 90],
  feeDueDay: 5,
  flagRules: {
    discountAbovePercent: 20,
    refundAbove: 3000,
    priceChanges: true,
    costChanges: true,
    writeOffs: true,
    cashDifferences: true,
    stockAdjustments: true,
    voids: true,
  },
  ownerAlerts: {
    lowStock: true,
    batchCostChanged: true,
    belowMargin: true,
    largeDiscountOrRefund: true,
    cashDifference: true,
    brandPaymentDue: true,
    transferMissing: true,
    noSellingPrice: true,
    stockRequest: true,
    pickupMismatch: true,
    defectiveReturn: true,
    eReceiptFailed: true,
    approvalWaiting: true,
  },
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size'],
  colors: ['Black', 'White', 'Off-white', 'Grey', 'Navy', 'Green', 'Beige', 'Brown', 'Blue', 'Red', 'Pink'],
  seasons: ['Summer 2026', 'Winter 2026', 'Ramadan 2026', 'Back to school 2026', 'Winter 2025'],
  barcodePrefix: '622', // Egypt's GS1 prefix; generated barcodes are EAN-13
  lists: {
    discountReasons: [
      option('dr-damaged', 'Small flaw', 'عيب بسيط'),
      option('dr-loyal', 'Regular customer', 'عميل دائم'),
      option('dr-bulk', 'Bought several pieces', 'شراء أكثر من قطعة'),
      option('dr-staff', 'Staff purchase', 'مشتريات الموظفين'),
      option('dr-influencer', 'Influencer', 'مؤثر'),
      option('dr-price-match', 'Price match', 'مطابقة السعر'),
    ],
    returnReasons: [
      option('rr-size', 'Wrong size', 'المقاس غير مناسب'),
      option('rr-changed-mind', 'Changed their mind', 'غيّر رأيه'),
      option('rr-defect', 'Defective', 'به عيب'),
      option('rr-not-as-shown', 'Not as shown', 'غير مطابق للصورة'),
      option('rr-gift', 'Gift exchange', 'استبدال هدية'),
    ],
    defectReasons: [
      option('df-stitching', 'Stitching', 'خياطة'),
      option('df-stain', 'Stain', 'بقعة'),
      option('df-print', 'Print fault', 'عيب طباعة'),
      option('df-hole', 'Hole or tear', 'ثقب أو قطع'),
      option('df-size-label', 'Wrong size label', 'مقاس خطأ على الملصق'),
      option('df-color', 'Color fade', 'بهتان اللون'),
    ],
    writeOffReasons: [
      option('wo-lost', 'Lost', 'مفقود'),
      option('wo-stolen', 'Stolen', 'مسروق'),
      option('wo-damaged', 'Damaged beyond repair', 'تالف لا يمكن إصلاحه'),
    ],
    countReasons: [
      option('cr-miscount', 'Counted wrong before', 'خطأ في عدّ سابق'),
      option('cr-not-scanned', 'Sold without scanning', 'بيع بدون مسح'),
      option('cr-lost', 'Lost', 'مفقود'),
      option('cr-found', 'Found', 'تم العثور عليه'),
    ],
    expenseCategories: [
      option('ex-rent', 'Rent', 'إيجار'),
      option('ex-salaries', 'Salaries', 'رواتب'),
      option('ex-utilities', 'Utilities', 'مرافق'),
      option('ex-marketing', 'Marketing and ads', 'تسويق وإعلانات'),
      option('ex-other', 'Other', 'أخرى'),
    ],
    approvalReasons: [
      option('ar-ok-policy', 'Within policy', 'ضمن السياسة'),
      option('ar-customer', 'Keep the customer happy', 'لإرضاء العميل'),
      option('ar-too-high', 'Too high', 'أعلى من المسموح'),
      option('ar-no-reason', 'No valid reason', 'لا يوجد سبب مقبول'),
    ],
  },
};
