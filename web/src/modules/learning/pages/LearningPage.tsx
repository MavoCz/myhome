import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useQueryClient } from '@tanstack/react-query';
import {
  getProgressQueryKey,
  getRecentGrantsQueryKey,
  useGrantCoins,
  useProgress,
  useRecentGrants,
} from '../../../api/generated/openAPIDefinition';
import type { ChildProgressResponse, CoinGrantResponse } from '../../../../../common/src/api/generated/model';
import { FormField } from '../../../components/forms/FormField';
import { useAuth } from '../../../hooks/useAuth';

const DAYS = 14;
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const EXERCISE_NAMES: Record<string, string> = {
  scitani: 'Sčítání pod sebou',
  vyjmenovana: 'Vyjmenovaná slova',
  souhlasky: 'Měkké a tvrdé i/y',
  parove: 'Párové souhlásky',
  bje: 'bě, bje, vě, vje, mě, mně',
  koncovky: 'i/y v koncovkách',
  uu: 'Ú nebo Ů',
  predpony: 's, z, vz v předponách',
  slovnidruhy: 'Slovní druhy',
  nasobilka: 'Násobilka',
};

function OpenZooButton() {
  return (
    <Button variant="contained" href="/learning/" endIcon={<OpenInNewIcon />} data-testid="learning-open-zoo-btn">
      Open Školní zoo
    </Button>
  );
}

function BonusForm({ child }: { child: ChildProgressResponse }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('10');
  const [note, setNote] = useState('');
  const grant = useGrantCoins({
    mutation: {
      onSuccess: () => {
        setNote('');
        queryClient.invalidateQueries({ queryKey: getRecentGrantsQueryKey() });
      },
    },
  });
  const value = Number(amount);
  const valid = Number.isInteger(value) && value >= 1 && value <= 1000;

  return (
    <Box
      component="form"
      sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) grant.mutate({ data: { userId: child.userId!, amount: value, note: note || undefined } });
      }}
    >
      <FormField
        label="Bonus coins"
        type="number"
        size="small"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        sx={{ width: 140 }}
        fullWidth={false}
        testId={`learning-bonus-amount-${child.userId}`}
      />
      <FormField
        label="Note for the child"
        size="small"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        sx={{ flex: 1, minWidth: 180 }}
        fullWidth={false}
        slotProps={{ htmlInput: { maxLength: 255 } }}
        testId={`learning-bonus-note-${child.userId}`}
      />
      <Button type="submit" variant="outlined" disabled={!valid || grant.isPending} data-testid={`learning-bonus-btn-${child.userId}`}>
        Give coins
      </Button>
      {grant.isSuccess && (
        <Typography variant="body2" color="success.main" data-testid={`learning-bonus-sent-${child.userId}`}>
          Sent. It shows up next time the zoo opens.
        </Typography>
      )}
    </Box>
  );
}

function ChildCard({ child }: { child: ChildProgressResponse }) {
  const days = child.days ?? [];
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }} data-testid={`learning-child-${child.userId}`}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="h6" sx={{ mr: 1 }}>
          {child.displayName}
        </Typography>
        {child.coins != null && (
          <Chip label={`${child.coins} coins`} color="primary" size="small" data-testid={`learning-child-coins-${child.userId}`} />
        )}
        {child.earned != null && <Chip label={`${child.earned} earned in total`} size="small" variant="outlined" />}
      </Stack>

      {child.coins == null ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Hasn't opened the zoo yet. They need the <b>learning</b> module on the Family page, then sign them in on the
          tablet.
        </Typography>
      ) : days.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No exercises in the last {DAYS} days.
        </Typography>
      ) : (
        <TableContainer sx={{ mb: 2 }}>
          <Table size="small" data-testid={`learning-child-days-${child.userId}`}>
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Exercise</TableCell>
                <TableCell align="right">Finished</TableCell>
                <TableCell align="right">Coins</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {days.map((d) => (
                <TableRow key={`${d.date}-${d.exercise}`}>
                  <TableCell>{d.date && new Date(`${d.date}T12:00:00`).toLocaleDateString()}</TableCell>
                  <TableCell>{EXERCISE_NAMES[d.exercise ?? ''] ?? d.exercise}</TableCell>
                  <TableCell align="right">{d.count}</TableCell>
                  <TableCell align="right">{d.coins}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {child.coins != null && <BonusForm child={child} />}
    </Paper>
  );
}

function RecentGrants({ grants, children }: { grants: CoinGrantResponse[]; children: ChildProgressResponse[] }) {
  if (!grants.length) return null;
  const name = (userId?: number) => children.find((c) => c.userId === userId)?.displayName ?? '—';
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Recent bonus coins
      </Typography>
      <TableContainer component={Paper} variant="outlined" data-testid="learning-grants-table">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Child</TableCell>
              <TableCell align="right">Coins</TableCell>
              <TableCell>Note</TableCell>
              <TableCell>Given</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grants.map((g) => (
              <TableRow key={g.id} data-testid={`learning-grant-row-${g.id}`}>
                <TableCell>{name(g.userId)}</TableCell>
                <TableCell align="right">{g.amount}</TableCell>
                <TableCell>{g.note}</TableCell>
                <TableCell>{g.createdAt && new Date(g.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={g.claimedAt ? 'Received' : 'Waiting'}
                    color={g.claimedAt ? 'success' : 'default'}
                    variant={g.claimedAt ? 'filled' : 'outlined'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export function LearningPage() {
  const { user } = useAuth();
  const isParent = user?.familyRole === 'ADMIN' || user?.familyRole === 'PARENT';
  const params = { days: DAYS, timezone: TIMEZONE };
  // children may open this page too; the progress endpoints are for parents only
  const progress = useProgress(params, { query: { enabled: isParent, queryKey: getProgressQueryKey(params) } });
  const grants = useRecentGrants({ query: { enabled: isParent, queryKey: getRecentGrantsQueryKey() } });
  const children = progress.data ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4">Learning</Typography>
        <OpenZooButton />
      </Box>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {isParent
          ? `What the kids practised in Školní zoo over the last ${DAYS} days.`
          : 'Exercises and your zoo are in Školní zoo.'}
      </Typography>

      {isParent && progress.isError && <Alert severity="error">Could not load the progress.</Alert>}
      {isParent && progress.isSuccess && children.length === 0 && (
        <Alert severity="info">No children in the family yet. Add them on the Family page as CHILD members.</Alert>
      )}

      <Stack spacing={2}>
        {children.map((child) => (
          <ChildCard key={child.userId} child={child} />
        ))}
      </Stack>

      {isParent && <RecentGrants grants={grants.data ?? []} children={children} />}
    </Box>
  );
}
