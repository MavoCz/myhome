import { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import { useImportExpenses } from '../../api/generated/openAPIDefinition';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportExpensesDialog({ open, onClose, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const importMutation = useImportExpenses({
    mutation: {
      onSuccess: (result) => {
        setResult(result);
        onSuccess();
      },
      onError: (err: unknown) => {
        const e = err as { message?: string };
        setError(e.message || 'Import failed');
      },
    },
  });

  const [result, setResult] = useState<{
    imported?: number; skipped?: number; failed?: number; errors?: string[];
  } | null>(null);

  const handleSubmit = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a CSV file');
      return;
    }
    setError('');
    setResult(null);
    importMutation.mutate({ data: { file }, params: { source: 'RAIFFEISEN' } });
  };

  const handleClose = () => {
    setError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth data-testid="import-dialog">
      <DialogTitle>Import Expenses from CSV</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Select a Raiffeisen bank CSV export file. Only outgoing transactions will be imported.
            Duplicates are automatically detected and skipped.
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            data-testid="import-file-input"
            style={{ display: 'block' }}
          />
        </Box>

        {result && (
          <Box>
            <Alert severity={result.failed ? 'warning' : 'success'}>
              Imported {result.imported ?? 0}, skipped {result.skipped ?? 0} duplicates/incoming,
              failed {result.failed ?? 0}
            </Alert>
            {result.errors && result.errors.length > 0 && (
              <List dense sx={{ mt: 1 }}>
                {result.errors.map((e, i) => (
                  <ListItem key={i}>
                    <Typography variant="caption" color="error">{e}</Typography>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={importMutation.isPending}
          data-testid="import-submit-btn"
        >
          {importMutation.isPending ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
