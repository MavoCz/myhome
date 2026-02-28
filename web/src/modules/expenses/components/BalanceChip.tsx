import Chip from '@mui/material/Chip';
import type { BalanceResponse } from '../../../../../common/src/api/generated/model';

interface BalanceChipProps {
  balance: BalanceResponse;
}

export function BalanceChip({ balance }: BalanceChipProps) {
  const net = balance.netBalanceCzk ?? 0;
  const label = `${balance.displayName}: ${net > 0 ? '+' : ''}${Number(net).toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CZK`;
  const color = net > 0 ? 'success' : net < 0 ? 'error' : 'default';

  return (
    <Chip
      label={label}
      color={color as 'success' | 'error' | 'default'}
      size="medium"
      variant="outlined"
      data-testid={`expenses-balance-chip-${balance.userId}`}
    />
  );
}
