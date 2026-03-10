import { useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { useGetMonthlySummary, useListMembers } from '../../../api/generated/openAPIDefinition';
import { GroupPieChart } from '../components/GroupPieChart';
import { buildMemberColorMap } from '../utils/memberColors';

export function ExpenseSummaryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: summary, isLoading } = useGetMonthlySummary({ year, month });
  const { data: members = [] } = useListMembers();

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const colorMap = useMemo(() => buildMemberColorMap(members), [members]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Monthly Summary</Typography>

      {/* Month picker */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }} data-testid="summary-month-picker">
        <TextField
          label="Year"
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          size="small"
          sx={{ width: 100 }}
          slotProps={{ htmlInput: { 'data-testid': 'summary-year-input' } as Record<string, unknown> }}
        />
        <TextField
          label="Month"
          type="number"
          value={month}
          onChange={(e) => setMonth(Math.max(1, Math.min(12, Number(e.target.value))))}
          size="small"
          sx={{ width: 90 }}
          slotProps={{ htmlInput: { min: 1, max: 12, 'data-testid': 'summary-month-input' } as Record<string, unknown> }}
        />
        <Typography variant="h6">{monthLabel}</Typography>
      </Box>

      {isLoading ? (
        <Typography color="text.secondary">Loading...</Typography>
      ) : !summary ? (
        <Typography color="text.secondary">No data for this month</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Total */}
          <Paper sx={{ p: 3 }} variant="outlined" data-testid="summary-total-card">
            <Typography variant="overline">Total Spend</Typography>
            <Typography variant="h4">
              {Number(summary.totalCzk ?? 0).toLocaleString('cs-CZ', { minimumFractionDigits: 0 })} CZK
            </Typography>
          </Paper>

          {/* Pie charts per group */}
          {summary.byGroup && summary.byGroup.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Spending by Group</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {summary.byGroup.map((g) => (
                  <GroupPieChart
                    key={g.groupId}
                    groupId={g.groupId ?? 0}
                    groupName={g.groupName ?? 'Unknown'}
                    totalCzk={g.totalCzk ?? 0}
                    memberPaid={g.memberPaid ?? []}
                    colorMap={colorMap}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Settlement plan */}
          {summary.settlementPlan && summary.settlementPlan.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>Settlement Plan</Typography>
              <Paper variant="outlined" data-testid="summary-settlement-list">
                <List dense>
                  {summary.settlementPlan.map((s, i) => (
                    <ListItem key={i} data-testid={`summary-settlement-${i}`}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight="bold">{s.fromDisplayName}</Typography>
                            <ArrowForwardIcon fontSize="small" />
                            <Typography fontWeight="bold">{s.toDisplayName}</Typography>
                            <Typography color="primary.main">
                              {Number(s.amountCzk ?? 0).toLocaleString('cs-CZ', { minimumFractionDigits: 0 })} CZK
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          )}

          {summary.settlementPlan?.length === 0 && (
            <Typography color="success.main">All balances are settled for this month</Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
