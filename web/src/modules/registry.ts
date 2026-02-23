import type { ReactNode } from 'react';

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  path: string;
  color: string;
}

// Module definitions will be added here as backend modules are implemented
export const modules: ModuleDefinition[] = [];
