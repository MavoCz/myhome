import { useState, type FormEvent } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { FormField } from '../../../components/forms/FormField';
import type { ExpenseGroupResponse } from '../../../../../common/src/api/generated/model';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
  initial?: ExpenseGroupResponse;
  title: string;
}

export function ExpenseGroupForm({ open, onClose, onSuccess, onSubmit, initial, title }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({ name, description });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth data-testid="expense-group-dialog">
      <DialogTitle>{title}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && <Alert severity="error" data-testid="expense-group-error">{error}</Alert>}
          <FormField label="Name" testId="expense-group-name-input" value={name} onChange={(e) => setName(e.target.value)} required />
          <FormField label="Description" testId="expense-group-desc-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading} data-testid="expense-group-submit-btn">
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
