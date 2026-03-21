import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import { Outlet } from 'react-router';
import { Header } from './Header';
import { ModuleTabs } from './ModuleTabs';
import { BottomNav } from './BottomNav';
import { useNotificationSSE } from '../../modules/notifications/hooks/useNotificationSSE';

export function AppShell() {
  useNotificationSSE();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <ModuleTabs />
      <Container maxWidth="lg" sx={{ flex: 1, py: 3, pb: { xs: 10, md: 3 } }}>
        <Outlet />
      </Container>
      <BottomNav />
    </Box>
  );
}
