import { useMemo, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAccess,
  useGrantAccess,
  useUpdateAccess,
  useRevokeAccess,
  getListAccessQueryKey,
} from '../../../api/generated/openAPIDefinition';
import type { FamilyMemberResponse, ModuleAccessResponse } from '../../../../../common/src/api/generated/model';
import { FormField } from '../../../components/forms/FormField';
import {
  DAYS,
  PERMISSIONS,
  browserTimeZone,
  describeError,
  formatSchedules,
  formatValidity,
  fromLocalInput,
  grantableModules,
  groupSchedules,
  isValidTimeZone,
  moduleLabel,
  toLocalInput,
  toScheduleRequests,
  type Permission,
  type ScheduleWindow,
} from '../utils/moduleAccess';

interface ModuleAccessDialogProps {
  member: FamilyMemberResponse | null;
  onClose: () => void;
}

/** Admin-only dialog listing a member's module grants, with grant / edit / revoke. */
export function ModuleAccessDialog({ member, onClose }: ModuleAccessDialogProps) {
  const userId = member?.userId;
  const queryClient = useQueryClient();
  const params = { userId: userId ?? 0 };
  const queryKey = getListAccessQueryKey(params);
  const { data: grants = [], isLoading, isError, error: loadError } = useListAccess(params, {
    query: { enabled: userId != null, queryKey },
  });

  // null = list view; 'new' = grant form; a grant = edit form
  const [editing, setEditing] = useState<ModuleAccessResponse | 'new' | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<ModuleAccessResponse | null>(null);
  const [error, setError] = useState('');

  const revokeMutation = useRevokeAccess({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
        setConfirmRevoke(null);
      },
      onError: (err: unknown) => {
        setConfirmRevoke(null);
        setError(describeError(err, 'Could not revoke access'));
      },
    },
  });

  const handleClose = () => {
    setEditing(null);
    setConfirmRevoke(null);
    setError('');
    onClose();
  };

  const canGrantMore = grantableModules().some((m) =>
    PERMISSIONS.some((p) => !grants.some((g) => g.moduleName === m.id && g.permission === p.value)),
  );

  return (
    <Dialog open={!!member} onClose={handleClose} maxWidth="md" fullWidth data-testid="module-access-dialog">
      <DialogTitle>Module access: {member?.displayName}</DialogTitle>
      <DialogContent>
        {member?.role === 'PARENT' && (
          <Alert severity="info" sx={{ mb: 2 }} data-testid="module-access-parent-info">
            Parents can use every module without grants. Grants only take effect if this member becomes a child.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')} data-testid="module-access-error-alert">
            {error}
          </Alert>
        )}

        {editing && member ? (
          <ModuleAccessForm
            key={editing === 'new' ? 'new' : editing.id}
            userId={member.userId!}
            grant={editing === 'new' ? null : editing}
            existing={grants}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey });
              setEditing(null);
              setError('');
            }}
          />
        ) : isLoading ? (
          <Typography color="text.secondary">Loading...</Typography>
        ) : isError ? (
          <Alert severity="error" data-testid="module-access-load-error">
            {describeError(loadError, 'Could not load module access')}
          </Alert>
        ) : grants.length === 0 ? (
          <Typography color="text.secondary" data-testid="module-access-empty">
            No module access granted yet. Children can only use modules they have been granted.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Module</TableCell>
                  <TableCell>Permission</TableCell>
                  <TableCell>Valid</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grants.map((g) => {
                  const schedule = formatSchedules(g.schedules);
                  return (
                    <TableRow key={g.id} data-testid={`module-access-row-${g.id}`}>
                      <TableCell data-testid={`module-access-module-${g.id}`}>{moduleLabel(g.moduleName)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={g.permission}
                          color={g.permission === 'MANAGE' ? 'primary' : 'default'}
                          data-testid={`module-access-permission-${g.id}`}
                        />
                      </TableCell>
                      <TableCell data-testid={`module-access-validity-${g.id}`}>{formatValidity(g)}</TableCell>
                      <TableCell data-testid={`module-access-schedule-${g.id}`}>
                        {schedule.length === 0 ? 'Any time' : schedule.map((line) => <div key={line}>{line}</div>)}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton
                          size="small"
                          aria-label="Edit access"
                          onClick={() => {
                            setError('');
                            setEditing(g);
                          }}
                          data-testid={`module-access-edit-btn-${g.id}`}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="Revoke access"
                          onClick={() => setConfirmRevoke(g)}
                          data-testid={`module-access-revoke-btn-${g.id}`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      {!editing && (
        <DialogActions>
          <Button onClick={handleClose} data-testid="module-access-close-btn">
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={isLoading || isError || !canGrantMore}
            onClick={() => {
              setError('');
              setEditing('new');
            }}
            data-testid="module-access-grant-btn"
          >
            Grant Access
          </Button>
        </DialogActions>
      )}

      <Dialog open={!!confirmRevoke} onClose={() => setConfirmRevoke(null)} data-testid="module-access-revoke-dialog">
        <DialogTitle>Revoke Access</DialogTitle>
        <DialogContent>
          <Typography>
            Revoke <strong>{confirmRevoke?.permission}</strong> access to{' '}
            <strong>{moduleLabel(confirmRevoke?.moduleName)}</strong> for {member?.displayName}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRevoke(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={revokeMutation.isPending}
            onClick={() => confirmRevoke?.id != null && revokeMutation.mutate({ id: confirmRevoke.id })}
            data-testid="module-access-revoke-confirm-btn"
          >
            {revokeMutation.isPending ? 'Revoking...' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

interface ModuleAccessFormProps {
  userId: number;
  /** null when granting a new module */
  grant: ModuleAccessResponse | null;
  /** The member's current grants, used to avoid offering duplicates */
  existing: ModuleAccessResponse[];
  onCancel: () => void;
  onSaved: () => void;
}

const TIME_ZONES: string[] = (() => {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const browser = browserTimeZone();
  return zones.includes(browser) ? zones : [browser, ...zones];
})();

function ModuleAccessForm({ userId, grant, existing, onCancel, onSaved }: ModuleAccessFormProps) {
  const isEdit = grant != null;
  const others = existing.filter((g) => g.id !== grant?.id);
  const taken = (moduleName: string, permission: Permission) =>
    others.some((g) => g.moduleName === moduleName && g.permission === permission);

  const moduleOptions = grantableModules().filter(
    (m) => isEdit || PERMISSIONS.some((p) => !taken(m.id, p.value)),
  );
  const initialModule = grant?.moduleName ?? moduleOptions[0]?.id ?? '';
  const initialPermission =
    (grant?.permission as Permission | undefined) ??
    PERMISSIONS.find((p) => !taken(initialModule, p.value))?.value ??
    'ACCESS';
  const initialGroups = useMemo(() => groupSchedules(grant?.schedules), [grant]);

  const [moduleName, setModuleName] = useState(initialModule);
  const [permission, setPermission] = useState<Permission>(initialPermission);
  const [validFrom, setValidFrom] = useState(toLocalInput(grant?.validFrom));
  const [validUntil, setValidUntil] = useState(toLocalInput(grant?.validUntil));
  const [windows, setWindows] = useState<ScheduleWindow[]>(
    initialGroups.map(({ days, start, end }) => ({ days, start, end })),
  );
  const [timezone, setTimezone] = useState(initialGroups[0]?.timezone ?? browserTimeZone());
  const [error, setError] = useState('');

  const mixedTimezones = new Set(initialGroups.map((g) => g.timezone)).size > 1;

  const grantMutation = useGrantAccess({
    mutation: { onSuccess: onSaved, onError: (err: unknown) => setError(describeError(err, 'Could not grant access')) },
  });
  const updateMutation = useUpdateAccess({
    mutation: { onSuccess: onSaved, onError: (err: unknown) => setError(describeError(err, 'Could not update access')) },
  });
  const isPending = grantMutation.isPending || updateMutation.isPending;

  const changeModule = (next: string) => {
    setModuleName(next);
    if (taken(next, permission)) {
      const free = PERMISSIONS.find((p) => !taken(next, p.value));
      if (free) setPermission(free.value);
    }
  };

  const updateWindow = (index: number, patch: Partial<ScheduleWindow>) =>
    setWindows((ws) => ws.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  const validate = (): string | null => {
    if (!moduleName) return 'Choose a module.';
    if (taken(moduleName, permission)) {
      return `This member already has ${permission} access to ${moduleLabel(moduleName)}.`;
    }
    if (validFrom && validUntil && new Date(validFrom) >= new Date(validUntil)) {
      return '"Valid until" must be after "Valid from".';
    }
    for (const w of windows) {
      if (w.days.length === 0) return 'Each schedule needs at least one day.';
      if (!w.start || !w.end) return 'Each schedule needs a start and end time.';
      if (w.end <= w.start) return 'A schedule must end after it starts (windows cannot cross midnight).';
    }
    if (windows.length > 0 && !isValidTimeZone(timezone)) return 'Choose a valid timezone.';
    return null;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    const common = {
      permission,
      validFrom: fromLocalInput(validFrom),
      validUntil: fromLocalInput(validUntil),
      schedules: toScheduleRequests(windows, timezone),
    };
    if (isEdit) {
      // The backend replaces validity and schedules wholesale; an empty schedule list clears them.
      updateMutation.mutate({ id: grant.id!, data: common });
    } else {
      grantMutation.mutate({ data: { userId, moduleName, ...common } });
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
      data-testid="module-access-form"
    >
      <Typography variant="subtitle1">{isEdit ? `Edit ${moduleLabel(moduleName)} access` : 'Grant access'}</Typography>

      {error && (
        <Alert severity="error" data-testid="module-access-form-error">
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200, flex: 1 }} disabled={isEdit} data-testid="module-access-module-select">
          <InputLabel>Module</InputLabel>
          <Select value={moduleName} label="Module" onChange={(e) => changeModule(e.target.value)}>
            {(isEdit ? [{ id: moduleName, name: moduleLabel(moduleName) }] : moduleOptions).map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200, flex: 1 }} data-testid="module-access-permission-select">
          <InputLabel>Permission</InputLabel>
          <Select value={permission} label="Permission" onChange={(e) => setPermission(e.target.value as Permission)}>
            {PERMISSIONS.map((p) => (
              <MenuItem key={p.value} value={p.value} disabled={taken(moduleName, p.value)}>
                {p.label}
                {p.value === 'MANAGE' ? ' (includes access)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormField
          label="Valid from (optional)"
          type="datetime-local"
          testId="module-access-valid-from-input"
          value={validFrom}
          onChange={(e) => setValidFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <FormField
          label="Valid until (optional)"
          type="datetime-local"
          testId="module-access-valid-until-input"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: 1, minWidth: 200 }}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2">Weekly schedule</Typography>
        <Typography variant="body2" color="text.secondary">
          {windows.length === 0
            ? 'No schedule: the module can be used at any time within the validity window.'
            : 'The module can only be used during these windows.'}
        </Typography>
      </Box>

      {windows.map((w, i) => (
        <Box
          key={i}
          sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}
          data-testid={`module-access-window-${i}`}
        >
          <ToggleButtonGroup
            size="small"
            value={w.days}
            onChange={(_, days: number[]) => updateWindow(i, { days })}
            aria-label="Days of week"
          >
            {DAYS.map((d) => (
              <ToggleButton key={d.value} value={d.value} data-testid={`module-access-window-day-${i}-${d.value}`}>
                {d.short}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <FormField
            label="From"
            type="time"
            size="small"
            testId={`module-access-window-start-input-${i}`}
            value={w.start}
            onChange={(e) => updateWindow(i, { start: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 130 }}
          />
          <FormField
            label="To"
            type="time"
            size="small"
            testId={`module-access-window-end-input-${i}`}
            value={w.end}
            onChange={(e) => updateWindow(i, { end: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 130 }}
          />
          <IconButton
            aria-label="Remove schedule"
            onClick={() => setWindows((ws) => ws.filter((_, j) => j !== i))}
            data-testid={`module-access-window-remove-btn-${i}`}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      ))}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setWindows((ws) => [...ws, { days: [1, 2, 3, 4, 5], start: '15:00', end: '18:00' }])}
          data-testid="module-access-add-window-btn"
        >
          Add schedule
        </Button>
        {windows.length > 0 && (
          <Autocomplete
            options={TIME_ZONES}
            value={timezone}
            disableClearable
            onChange={(_, tz) => setTimezone(tz)}
            sx={{ minWidth: 260, flex: 1 }}
            size="small"
            renderInput={(params) => (
              <TextField
                {...params}
                label="Timezone"
                inputProps={{ ...params.inputProps, 'data-testid': 'module-access-timezone-input' }}
              />
            )}
          />
        )}
      </Box>
      {mixedTimezones && (
        <Alert severity="warning">
          This grant had schedules in several timezones; saving applies the selected timezone to all of them.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onCancel} data-testid="module-access-form-cancel-btn">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={isPending} data-testid="module-access-form-submit-btn">
          {isPending ? 'Saving...' : isEdit ? 'Save' : 'Grant'}
        </Button>
      </Box>
    </Box>
  );
}
