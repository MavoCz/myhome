import { useState, useEffect, type FormEvent } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FormField } from '../../../components/forms/FormField';
import type { ExpenseGroupResponse, ExpenseRequest, ExpenseResponse } from '../../../../../common/src/api/generated/model';
import { useListGroups } from '../../../api/generated/openAPIDefinition';
import { useAuth } from '../../../hooks/useAuth';

const CURRENCIES = ['CZK', 'EUR', 'PLN', 'HUF', 'RON', 'SEK', 'DKK', 'BGN', 'HRK'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (data: ExpenseRequest) => Promise<ExpenseResponse>;
  initial?: ExpenseResponse;
  familyMembers: { userId?: number; displayName?: string }[];
}

export function ExpenseForm({ open, onClose, onSuccess, onSubmit, initial, familyMembers }: Props) {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<string>('CZK');
  const [date, setDate] = useState(today);
  const [paidByUserId, setPaidByUserId] = useState<number | ''>(user?.id ?? '');
  const [groupId, setGroupId] = useState<number | null | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: groups = [] } = useListGroups();

  useEffect(() => {
    if (initial) {
      setDescription(initial.description ?? '');
      setAmount(String(initial.originalAmount ?? ''));
      setCurrency(initial.originalCurrency ?? 'CZK');
      setDate(initial.date ?? today);
      setPaidByUserId(initial.paidBy?.userId ?? '');
      setGroupId(initial.group?.id ?? null);
    } else {
      setDescription('');
      setAmount('');
      setCurrency('CZK');
      setDate(today);
      setPaidByUserId(user?.id ?? '');
      setGroupId('');
    }
    setError('');
  }, [initial, open, today, user]);

  // Auto-select default group only when creating a new expense
  useEffect(() => {
    if (!initial && !groupId && groups.length > 0) {
      const defaultGroup = groups.find((g: ExpenseGroupResponse) => g.isDefault) ?? groups[0];
      if (defaultGroup?.id) setGroupId(defaultGroup.id);
    }
  }, [groups, groupId, initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!paidByUserId) return;
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        description,
        amount: parseFloat(amount),
        currency: currency as ExpenseRequest['currency'],
        date,
        paidByUserId: paidByUserId as number,
        groupId: groupId || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth data-testid="expense-dialog">
      <DialogTitle>{initial ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && <Alert severity="error" data-testid="expense-error-alert">{error}</Alert>}

          <FormField label="Description" testId="expense-description-input" value={description}
            onChange={(e) => setDescription(e.target.value)} required />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Amount"
              type="number"
              inputProps={{ min: 0.01, step: 0.01, 'data-testid': 'expense-amount-input' }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              sx={{ flex: 1 }}
            />
            <FormControl sx={{ minWidth: 100 }} data-testid="expense-currency-select">
              <InputLabel>Currency</InputLabel>
              <Select value={currency} label="Currency" onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            slotProps={{ htmlInput: { 'data-testid': 'expense-date-input' } as Record<string, unknown> }}
          />

          <FormControl fullWidth data-testid="expense-paidby-select">
            <InputLabel>Paid by</InputLabel>
            <Select value={paidByUserId} label="Paid by"
              onChange={(e) => setPaidByUserId(e.target.value as number)}>
              {familyMembers.map((m) => (
                <MenuItem key={m.userId} value={m.userId}>{m.displayName}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth data-testid="expense-group-select">
            <InputLabel>Group</InputLabel>
            <Select value={groupId ?? ''} label="Group"
              onChange={(e) => setGroupId(e.target.value === '' ? null : e.target.value as number)}>
              <MenuItem value=""><em>None (unassigned)</em></MenuItem>
              {(groups as ExpenseGroupResponse[]).map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.name}{g.archived ? ' (archived)' : ''}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="caption" color="text.secondary">
            Splits will use the group's default configuration.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading} data-testid="expense-submit-btn">
            {loading ? 'Saving...' : initial ? 'Save Changes' : 'Add Expense'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
