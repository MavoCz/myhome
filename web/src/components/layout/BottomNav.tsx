import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate, useLocation } from 'react-router';
import { modules } from '../../modules/registry';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentValue = modules.find((m) => location.pathname.startsWith(m.path))?.id ?? 'home';

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'block', md: 'none' },
        pb: 'env(safe-area-inset-bottom)',
        zIndex: (theme) => theme.zIndex.appBar,
      }}
      elevation={3}
      data-testid="bottom-nav"
    >
      <BottomNavigation
        value={currentValue}
        onChange={(_, newValue) => {
          if (newValue === 'home') {
            navigate('/home');
          } else {
            const mod = modules.find((m) => m.id === newValue);
            if (mod) navigate(mod.path);
          }
        }}
        showLabels
      >
        <BottomNavigationAction
          label="Home"
          value="home"
          icon={<HomeIcon />}
          data-testid="bottom-nav-home"
        />
        {modules.map((mod) => (
          <BottomNavigationAction
            key={mod.id}
            label={mod.name}
            value={mod.id}
            icon={mod.icon}
            data-testid={`bottom-nav-${mod.id}`}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
