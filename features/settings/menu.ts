export interface SettingsMenuItem {
  label: string;
  description: string;
  route: string;
}

export const settingsMenuItems: SettingsMenuItem[] = [
  {
    label: 'Custom Field Management',
    description: 'Manage dynamic fields used in station forms and filters.',
    route: '/settings/custom-fields',
  },
];
