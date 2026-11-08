import type { Batch, DefectReasonQty, Id, Product, Receiving, SignedLine, Variant } from '@/shared/types';
import { currentTerms, nowIso } from '@/shared/utils';
import { ApiError } from './errors';
import { assertBranch, hasRole } from './branchScope';
import { placeIn } from './engine';
import { checkUnique, freshBarcode } from './products';
import { describeVariant } from './stock';
import { actor, db, findById, isOwner, logActivity, mutate, newId, nextNumber, notify, respond } from './server';

// Receiving a brand delivery in a branch or the warehouse. A receiving starts as a draft: the storekeeper lists each
// size and colour against the brand's delivery list (expected), counts what came (received) and sets aside defective
// pieces. The brand's courier signs for what they delivered and the storekeeper countersigns. Confirming adds the
// good pieces to the stock (back room or warehouse), records the defective ones against their batch, and creates a
// batch per product. Batches start at the product's standard cost for the owner to adjust on the Costing page;
// storekeepers never see cost.

const assertStorekeeper = (branchId: Id) => {
  const me = actor();
  assertBranch(branchId, me);
  if (!isOwner(me) && !hasRole(me, 'storekeeper') && !hasRole(me, 'manager')) throw new ApiError('notAllowed');
  return me;
};

export interface ReceivingLineView {
  variantId: Id;
  expected: number;
  received: number;
  defective: number;
  missing: number;
  defectReasons?: DefectReasonQty[];
  productName: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  brandId: Id;
  barcodeGenerated: boolean;
}

export interface ReceivingView {
  receiving: Receiving;
  lines: ReceivingLineView[];
  batchNumbers: string[];
}

const variantOf = (variantId: Id) => db.products.flatMap((product) => product.variants).find((variant) => variant.id === variantId);

const toView = (receiving: Receiving): ReceivingView => ({
  receiving,
  lines: receiving.lines.map((line) => {
    const variant = variantOf(line.variantId);
    return { ...line, ...describeVariant(line.variantId), barcode: variant?.barcode ?? '', barcodeGenerated: Boolean(variant?.barcodeGenerated) };
  }),
  batchNumbers: receiving.batchIds.map((id) => db.batches.find((batch) => batch.id === id)?.number ?? '').filter(Boolean),
});

export const listReceivings = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    return db.receivings
      .filter((receiving) => receiving.branchId === branchId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map(toView);
  });

export const getReceiving = (receivingId: Id, branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    const receiving = findById(db.receivings, receivingId);
    if (receiving.branchId !== branchId) throw new ApiError('notFound');
    return toView(receiving);
  });

export interface NewReceivingInput {
  branchId: Id;
  brandId: Id;
  consignment: boolean;
  batchNumber?: string;
  note?: string;
}

export const createReceiving = (input: NewReceivingInput) =>
  mutate(() => {
    const me = assertStorekeeper(input.branchId);
    const brand = findById(db.brands, input.brandId);
    const receiving: Receiving = {
      id: newId(),
      number: nextNumber('RC', 4),
      brandId: brand.id,
      branchId: input.branchId,
      at: nowIso(),
      byId: me.id,
      batchIds: [],
      lines: [],
      status: 'draft',
      consignment: input.consignment,
      batchNumber: input.batchNumber?.trim() || undefined,
      note: input.note?.trim() || undefined,
    };
    db.receivings.push(receiving);
    logActivity({ action: 'create', target: { type: 'stock', id: receiving.id, label: receiving.number }, branchId: input.branchId });
    return receiving;
  });

export interface ReceivingLineInput {
  variantId: Id;
  expected: number;
  received: number;
  defective: number;
  defectReasons?: DefectReasonQty[]; // the defective pieces by reason; a draft can be partly filled
}

const whole = (value: number) => Math.max(0, Math.floor(value || 0));

const cleanLines = (lines: readonly ReceivingLineInput[]) =>
  lines.map((line) => {
    const expected = whole(line.expected);
    const received = whole(line.received);
    const defective = whole(line.defective);
    // Defective pieces are part of what was received.
    if (defective > received) throw new ApiError('quantityMismatch');
    // Reasons for the defective pieces, never for more pieces than are defective.
    const defectReasons = defective ? (line.defectReasons ?? []).map((row) => ({ reasonId: row.reasonId, qty: whole(row.qty) })).filter((row) => row.reasonId && row.qty > 0) : [];
    if (defectReasons.reduce((sum, row) => sum + row.qty, 0) > defective) throw new ApiError('quantityMismatch');
    return { variantId: line.variantId, expected, received, defective, missing: Math.max(expected - received, 0), ...(defectReasons.length ? { defectReasons } : {}) };
  });

