import type { TransferFormProps } from './TransferForm.types';

export const transferFormDefaults: Required<Pick<TransferFormProps, 'mode' | 'initialLines' | 'initialOtherBranchId'>> = {
  mode: 'request',
  initialLines: [],
  initialOtherBranchId: '',
};
