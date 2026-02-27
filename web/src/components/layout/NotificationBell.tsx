import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CircleIcon from '@mui/icons-material/Circle';
import { useNotificationStore } from '../../stores/notificationStore';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../modules/notifications/api/notificationApi';

export function NotificationBell() {
  const { notifications, unreadCount } = useNotificationStore();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id: number) => {
    useNotificationStore.getState().markAsRead(id);
    try {
      await markNotificationAsRead(id);
    } catch {
      // Optimistic update already applied
    }
  };

  const handleMarkAllAsRead = async () => {
    useNotificationStore.getState().markAllAsRead();
    try {
      await markAllNotificationsAsRead();
    } catch {
      // Optimistic update already applied
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <>
      <IconButton onClick={handleOpen} aria-label="notifications" data-testid="notif-bell-btn">
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 360, maxHeight: 480 },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
          }}
        >
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllAsRead} data-testid="notif-mark-all-read-btn">
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsIcon
              sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ overflow: 'auto', maxHeight: 400 }}>
            {notifications.map((notification) => (
              <ListItemButton
                key={notification.id}
                data-testid={`notif-item-${notification.id}`}
                onClick={() => {
                  if (!notification.read) {
                    handleMarkAsRead(notification.id);
                  }
                }}
                sx={{
                  alignItems: 'flex-start',
                  bgcolor: notification.read
                    ? 'transparent'
                    : 'action.hover',
                }}
              >
                {!notification.read && (
                  <CircleIcon
                    sx={{
                      fontSize: 8,
                      color: 'primary.main',
                      mt: 1.2,
                      mr: 1,
                      flexShrink: 0,
                    }}
                  />
                )}
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <>
                      {notification.message}
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ display: 'block', mt: 0.5 }}
                        color="text.disabled"
                      >
                        {formatTime(notification.createdAt)}
                      </Typography>
                    </>
                  }
                  sx={{ ml: notification.read ? 2.5 : 0 }}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: notification.read ? 400 : 600,
                  }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