// Saves the list while it is a draft (scanned items, expected and received quantities, defective pieces).
export const saveReceivingLines = (receivingId: Id, lines: ReceivingLineInput[]) =>
  mutate(() => {
    const receiving = findById(db.receivings, receivingId);
    assertStorekeeper(receiving.branchId);
    if (receiving.status === 'confirmed') throw new ApiError('alreadyDecided');
    receiving.lines = cleanLines(lines);
    return toView(receiving);
  });

export interface ConfirmReceivingInput {
  lines: ReceivingLineInput[];
  courierName: string; // the brand's driver or courier, typed as their signature
  courierLines: { variantId: Id; qty: number }[]; // what the courier says they delivered, per product
  storekeeperName: string;
}

export const confirmReceiving = (receivingId: Id, input: ConfirmReceivingInput) =>
  mutate(() => {
    const receiving = findById(db.receivings, receivingId);
    const me = assertStorekeeper(receiving.branchId);
    if (receiving.status === 'confirmed') throw new ApiError('alreadyDecided');
    if (!input.courierName.trim() || !input.storekeeperName.trim()) throw new ApiError('notAllowed');
    const lines = cleanLines(input.lines).filter((line) => line.expected > 0 || line.received > 0);
    if (!lines.some((line) => line.received > 0)) throw new ApiError('notAllowed');
    const branch = findById(db.branches, receiving.branchId);
    const at = nowIso();
    const kind = branch.kind === 'store' ? 'backRoom' : 'storage';
    const brand = findById(db.brands, receiving.brandId);
    const liability = currentTerms(brand).defectPolicy === 'storeAbsorbs' ? 'store' : 'brand';
    // Every defective piece has a reason (one defect is recorded per reason).
    if (lines.some((line) => line.defective > 0 && (line.defectReasons ?? []).reduce((sum, row) => sum + row.qty, 0) !== line.defective)) throw new ApiError('quantityMismatch');

    // One batch per product in the delivery.
    const byProduct = new Map<Id, typeof lines>();
    lines.forEach((line) => {
      const productId = describeVariant(line.variantId).productId;
      byProduct.set(productId, [...(byProduct.get(productId) ?? []), line]);
    });
    const batchFor = new Map<Id, Batch>();
    byProduct.forEach((productLines, productId) => {
      const product = findById(db.products, productId);
      const qty = productLines.reduce((sum, line) => sum + line.received, 0);
      if (!qty) return;
      const batch: Batch = {
        id: newId(),
        number: receiving.batchNumber ? `${receiving.batchNumber}${byProduct.size > 1 ? `-${batchFor.size + 1}` : ''}` : nextNumber('B', 4),
        productId,
        brandId: product.brandId,
        branchId: branch.id,
        receivedAt: at,
        qty,
        totalCost: product.cost * qty, // the standard cost until the owner enters the delivery's real cost
        currency: db.settings.baseCurrency,
        defects: productLines.reduce((sum, line) => sum + line.defective, 0),
        defectHandling: 'writeOff',
        redistribution: 'none',
        brandCredit: 0,
      };
      db.batches.push(batch);
      batchFor.set(productId, batch);
    });

    lines.forEach((line) => {
      const info = describeVariant(line.variantId);
      const batch = batchFor.get(info.productId);
      const good = line.received - line.defective;
      if (good > 0) db.movements.push({ id: newId(), at, byId: me.id, variantId: line.variantId, qty: good, to: placeIn(branch, kind), kind: 'receive', ref: { type: 'receiving', id: receiving.id }, batchId: batch?.id });
      if (line.defective > 0) {
        db.movements.push({ id: newId(), at, byId: me.id, variantId: line.variantId, qty: line.defective, to: placeIn(branch, kind, 'defective'), kind: 'receive', ref: { type: 'receiving', id: receiving.id }, batchId: batch?.id });
        const product = findById(db.products, info.productId);
        (line.defectReasons ?? []).forEach((row) =>
          db.defects.push({ id: newId(), at, byId: me.id, productId: info.productId, variantId: line.variantId, batchId: batch?.id, branchId: branch.id, qty: row.qty, reasonId: row.reasonId, foundAt: 'receiving', liability, status: 'open', unitCost: product.cost, note: receiving.number, locationId: placeIn(branch, kind).locationId }),
        );
      }
    });

    const signed = (qty: (line: (typeof lines)[number]) => number): SignedLine[] => lines.map((line) => ({ variantId: line.variantId, qty: qty(line), defects: line.defective, missing: line.missing }));
    Object.assign(receiving, {
      lines,
      status: 'confirmed',
      confirmedAt: at,
      at,
      byId: me.id,
      batchIds: [...batchFor.values()].map((batch) => batch.id),
      courier: { name: input.courierName.trim(), signedAt: at, lines: lines.map((line) => ({ variantId: line.variantId, qty: whole(input.courierLines.find((current) => current.variantId === line.variantId)?.qty ?? line.received) })) },
      storekeeper: { name: input.storekeeperName.trim(), userId: me.id, signedAt: at, lines: signed((line) => line.received) },
    });
    // Products without a selling price yet can't be sold: the owners are told.
    [...byProduct.keys()].forEach((productId) => {
      const product = findById(db.products, productId);
      if (!product.prices[branch.currency]) notify('noSellingPrice', { product: product.name, currency: branch.currency }, `/owner/products/${product.id}`);
    });
    logActivity({ action: 'create', target: { type: 'stock', id: receiving.id, label: receiving.number }, branchId: branch.id, changes: [{ field: 'received', from: null, to: lines.reduce((sum, line) => sum + line.received, 0) }] });
    return toView(receiving);
  });

