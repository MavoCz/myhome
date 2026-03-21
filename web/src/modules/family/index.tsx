import PeopleIcon from '@mui/icons-material/People';
import type { ModuleDefinition } from '../registry';

export const familyModule: ModuleDefinition = {
  id: 'family',
  name: 'Family',
  description: 'Manage family members and settings',
  icon: <PeopleIcon />,
  path: '/family',
  color: '#7B1FA2',
};
