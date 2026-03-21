import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../theme/ThemeProvider';
import { NotificationBell } from './NotificationBell';
import { modules } from '../../modules/registry';

export function Header() {
  const { user, clearAuth } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearAuth();
    setAnchorEl(null);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, cursor: 'pointer', mr: 2 }}
          onClick={() => navigate('/home')}
        >
          Family App
        </Typography>

        {/* Desktop inline nav */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, flexGrow: 1 }}>
          <Button
            startIcon={<HomeIcon />}
            onClick={() => navigate('/home')}
            color={location.pathname === '/home' ? 'primary' : 'inherit'}
            data-testid="header-home-btn"
          >
            Home
          </Button>
          {modules.map((mod) => (
            <Button
              key={mod.id}
              startIcon={mod.icon}
              onClick={() => navigate(mod.path)}
              color={isActive(mod.path) ? 'primary' : 'inherit'}
              data-testid={`header-nav-${mod.id}`}
            >
              {mod.name}
            </Button>
          ))}
        </Box>

        {/* Mobile spacer */}
        <Box sx={{ flexGrow: 1, display: { xs: 'block', md: 'none' } }} />

        {/* Desktop right side */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
          {user && (
            <Chip
              label={`${user.displayName} (${user.familyRole})`}
              color="secondary"
              size="small"
              data-testid="header-user-chip"
            />
          )}
          <NotificationBell />
          <IconButton onClick={toggleMode} aria-label="toggle theme" data-testid="header-theme-toggle-btn">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <Button
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            data-testid="header-logout-btn"
          >
            Logout
          </Button>
        </Box>

        {/* Mobile right side */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
          <NotificationBell />
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="more options"
            data-testid="header-overflow-btn"
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            {user && (
              <MenuItem disabled>
                <ListItemText primary={user.displayName} secondary={`${user.familyRole} · ${user.familyName}`} />
              </MenuItem>
            )}
            <Divider />
            <MenuItem
              onClick={() => { toggleMode(); setAnchorEl(null); }}
              data-testid="header-overflow-theme-btn"
            >
              <ListItemIcon>{mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}</ListItemIcon>
              <ListItemText>{mode === 'dark' ? 'Light mode' : 'Dark mode'}</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={handleLogout}
              data-testid="header-overflow-logout-btn"
            >
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