// ---- New sizes, colours and products found while receiving ----------------------------------------------------

export interface NewVariantInput {
  productId: Id;
  size: string;
  color: string;
  barcode?: string; // empty: the system makes one (for items that arrive without a barcode)
}

// Adds a size and colour to an existing product, with its barcode, while receiving. No price or cost is set here.
export const addVariantWhileReceiving = (branchId: Id, input: NewVariantInput) =>
  mutate(() => {
    assertStorekeeper(branchId);
    const product = findById(db.products, input.productId);
    const size = input.size.trim();
    const color = input.color.trim();
    if (!size || !color) throw new ApiError('notAllowed');
    const existing = product.variants.find((variant) => !variant.archived && variant.size === size && variant.color === color);
    if (existing) return { variantId: existing.id, barcode: existing.barcode, ...describeVariant(existing.id) };
    const taken = new Set(db.products.flatMap((current) => current.variants.map((variant) => variant.barcode)));
    const typed = input.barcode?.trim();
    if (typed && taken.has(typed)) throw new ApiError('duplicateBarcode');
    const base = product.variants[0]?.sku.split('-')[0] || product.id.slice(0, 6);
    const variant: Variant = { id: newId(), size, color, sku: `${base}-${product.variants.length + 1}`, barcode: typed || freshBarcode(taken), barcodeGenerated: !typed, prices: {}, archived: false };
    checkUnique([...product.variants, variant], product.id);
    product.variants.push(variant);
    logActivity({ action: 'update', target: { type: 'product', id: product.id, label: product.name }, changes: [{ field: 'variants', from: null, to: `${size} · ${color}` }] });
    return { variantId: variant.id, barcode: variant.barcode, ...describeVariant(variant.id) };
  });

export interface NewProductInput {
  brandId: Id;
  categoryId: Id;
  name: string;
}

// A product the store has never had, created with its name, brand and category only. The owner adds its price and
// cost; until then it can't be sold.
export const addProductWhileReceiving = (branchId: Id, input: NewProductInput) =>
  mutate(() => {
    assertStorekeeper(branchId);
    const name = input.name.trim();
    if (!name) throw new ApiError('notAllowed');
    findById(db.brands, input.brandId);
    findById(db.categories, input.categoryId);
    const product: Product = { id: newId(), brandId: input.brandId, categoryId: input.categoryId, name, season: '', collection: '', prices: {}, cost: 0, variants: [], archived: false, createdAt: nowIso() };
    db.products.push(product);
    logActivity({ action: 'create', target: { type: 'product', id: product.id, label: product.name } });
    return { id: product.id, name: product.name };
  });

// A brand's products, to pick from (adding a size or colour while receiving, asking for a discount). Names, photos,
// sizes and colours only. A brand partner always gets their own brand, whatever `brandId` is.
export const listBrandProducts = (brandId?: Id) =>
  respond(() => {
    const brand = actor().brandId ?? brandId;
    if (!brand) throw new ApiError('notAllowed');
    return db.products
      .filter((product) => product.brandId === brand && !product.archived)
      .map((product) => ({ id: product.id, name: product.name, photo: product.photo, sizes: [...new Set(product.variants.map((variant) => variant.size))], colors: [...new Set(product.variants.map((variant) => variant.color))] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

// Barcode labels and price tags: each item with its barcode and selling price in the branch's currency.
export const getLabelItems = (branchId: Id, variantIds: Id[]) =>
  respond(() => {
    const branch = assertBranch(branchId);
    return variantIds.map((variantId) => {
      const info = describeVariant(variantId);
      const product = db.products.find((current) => current.id === info.productId);
      const variant = variantOf(variantId);
      const price = variant?.prices[branch.currency] ?? product?.prices[branch.currency] ?? null;
      return { variantId, ...info, barcode: variant?.barcode ?? '', price, currency: branch.currency };
    });
  });
