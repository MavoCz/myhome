import { useState, type FormEvent } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import IconButton from '@mui/material/IconButton';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListMembers,
  useAddMember,
  useInviteMember,
  useRemoveMember,
  useUpdateRole,
  useUpdateColor,
  getListMembersQueryKey,
} from '../../../api/generated/openAPIDefinition';
type FamilyRole = 'ADMIN' | 'PARENT' | 'CHILD';
import { useAuth } from '../../../hooks/useAuth';
import { FormField } from '../../../components/forms/FormField';
import { PasswordField } from '../../../components/forms/PasswordField';
import { MEMBER_COLORS, buildMemberColorMap } from '../../expenses/utils/memberColors';

const ROLES: FamilyRole[] = ['ADMIN', 'PARENT', 'CHILD'];

function roleColor(role: string): 'error' | 'primary' | 'default' {
  if (role === 'ADMIN') return 'error';
  if (role === 'PARENT') return 'primary';
  return 'default';
}

export function FamilyPage() {
  const { user } = useAuth();
  const isAdmin = user?.familyRole === 'ADMIN';
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useListMembers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: number; name: string } | null>(null);

  const removeMutation = useRemoveMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        setConfirmRemove(null);
      },
    },
  });

  const updateRoleMutation = useUpdateRole({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
    },
  });

  const updateColorMutation = useUpdateColor({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
    },
  });

  const colorMap = buildMemberColorMap(members);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Family Members</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setDialogOpen(true)} data-testid="family-add-member-btn">
            Add Member
          </Button>
        )}
      </Box>

      {isLoading ? (
        <Typography color="text.secondary">Loading...</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Color</TableCell>
                {isAdmin && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => {
                const isSelf = member.userId === user?.id;
                return (
                  <TableRow key={member.userId} data-testid={`family-member-row-${member.userId}`}>
                    <TableCell>{member.displayName}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {isAdmin && !isSelf ? (
                        <FormControl size="small" sx={{ minWidth: 110 }} data-testid={`family-role-select-${member.userId}`}>
                          <Select
                            value={member.role ?? 'CHILD'}
                            onChange={(e) => {
                              updateRoleMutation.mutate({
                                userId: member.userId!,
                                data: { role: e.target.value as FamilyRole },
                              });
                            }}
                          >
                            {ROLES.map((r) => (
                              <MenuItem key={r} value={r}>{r}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <Chip label={member.role} color={roleColor(member.role ?? '')} size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {MEMBER_COLORS.map((c) => {
                          const currentColor = member.userId != null ? colorMap.get(member.userId) : undefined;
                          const isSelected = currentColor === c;
                          return (
                            <Box
                              key={c}
                              onClick={() => {
                                if (member.userId != null) {
                                  updateColorMutation.mutate({ userId: member.userId, data: { color: c } });
                                }
                              }}
                              data-testid={`family-color-${member.userId}-${c.replace('#', '')}`}
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: c,
                                cursor: 'pointer',
                                border: isSelected ? '3px solid' : '2px solid transparent',
                                borderColor: isSelected ? 'text.primary' : 'transparent',
                                '&:hover': { opacity: 0.8 },
                              }}
                            />
                          );
                        })}
                      </Box>
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        {!isSelf && (
                          <IconButton
                            color="error"
                            onClick={() => setConfirmRemove({ userId: member.userId!, name: member.displayName ?? '' })}
                            data-testid={`family-delete-btn-${member.userId}`}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AddMemberDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          setDialogOpen(false);
        }}
      />

      <Dialog open={!!confirmRemove} onClose={() => setConfirmRemove(null)} data-testid="remove-confirm-dialog">
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{confirmRemove?.name}</strong> from the family?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => confirmRemove && removeMutation.mutate({ userId: confirmRemove.userId })}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function AddMemberDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');

  // Create account fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<string>('CHILD');

  // Invite fields
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('CHILD');

  const addMutation = useAddMember({
    mutation: {
      onSuccess: () => {
        resetForm();
        onSuccess();
      },
      onError: (err: unknown) => {
        const e = err as { message?: string };
        setError(e.message || 'Failed to add member');
      },
    },
  });

  const inviteMutation = useInviteMember({
    mutation: {
      onSuccess: () => {
        resetForm();
        onSuccess();
      },
      onError: (err: unknown) => {
        const e = err as { message?: string };
        setError(e.message || 'Failed to invite member');
      },
    },
  });

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setRole('CHILD');
    setInviteEmail('');
    setInviteRole('CHILD');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    addMutation.mutate({
      data: { email, password, displayName, role: role as FamilyRole },
    });
  };

  const handleInviteSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    inviteMutation.mutate({
      data: { email: inviteEmail, role: inviteRole as FamilyRole },
    });
  };

  const isPending = addMutation.isPending || inviteMutation.isPending;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth data-testid="add-member-dialog">
      <DialogTitle>Add Family Member</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }} sx={{ mb: 2 }}>
          <Tab label="Create Account" />
          <Tab label="Invite by Email" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }} data-testid="add-member-error-alert">{error}</Alert>}

        {tab === 0 ? (
          <Box component="form" id="create-form" onSubmit={handleCreateSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormField label="Email" type="email" testId="add-member-email-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <PasswordField label="Password" testId="add-member-password-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <FormField label="Display Name" testId="add-member-display-name-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            <FormControl fullWidth data-testid="add-member-role-select">
              <InputLabel>Role</InputLabel>
              <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ) : (
          <Box component="form" id="invite-form" onSubmit={handleInviteSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormField label="Email" type="email" testId="add-member-invite-email-input" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
            <FormControl fullWidth data-testid="add-member-invite-role-select">
              <InputLabel>Role</InputLabel>
              <Select value={inviteRole} label="Role" onChange={(e) => setInviteRole(e.target.value)}>
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          type="submit"
          form={tab === 0 ? 'create-form' : 'invite-form'}
          variant="contained"
          disabled={isPending}
          data-testid="add-member-submit-btn"
        >
          {isPending ? 'Adding...' : tab === 0 ? 'Create Account' : 'Send Invite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
