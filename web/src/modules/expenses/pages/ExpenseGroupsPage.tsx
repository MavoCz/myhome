import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListGroups,
  useCreateGroup,
  useArchiveGroup,
  useDeleteGroup,
  getListGroupsQueryKey,
} from '../../../api/generated/openAPIDefinition';
import type { ExpenseGroupResponse } from '../../../../../common/src/api/generated/model';
import { useAuth } from '../../../hooks/useAuth';
import { ExpenseGroupForm } from '../components/ExpenseGroupForm';

export function ExpenseGroupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: groups = [] } = useListGroups();

  const createMutation = useCreateGroup({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }),
    },
  });

  const archiveMutation = useArchiveGroup({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }),
    },
  });

  const deleteMutation = useDeleteGroup({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }),
    },
  });

  const isAdmin = user?.familyRole === 'ADMIN';

  if (!isAdmin) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 2 }}>Expense Groups</Typography>
        <Typography color="text.secondary">Only admins can manage expense groups.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Expense Groups</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
          data-testid="expense-groups-add-btn">
          Add Group
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" data-testid="expense-groups-table">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
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
                    label={g.archived ? 'Archived' : 'Active'}
                    color={g.archived ? 'default' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {!g.isDefault && !g.archived && (
                    <IconButton
                      size="small"
                      title="Archive"
                      onClick={() => g.id && archiveMutation.mutate({ id: g.id })}
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
                      onClick={() => g.id && deleteMutation.mutate({ id: g.id })}
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

      <ExpenseGroupForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => setCreateOpen(false)}
        onSubmit={async (data) => {
          await createMutation.mutateAsync({ data: { name: data.name, description: data.description } });
        }}
        title="Create Expense Group"
      />
    </Box>
  );
}
