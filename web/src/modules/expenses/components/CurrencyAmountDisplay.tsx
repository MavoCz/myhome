import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ExpenseResponse } from '../../../../../common/src/api/generated/model';

interface Props {
  expense: ExpenseResponse;
}

export function CurrencyAmountDisplay({ expense }: Props) {
  const czk = Number(expense.czkAmount ?? 0).toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (expense.originalCurrency === 'CZK') {
    return <Typography variant="body2">{czk} CZK</Typography>;
  }

  const origFormatted = `${expense.originalCurrency === 'EUR' ? '€' : ''}${Number(expense.originalAmount).toLocaleString('cs-CZ')} ${expense.originalCurrency}`;
  const rateFormatted = expense.exchangeRate != null ? `@ ${Number(expense.exchangeRate).toFixed(2)}` : '';

  return (
    <Tooltip title={`${origFormatted} ${rateFormatted}`.trim()}>
      <Typography variant="body2" component="span" sx={{ cursor: 'help', textDecoration: 'underline dotted' }}>
        {czk} CZK
      </Typography>
    </Tooltip>
  );
}
