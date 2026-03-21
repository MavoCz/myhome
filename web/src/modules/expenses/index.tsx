import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SettingsIcon from '@mui/icons-material/Settings';
import SummarizeIcon from '@mui/icons-material/Summarize';
import type { ModuleDefinition } from '../registry';

export const expensesModule: ModuleDefinition = {
  id: 'expenses',
  name: 'Expenses',
  description: 'Track and split family costs',
  icon: <ReceiptLongIcon />,
  path: '/expenses',
  color: '#FF6B35',
  menuItems: [
    { label: 'Monthly Summary', path: '/expenses/summary', icon: <SummarizeIcon /> },
    { label: 'Manage Groups', path: '/expenses/groups', icon: <SettingsIcon />, roles: ['ADMIN', 'PARENT'] },
  ],
};

export { ExpensesPage } from './pages/ExpensesPage';
export { ExpenseSummaryPage } from './pages/ExpenseSummaryPage';
export { ManageGroupsPage } from './pages/ManageGroupsPage';
