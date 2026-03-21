import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../theme/ThemeProvider';
import { NotificationBell } from './NotificationBell';
import { modules } from '../../modules/registry';

export function Header() {
  const { user, clearAuth } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearAuth();
    setDrawerOpen(false);
  };

  // Find the active module based on current path
  const activeModule = modules.find((m) => location.pathname.startsWith(m.path));
  const visibleMenuItems = activeModule?.menuItems?.filter((item) => {
    if (!item.roles) return true;
    return user?.familyRole && item.roles.includes(user.familyRole);
  }) ?? [];

  const drawerContent = (
    <Box sx={{ width: 280, p: 2 }}>
      {user && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip label={user.familyRole} color="secondary" size="small" />
            <Typography variant="h6">{user.displayName}</Typography>
          </Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, cursor: 'pointer' }}
            onClick={() => { navigate('/family'); setDrawerOpen(false); }}
            data-testid="header-mobile-family-info"
          >
            <PeopleIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {user.familyName}
            </Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />
        </>
      )}
      <List>
        <ListItem component="button" onClick={() => { navigate('/home'); setDrawerOpen(false); }} sx={{ cursor: 'pointer', border: 'none', background: 'none', width: '100%' }} data-testid="header-mobile-home-btn">
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Home" />
        </ListItem>

        {/* Module-specific menu items */}
        {activeModule && visibleMenuItems.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
              {activeModule.name}
            </Typography>
            {visibleMenuItems.map((item) => (
              <ListItem
                key={item.path}
                component="button"
                onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                selected={location.pathname === item.path}
                sx={{ cursor: 'pointer', border: 'none', background: 'none', width: '100%' }}
                data-testid={`header-menu-${item.path.replace(/\//g, '-').slice(1)}`}
              >
                {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                <ListItemText primary={item.label} />
              </ListItem>
            ))}
          </>
        )}

        <Divider sx={{ my: 1 }} />
        <ListItem component="button" onClick={toggleMode} sx={{ cursor: 'pointer', border: 'none', background: 'none', width: '100%' }} data-testid="header-mobile-theme-btn">
          <ListItemIcon>{mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}</ListItemIcon>
          <ListItemText primary={mode === 'dark' ? 'Light mode' : 'Dark mode'} />
        </ListItem>
        <ListItem component="button" onClick={handleLogout} sx={{ cursor: 'pointer', border: 'none', background: 'none', width: '100%' }} data-testid="header-mobile-logout-btn">
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );

  if (isMobile) {
    return (
      <>
        <AppBar position="sticky" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Family App
            </Typography>
            <NotificationBell />
            <IconButton onClick={() => setDrawerOpen(true)} aria-label="menu" data-testid="header-menu-btn">
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {drawerContent}
        </Drawer>
      </>
    );
  }

  return (
    <>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Family App
          </Typography>
          <IconButton onClick={() => navigate('/home')} aria-label="home" data-testid="header-home-btn">
            <HomeIcon />
          </IconButton>
          {user && (
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
              onClick={() => navigate('/family')}
              data-testid="header-family-info"
            >
              <Chip label={user.familyRole} color="secondary" size="small" />
              <Typography variant="body1">{user.displayName}</Typography>
              <PeopleIcon fontSize="small" color="action" />
            </Box>
          )}
          <NotificationBell />
          <IconButton onClick={() => setDrawerOpen(true)} aria-label="menu" sx={{ ml: 1 }} data-testid="header-menu-btn">
            <MenuIcon />
          </IconButton>
          <IconButton onClick={toggleMode} sx={{ ml: 1 }} aria-label="toggle theme" data-testid="header-theme-toggle-btn">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <Button
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{ ml: 1 }}
            data-testid="header-logout-btn"
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {drawerContent}
      </Drawer>
    </>
  );
}
