import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { GroupMemberPaid } from '../../../../../common/src/api/generated/model';

interface GroupPieChartProps {
  groupId: number;
  groupName: string;
  totalCzk: number;
  memberPaid: GroupMemberPaid[];
  colorMap: Map<number, string>;
}

export function GroupPieChart({ groupId, groupName, totalCzk, memberPaid, colorMap }: GroupPieChartProps) {
  const data = memberPaid
    .filter((m) => (m.paidCzk ?? 0) > 0)
    .map((m) => ({
      name: m.displayName ?? 'Unknown',
      value: m.paidCzk ?? 0,
      userId: m.userId ?? 0,
    }));

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid={`summary-group-pie-${groupId}`}>
      <Typography variant="subtitle1" fontWeight="bold">{groupName}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {totalCzk.toLocaleString('cs-CZ', { minimumFractionDigits: 0 })} CZK
      </Typography>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {data.map((entry) => (
                <Cell key={entry.userId} fill={colorMap.get(entry.userId) ?? '#999'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                `${Number(value).toLocaleString('cs-CZ', { minimumFractionDigits: 0 })} CZK`
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body2" color="text.secondary">No expenses</Typography>
      )}
    </Paper>
  );
}
