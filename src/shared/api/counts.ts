import type { Id, StockCount } from '@/shared/types';
import { nowIso, stockLevels } from '@/shared/utils';
import { ApiError } from './errors';
import { assertBranch, hasRole, notifyUsers, staffWithRole } from './branchScope';
import { decideCount, describeVariant } from './stock';
import { actor, db, findById, isOwner, logActivity, mutate, newId, nextNumber, notify, respond } from './server';

// Stock counts in a branch. A count starts "open" with the expected quantity of every item in scope (per location),
// staff count by scanning, then submit it with a reason for every difference. The branch manager approves it when
// the difference is within their limit (Policies), otherwise the owner does. Approving corrects the stock with an
// adjustment movement per difference; nothing is ever edited directly.

export type CountScope = NonNullable<StockCount['scope']>;

export interface CountLineView {
  variantId: Id;
  locationId: Id;
  expected: number | null; // hidden while a blind count is open
  counted: number;
  difference: number | null;
  reasonId?: Id;
  productName: string;
  size: string;
  color: string;
  sku: string;
  brandId: Id;
}

export interface CountView {
  count: StockCount;
  lines: CountLineView[];
  totalDifference: number | null; // pieces off, either way; hidden while a blind count is open
  needsOwner: boolean; // above the manager's limit
  limit: number;
}

const lineKey = (variantId: Id, locationId?: Id) => `${variantId}|${locationId ?? ''}`;
const absDifference = (count: StockCount) => count.lines.reduce((sum, line) => sum + Math.abs(line.counted - line.expected), 0);

const toView = (count: StockCount): CountView => {
  const hidden = count.blind && count.status === 'open';
  const total = absDifference(count);
  return {
    count,
    lines: count.lines.map((line) => {
      const info = describeVariant(line.variantId);
      return {
        variantId: line.variantId,
        locationId: line.locationId ?? '',
        expected: hidden ? null : line.expected,
        counted: line.counted,
        difference: hidden ? null : line.counted - line.expected,
        reasonId: line.reasonId,
        productName: info.productName,
        size: info.size,
        color: info.color,
        sku: info.sku,
        brandId: info.brandId,
      };
    }),
    totalDifference: hidden ? null : total,
    needsOwner: total > db.settings.stockCountApprovalAbove,
    limit: db.settings.stockCountApprovalAbove,
  };
};

const assertCounter = (branchId: Id) => {
  const me = actor();
  assertBranch(branchId, me);
  if (!isOwner(me) && !hasRole(me, 'manager') && !hasRole(me, 'storekeeper')) throw new ApiError('notAllowed');
  return me;
};

// Available pieces right now at one place, for the expected quantity of an item added during the count.
const availableAt = (variantId: Id, branchId: Id, locationId: Id) =>
  stockLevels(db.movements.filter((movement) => movement.variantId === variantId))
    .filter((level) => level.branchId === branchId && level.locationId === locationId && level.status === 'available')
    .reduce((sum, level) => sum + level.qty, 0);

export const listBranchCounts = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    return db.counts
      .filter((count) => count.branchId === branchId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map(toView);
  });

export const getCount = (countId: Id, branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    const count = findById(db.counts, countId);
    if (count.branchId !== branchId) throw new ApiError('notFound');
    return toView(count);
  });

export interface StartCountInput {
  branchId: Id;
  scope: CountScope;
  blind: boolean;
}

// Starts a full count, or a partial one (one brand, or one location such as the shop floor or a shelf area).
export const startCount = (input: StartCountInput) =>
  mutate(() => {
    const me = assertCounter(input.branchId);
    const branch = findById(db.branches, input.branchId);
    if (input.scope.kind === 'brand' && !input.scope.brandId) throw new ApiError('notAllowed');
    if (input.scope.kind === 'location' && !branch.locations.some((location) => location.id === input.scope.locationId)) throw new ApiError('notAllowed');
    const brandOf = new Map(db.products.flatMap((product) => product.variants.map((variant) => [variant.id, product.brandId] as const)));
    const lines = stockLevels(db.movements)
      .filter(
        (level) =>
          level.branchId === branch.id &&
          level.status === 'available' &&
          level.qty > 0 &&
          (input.scope.kind !== 'brand' || brandOf.get(level.variantId) === input.scope.brandId) &&
          (input.scope.kind !== 'location' || level.locationId === input.scope.locationId),
      )
      .map((level) => ({ variantId: level.variantId, locationId: level.locationId, expected: level.qty, counted: 0 }));
    const count: StockCount = { id: newId(), number: nextNumber('SC', 4), branchId: branch.id, at: nowIso(), byId: me.id, blind: input.blind, lines, status: 'open', scope: input.scope };
    db.counts.push(count);
    logActivity({ action: 'create', target: { type: 'stockCount', id: count.id, label: count.number }, branchId: branch.id });
    return count;
  });

