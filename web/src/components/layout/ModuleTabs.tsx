import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { useNavigate, useLocation } from 'react-router';
import { modules } from '../../modules/registry';
import { useAuth } from '../../hooks/useAuth';

export function ModuleTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const activeModule = modules.find((m) => location.pathname.startsWith(m.path));

  if (!activeModule?.menuItems?.length) return null;

  const visibleItems = activeModule.menuItems.filter((item) => {
    if (!item.roles) return true;
    return user?.familyRole && item.roles.includes(user.familyRole);
  });

  const rootLabel = activeModule.mainTabLabel ?? activeModule.name;

  // All tab paths: module root + visible menu items
  const tabPaths = [activeModule.path, ...visibleItems.map((item) => item.path)];
  const currentTab = tabPaths.includes(location.pathname) ? location.pathname : false;

  return (
    <Box
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      data-testid="module-tabs"
    >
      <Tabs
        value={currentTab}
        onChange={(_, newPath) => navigate(newPath)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ maxWidth: 'lg', mx: 'auto' }}
      >
        <Tab
          label={rootLabel}
          value={activeModule.path}
          data-testid={`module-tab-${rootLabel.toLowerCase().replace(/\s+/g, '-')}`}
        />
        {visibleItems.map((item) => (
          <Tab
            key={item.path}
            label={item.label}
            value={item.path}
            data-testid={`module-tab-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          />
        ))}
      </Tabs>
    </Box>
  );
}
