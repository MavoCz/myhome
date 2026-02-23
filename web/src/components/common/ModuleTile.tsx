import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router';
import type { ReactNode } from 'react';

interface ModuleTileProps {
  name: string;
  description: string;
  icon: ReactNode;
  path: string;
  color: string;
}

export function ModuleTile({ name, description, icon, path, color }: ModuleTileProps) {
  const navigate = useNavigate();

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardActionArea
        onClick={() => navigate(path)}
        sx={{ height: '100%', p: { xs: 1, sm: 2 } }}
      >
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Box
              sx={{
                color: color,
                display: 'flex',
                fontSize: { xs: 32, sm: 40 },
                '& .MuiSvgIcon-root': { fontSize: 'inherit' },
              }}
            >
              {icon}
            </Box>
            <Typography
              variant="h6"
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
            >
              {name}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            {description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