export interface CountLineInput {
  variantId: Id;
  locationId: Id;
  counted: number;
  reasonId?: Id;
}

const applyLines = (count: StockCount, lines: readonly CountLineInput[]) => {
  lines.forEach((input) => {
    const counted = Math.max(0, Math.floor(input.counted));
    const existing = count.lines.find((line) => lineKey(line.variantId, line.locationId) === lineKey(input.variantId, input.locationId));
    if (existing) Object.assign(existing, { counted, reasonId: input.reasonId || undefined });
    else count.lines.push({ variantId: input.variantId, locationId: input.locationId, expected: availableAt(input.variantId, count.branchId, input.locationId), counted, reasonId: input.reasonId || undefined });
  });
};

// Saves the counted quantities so far (and any reasons), while the count is open.
export const saveCount = (countId: Id, lines: CountLineInput[]) =>
  mutate(() => {
    const count = findById(db.counts, countId);
    assertCounter(count.branchId);
    if (count.status !== 'open') throw new ApiError('alreadyDecided');
    applyLines(count, lines);
    return toView(count);
  });

// Sends the count for approval. Every difference needs a reason. Within the manager's limit the branch manager
// approves it; above it, the owner does.
export const submitCount = (countId: Id, lines: CountLineInput[]) =>
  mutate(() => {
    const count = findById(db.counts, countId);
    const me = assertCounter(count.branchId);
    if (count.status !== 'open') throw new ApiError('alreadyDecided');
    applyLines(count, lines);
    // A blind count can't explain differences it can't see: the manager gives the reasons when approving.
    if (!count.blind && count.lines.some((line) => line.counted !== line.expected && !line.reasonId)) throw new ApiError('missingReason');
    Object.assign(count, { status: 'pending', submittedById: me.id, submittedAt: nowIso() });
    const total = absDifference(count);
    const toOwner = total > db.settings.stockCountApprovalAbove;
    db.approvals.push({ id: newId(), kind: 'stockCount', level: toOwner ? 'owner' : 'manager', status: 'pending', branchId: count.branchId, requestedById: me.id, at: count.submittedAt ?? nowIso(), ref: { type: 'stockCount', id: count.id }, summary: count.number });
    if (toOwner) notify('approvalWaiting', { summary: count.number, user: me.name }, '/owner/stock?tab=counts');
    else notifyUsers('countSubmitted', { number: count.number, user: me.name }, `/manager/counts/${count.id}`, staffWithRole('manager', count.branchId).filter((id) => id !== me.id));
    logActivity({ action: 'update', target: { type: 'stockCount', id: count.id, label: count.number }, branchId: count.branchId, changes: [{ field: 'status', from: 'open', to: 'pending' }] });
    return toView(count);
  });

// The branch manager approves (stock is corrected) or rejects a submitted count within their limit, with a reason.
// They can fill in or change the reason of any difference first; every adjustment must have one.
export const decideBranchCount = async (countId: Id, approve: boolean, reasonId: string, lineReasons: Record<string, Id> = {}) => {
  await mutate(() => {
    const count = findById(db.counts, countId);
    const me = actor();
    assertBranch(count.branchId, me);
    if (!isOwner(me) && !hasRole(me, 'manager')) throw new ApiError('notAllowed');
    if (count.status !== 'pending') throw new ApiError('alreadyDecided');
    if (!isOwner(me) && absDifference(count) > db.settings.stockCountApprovalAbove) throw new ApiError('notAllowed');
    count.lines.forEach((line) => {
      const given = lineReasons[lineKey(line.variantId, line.locationId)];
      if (given) line.reasonId = given;
    });
    if (approve && count.lines.some((line) => line.counted !== line.expected && !line.reasonId)) throw new ApiError('missingReason');
    count.decisionReason = reasonId;
    return count;
  });
  return decideCount(countId, approve, reasonId);
};

export const countLineKey = lineKey;
