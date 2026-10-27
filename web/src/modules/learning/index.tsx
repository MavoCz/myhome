import SchoolIcon from '@mui/icons-material/School';
import type { ModuleDefinition } from '../registry';

export const learningModule: ModuleDefinition = {
  id: 'learning',
  name: 'Learning',
  description: "Kids' Školní zoo: progress and bonus coins",
  icon: <SchoolIcon />,
  // The kids' app itself is served at /learning/; this is the parents' overview
  path: '/learning-progress',
  color: '#2E7D32',
};

export { LearningPage } from './pages/LearningPage';
