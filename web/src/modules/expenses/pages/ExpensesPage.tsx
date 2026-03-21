import { useMemo, useState } from 'react';
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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
import type { ExpenseGroupResponse, ExpenseResponse, ExpenseRequest, ExpenseRequestCurrency } from '../../../../../common/src/api/generated/model';
import { useAuth } from '../../../hooks/useAuth';
import { BalanceChip } from '../components/BalanceChip';
import { CurrencyAmountDisplay } from '../components/CurrencyAmountDisplay';
import { ExpenseForm } from '../components/ExpenseForm';
import { ImportExpensesDialog } from '../ImportExpensesDialog';
import { GroupPieChart } from '../components/GroupPieChart';
import { buildMemberColorMap } from '../utils/memberColors';
import { useListMembers } from '../../../api/generated/openAPIDefinition';

export function ExpensesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<number | 'unassigned' | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseResponse | null>(null);

  const { data: groups = [] } = useListGroups();
  const { data: balances = [] } = useGetBalances();
  const { data: members = [] } = useListMembers();

  const isUnassigned = selectedGroupId === 'unassigned';
  const { data: expensesData } = useListExpenses({
    groupId: !isUnassigned && selectedGroupId !== null ? (selectedGroupId as number) : undefined,
    unassigned: isUnassigned || undefined,
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

  // Compute per-member paid totals from loaded expenses for the pie chart
  const groupPieData = useMemo(() => {
    if (selectedGroupId === null || isUnassigned) return null;
    const paidByMember = new Map<number, { displayName: string; paidCzk: number }>();
    for (const e of expenses) {
      const uid = e.paidBy?.userId;
      if (uid == null) continue;
      const existing = paidByMember.get(uid);
      const amount = Number(e.czkAmount ?? 0);
      if (existing) {
        existing.paidCzk += amount;
      } else {
        paidByMember.set(uid, { displayName: e.paidBy?.displayName ?? 'Unknown', paidCzk: amount });
      }
    }
    if (paidByMember.size <= 1) return null;
    const memberPaid = Array.from(paidByMember.entries()).map(([userId, v]) => ({
      userId,
      displayName: v.displayName,
      paidCzk: v.paidCzk,
    }));
    const total = memberPaid.reduce((sum, m) => sum + m.paidCzk, 0);
    const groupName = (groups as ExpenseGroupResponse[]).find((g) => g.id === selectedGroupId)?.name ?? 'Unknown';
    return { groupId: selectedGroupId as number, groupName, totalCzk: total, memberPaid };
  }, [expenses, selectedGroupId, isUnassigned, groups]);

  const colorMap = useMemo(() => buildMemberColorMap(members ?? []), [members]);

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

  const handleGroupChange = (expense: ExpenseResponse, newGroupId: number | '') => {
    if (!expense.id) return;
    updateMutation.mutate({
      id: expense.id,
      data: {
        description: expense.description ?? '',
        amount: Number(expense.originalAmount ?? 0),
        currency: (expense.originalCurrency ?? 'CZK') as ExpenseRequestCurrency,
        date: expense.date ?? '',
        paidByUserId: expense.paidBy?.userId ?? 0,
        groupId: newGroupId === '' ? undefined : newGroupId,
      },
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Expenses</Typography>
        {isAdminOrParent && (
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(true)}
            data-testid="import-expenses-btn"
          >
            Import
          </Button>
        )}
      </Box>

      {/* Balance chips */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }} data-testid="expenses-balances-row">
        {balances.filter((b) => (b.totalPaidCzk ?? 0) !== 0 || (b.totalOwedCzk ?? 0) !== 0).map((b) => (
          <BalanceChip key={b.userId} balance={b} memberColor={b.userId != null ? colorMap.get(b.userId) : undefined} />
        ))}
      </Box>

      {/* Group filter tabs */}
      <Tabs
        value={selectedGroupId ?? 'all'}
        onChange={(_, v) => setSelectedGroupId(v === 'all' ? null : v === 'unassigned' ? 'unassigned' : (v as number))}
        sx={{ mb: 2 }}
        data-testid="expenses-group-tabs"
      >
        <Tab label="All" value="all" data-testid="expenses-tab-all" />
        {(groups as ExpenseGroupResponse[]).map((g) => (
          <Tab key={g.id} label={g.name} value={g.id} data-testid={`expenses-tab-${g.id}`} />
        ))}
        <Tab label="Unassigned" value="unassigned" data-testid="expenses-tab-unassigned" />
      </Tabs>

      {/* Pie chart for selected group */}
      {groupPieData && (
        <Box sx={{ mb: 2, maxWidth: 400 }} data-testid="expenses-group-pie">
          <GroupPieChart
            groupId={groupPieData.groupId}
            groupName={groupPieData.groupName}
            totalCzk={groupPieData.totalCzk}
            memberPaid={groupPieData.memberPaid}
            colorMap={colorMap}
          />
        </Box>
      )}

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
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
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
                    <Select
                      value={expense.group?.id ?? ''}
                      onChange={(e) => handleGroupChange(expense, e.target.value as number | '')}
                      variant="standard"
                      size="small"
                      disabled={!expense.canEdit}
                      disableUnderline
                      displayEmpty
                      data-testid={`expense-group-select-${expense.id}`}
                      sx={{ fontSize: 'inherit' }}
                    >
                      <MenuItem value="">
                        <em>Unassigned</em>
                      </MenuItem>
                      {(groups as ExpenseGroupResponse[]).filter((g) => !g.archived).map((g) => (
                        <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => setEditExpense(expense)}
                      disabled={!expense.canEdit}
                      data-testid={`expense-edit-btn-${expense.id}`}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => expense.id && deleteMutation.mutate({ id: expense.id })}
                      disabled={!expense.canEdit}
                      data-testid={`expense-delete-btn-${expense.id}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
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

      {/* Expense create/edit dialogs */}
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

      <ImportExpensesDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        }}
      />
    </Box>
  );
}
