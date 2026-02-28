import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Fab from '@mui/material/Fab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListExpenses,
  useGetBalances,
  useListGroups,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  getListExpensesQueryKey,
  getGetBalancesQueryKey,
} from '../../../api/generated/openAPIDefinition';
import type { ExpenseGroupResponse, ExpenseResponse, ExpenseRequest } from '../../../../../common/src/api/generated/model';
import { useAuth } from '../../../hooks/useAuth';
import { BalanceChip } from '../components/BalanceChip';
import { CurrencyAmountDisplay } from '../components/CurrencyAmountDisplay';
import { ExpenseForm } from '../components/ExpenseForm';
import { useListMembers } from '../../../api/generated/openAPIDefinition';

export function ExpensesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseResponse | null>(null);

  const { data: groups = [] } = useListGroups();
  const { data: balances = [] } = useGetBalances();
  const { data: members = [] } = useListMembers();

  const { data: expensesData } = useListExpenses({
    groupId: selectedGroupId ?? undefined,
    page: 0,
    size: 50,
  });

  const expenses: ExpenseResponse[] = (expensesData as Record<string, unknown>)?.content as ExpenseResponse[] ?? [];

  const createMutation = useCreateExpense({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey() });
      },
    },
  });

  const updateMutation = useUpdateExpense({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey() });
      },
    },
  });

  const deleteMutation = useDeleteExpense({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey() });
      },
    },
  });

  const isAdminOrParent = user?.familyRole === 'ADMIN' || user?.familyRole === 'PARENT';

  const handleCreate = async (data: ExpenseRequest) => {
    const result = await createMutation.mutateAsync({ data });
    return result;
  };

  const handleUpdate = async (data: ExpenseRequest) => {
    if (!editExpense?.id) throw new Error('No expense to edit');
    const result = await updateMutation.mutateAsync({ id: editExpense.id, data });
    return result;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Expenses</Typography>
        <Button variant="outlined" href="/expenses/summary">Monthly Summary</Button>
      </Box>

      {/* Balance chips */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }} data-testid="expenses-balances-row">
        {balances.map((b) => (
          <BalanceChip key={b.userId} balance={b} />
        ))}
      </Box>

      {/* Group filter tabs */}
      <Tabs
        value={selectedGroupId ?? 'all'}
        onChange={(_, v) => setSelectedGroupId(v === 'all' ? null : (v as number))}
        sx={{ mb: 2 }}
        data-testid="expenses-group-tabs"
      >
        <Tab label="All" value="all" data-testid="expenses-tab-all" />
        {(groups as ExpenseGroupResponse[]).map((g) => (
          <Tab key={g.id} label={g.name} value={g.id} data-testid={`expenses-tab-${g.id}`} />
        ))}
      </Tabs>

      {/* Expense table */}
      <TableContainer component={Paper} variant="outlined" data-testid="expenses-table">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Paid by</TableCell>
              <TableCell>Group</TableCell>
              {isAdminOrParent && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdminOrParent ? 6 : 5} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>No expenses yet</Typography>
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                  <TableCell>{expense.date}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell><CurrencyAmountDisplay expense={expense} /></TableCell>
                  <TableCell>{expense.paidBy?.displayName}</TableCell>
                  <TableCell>
                    <Chip label={expense.group?.name} size="small" />
                  </TableCell>
                  {isAdminOrParent && (
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setEditExpense(expense)}
                        data-testid={`expense-edit-btn-${expense.id}`}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error"
                        onClick={() => expense.id && deleteMutation.mutate({ id: expense.id })}
                        data-testid={`expense-delete-btn-${expense.id}`}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* FAB to add expense */}
      {isAdminOrParent && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => setAddOpen(true)}
          data-testid="expenses-add-fab"
        >
          <AddIcon />
        </Fab>
      )}

      <ExpenseForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => setAddOpen(false)}
        onSubmit={handleCreate}
        familyMembers={members}
      />

      {editExpense && (
        <ExpenseForm
          open={!!editExpense}
          onClose={() => setEditExpense(null)}
          onSuccess={() => setEditExpense(null)}
          onSubmit={handleUpdate}
          initial={editExpense}
          familyMembers={members}
        />
      )}
    </Box>
  );
}
