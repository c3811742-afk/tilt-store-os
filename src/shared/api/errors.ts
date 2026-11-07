// The reasons a call can fail. Pages show a friendly message for each (text.errors), never the code itself.
export type ApiErrorCode =
  | 'network'
  | 'notFound'
  | 'signedOut'
  | 'notAllowed'
  | 'duplicateBarcode'
  | 'duplicateSku'
  | 'duplicateEmail'
  | 'duplicateCode'
  | 'periodLocked'
  | 'discountsNotAllowed'
  | 'noRate'
  | 'invalidFile'
  | 'lastOwner'
  | 'alreadyDecided'
  | 'wrongPassword'
  | 'wrongPin'
  | 'wrongCurrentPassword'
  | 'samePassword'
  | 'shiftClosed'
  | 'shiftAlreadyOpen'
  | 'customerRequired'
  | 'outOfStock'
  | 'notPaid'
  | 'approvalNeeded'
  | 'notEnoughCredit'
  | 'invalidCode'
  | 'wrongApprovalPin'
  | 'approvalPinLocked'
  | 'noteRequired'
  | 'reasonRequired'
  | 'returnNotAllowed'
  | 'tooManyReturned'
  | 'noDiscountOnPromotion';

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode) {
    super(code);
    this.code = code;
    this.name = 'ApiError';
  }
}

export const isApiError = (error: unknown, code?: ApiErrorCode): error is ApiError =>
  error instanceof ApiError && (!code || error.code === code);
