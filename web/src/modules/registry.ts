import type { ReactNode } from 'react';

export interface ModuleMenuItem {
  label: string;
  path: string;
  icon?: ReactNode;
  /** Only show this item for users with these family roles */
  roles?: string[];
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  path: string;
  color: string;
  /** Label for the root page tab (defaults to module name if not set) */
  mainTabLabel?: string;
  /** Additional navigation items shown as tabs when this module is active */
  menuItems?: ModuleMenuItem[];
}

// Module definitions will be added here as backend modules are implemented
export const modules: ModuleDefinition[] = [];
