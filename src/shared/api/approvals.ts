import type { ApprovalRequest, Id } from '@/shared/types';
import { routes } from '@/shared/constants';
import { nowIso } from '@/shared/utils';
import { ApiError } from './errors';
import { decideRedistribution, decideWriteOff } from './costing';
import { decidePromotion } from './promotions';
import { decideCount, decideStockRequest } from './stock';
import { decideStatement } from './payouts';
import { actor, db, findById, logActivity, mutate, notify, respond } from './server';

export const listApprovals = (filter: { status?: ApprovalRequest['status']; level?: ApprovalRequest['level'] }) =>
  respond(() =>
    db.approvals
      .filter((approval) => (!filter.status || approval.status === filter.status) && (!filter.level || approval.level === filter.level))
      .sort((a, b) => b.at.localeCompare(a.at)),
  );

// Decides any request. Requests about a record (a count, a write-off, a batch's cost, a brand's promotion, a
// stock request, a payout) apply the change to that record; requests from the till (a discount, a refund, a
// price change) answer the cashier, who finishes the sale.
export const decideApproval = async (approvalId: Id, approve: boolean, reason?: string) => {
  const approval = db.approvals.find((current) => current.id === approvalId);
  if (!approval) throw new ApiError('notFound');
  if (approval.status !== 'pending') throw new ApiError('alreadyDecided');
  const refId = approval.ref?.id ?? '';
  switch (approval.kind) {
    case 'costRedistribution':
      return decideRedistribution(refId, approve, reason);
    case 'writeOff':
      return decideWriteOff(refId, approve, reason);
    case 'promotion':
      return decidePromotion(refId, approve, reason);
    case 'stockCount':
      return decideCount(refId, approve, reason);
    case 'stockRequest':
      return decideStockRequest(refId, approve ? 'warehouse' : 'reject', reason);
    case 'payout':
      return decideStatement(refId, approve, reason);
    default:
      return mutate(() => {
        const current = findById(db.approvals, approvalId);
        Object.assign(current, { status: approve ? 'approved' : 'rejected', decidedById: actor().id, decidedAt: nowIso(), reason, channel: current.channel ?? 'app' });
        logActivity({
          action: approve ? 'approve' : 'reject',
          target: { type: 'approval', id: current.id, label: current.summary },
          branchId: current.branchId,
          amount: current.amount,
          currency: current.currency,
          flagged: true,
        });
        notify(approve ? 'approvalApproved' : 'approvalRejected', { summary: current.summary, user: actor().name, reason: reason ?? '' }, routes.notifications, [current.requestedById]);
        return current;
      });
  }
};
