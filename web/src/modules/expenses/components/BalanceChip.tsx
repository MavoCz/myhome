import Chip from '@mui/material/Chip';
import type { BalanceResponse } from '../../../../../common/src/api/generated/model';

interface BalanceChipProps {
  balance: BalanceResponse;
  memberColor?: string;
}

export function BalanceChip({ balance, memberColor }: BalanceChipProps) {
  const net = balance.netBalanceCzk ?? 0;
  const label = `${balance.displayName}: ${net > 0 ? '+' : ''}${Number(net).toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CZK`;

  return (
    <Chip
      label={label}
      size="medium"
      sx={memberColor ? {
        backgroundColor: memberColor,
        color: '#fff',
        fontWeight: 500,
      } : undefined}
      data-testid={`expenses-balance-chip-${balance.userId}`}
    />
  );
}
