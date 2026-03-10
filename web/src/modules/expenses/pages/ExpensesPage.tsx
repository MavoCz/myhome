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
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import IconButton from '@mui/material/IconButton';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListExpenses,
  useGetBalances,
  useListGroups,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useCreateGroup,
  useUpdateGroup,
  useArchiveGroup,
  useDeleteGroup,
  getListExpensesQueryKey,
  getGetBalancesQueryKey,
  getListGroupsQueryKey,
} from '../../../api/generated/openAPIDefinition';
import type { ExpenseGroupResponse, ExpenseResponse, ExpenseRequest } from '../../../../../common/src/api/generated/model';
import { useAuth } from '../../../hooks/useAuth';
import { BalanceChip } from '../components/BalanceChip';
import { CurrencyAmountDisplay } from '../components/CurrencyAmountDisplay';
import { ExpenseForm } from '../components/ExpenseForm';
import { ExpenseGroupForm } from '../components/ExpenseGroupForm';
import { ImportExpensesDialog } from '../ImportExpensesDialog';
import { GroupPieChart } from '../components/GroupPieChart';
import { buildMemberColorMap } from '../utils/memberColors';
import { useListMembers } from '../../../api/generated/openAPIDefinition';

export function ExpensesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pageTab, setPageTab] = useState<'expenses' | 'manage-groups'>('expenses');
  const [selectedGroupId, setSelectedGroupId] = useState<number | 'unassigned' | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseResponse | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ExpenseGroupResponse | null>(null);

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

  const createGroupMutation = useCreateGroup({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }),
    },
  });

  const updateGroupMutation = useUpdateGroup({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }),
    },
  });

  const archiveGroupMutation = useArchiveGroup({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }),
    },
  });

  const deleteGroupMutation = useDeleteGroup({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }),
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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Expenses</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
          <Button variant="outlined" href="/expenses/summary">Monthly Summary</Button>
        </Box>
      </Box>

      {/* Balance chips */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }} data-testid="expenses-balances-row">
        {balances.filter((b) => (b.totalPaidCzk ?? 0) !== 0 || (b.totalOwedCzk ?? 0) !== 0).map((b) => (
          <BalanceChip key={b.userId} balance={b} memberColor={b.userId != null ? colorMap.get(b.userId) : undefined} />
        ))}
      </Box>

      {/* Page-level tabs */}
      <Tabs
        value={pageTab}
        onChange={(_, v) => setPageTab(v)}
        sx={{ mb: 2 }}
        data-testid="expenses-page-tabs"
      >
        <Tab label="Expenses" value="expenses" data-testid="expenses-page-tab-expenses" />
        {isAdminOrParent && (
          <Tab label="Manage Groups" value="manage-groups" data-testid="expenses-page-tab-manage-groups" />
        )}
      </Tabs>

      {/* ── Expenses tab ── */}
      {pageTab === 'expenses' && (
        <>
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
                        {expense.group
                          ? <Chip label={expense.group.name} size="small" />
                          : <Chip label="Unassigned" size="small" color="warning" variant="outlined" />}
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
        </>
      )}

      {/* ── Manage Groups tab ── */}
      {pageTab === 'manage-groups' && isAdminOrParent && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateGroupOpen(true)}
              data-testid="expense-groups-add-btn"
            >
              Add Group
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" data-testid="expense-groups-table">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Allow Children</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(groups as ExpenseGroupResponse[]).map((g) => (
                  <TableRow key={g.id} data-testid={`expense-group-row-${g.id}`}>
                    <TableCell>
                      {g.name}
                      {g.isDefault && <Chip label="Default" size="small" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>{g.description}</TableCell>
                    <TableCell>
                      <Chip
                        label={g.allowChildren ? 'Allowed' : 'Restricted'}
                        color={g.allowChildren ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={g.archived ? 'Archived' : 'Active'}
                        color={g.archived ? 'default' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        title="Edit"
                        onClick={() => setEditGroup(g)}
                        data-testid={`expense-group-edit-btn-${g.id}`}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {!g.isDefault && !g.archived && (
                        <IconButton
                          size="small"
                          title="Archive"
                          onClick={() => g.id && archiveGroupMutation.mutate({ id: g.id })}
                          data-testid={`expense-group-archive-btn-${g.id}`}
                        >
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                      )}
                      {!g.isDefault && (
                        <IconButton
                          size="small"
                          color="error"
                          title="Delete (only if no expenses)"
                          onClick={() => g.id && deleteGroupMutation.mutate({ id: g.id })}
                          data-testid={`expense-group-delete-btn-${g.id}`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Create group dialog */}
          <ExpenseGroupForm
            open={createGroupOpen}
            onClose={() => setCreateGroupOpen(false)}
            onSuccess={() => setCreateGroupOpen(false)}
            onSubmit={async (data) => {
              await createGroupMutation.mutateAsync({ data });
            }}
            title="Create Expense Group"
          />

          {/* Edit group dialog */}
          {editGroup && (
            <ExpenseGroupForm
              open={!!editGroup}
              onClose={() => setEditGroup(null)}
              onSuccess={() => setEditGroup(null)}
              onSubmit={async (data) => {
                if (!editGroup.id) throw new Error('No group to edit');
                await updateGroupMutation.mutateAsync({ id: editGroup.id, data });
              }}
              initial={editGroup}
              title="Edit Expense Group"
            />
          )}
        </>
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
