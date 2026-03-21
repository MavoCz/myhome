import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
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
import ArchiveIcon from '@mui/icons-material/Archive';
import IconButton from '@mui/material/IconButton';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListGroups,
  useCreateGroup,
  useUpdateGroup,
  useArchiveGroup,
  useDeleteGroup,
  getListGroupsQueryKey,
} from '../../../api/generated/openAPIDefinition';
import type { ExpenseGroupResponse } from '../../../../../common/src/api/generated/model';
import { ExpenseGroupForm } from '../components/ExpenseGroupForm';

export function ManageGroupsPage() {
  const queryClient = useQueryClient();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ExpenseGroupResponse | null>(null);

  const { data: groups = [] } = useListGroups();

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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Manage Groups</Typography>
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
    </Box>
  );
}
