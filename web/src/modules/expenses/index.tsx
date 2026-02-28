import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { ModuleDefinition } from '../registry';

export const expensesModule: ModuleDefinition = {
  id: 'expenses',
  name: 'Expenses',
  description: 'Track and split family costs',
  icon: <ReceiptLongIcon />,
  path: '/expenses',
  color: '#FF6B35',
};

export { ExpensesPage } from './pages/ExpensesPage';
export { ExpenseSummaryPage } from './pages/ExpenseSummaryPage';
export { ExpenseGroupsPage } from './pages/ExpenseGroupsPage';
