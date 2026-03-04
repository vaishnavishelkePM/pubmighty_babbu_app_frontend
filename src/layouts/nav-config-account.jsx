
import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const _account = [
  { label: 'Dashboard', href: paths.dashboard.root, icon: <Iconify icon="solar:home-angle-bold-duotone" /> },
  { label: 'Account settings', href: paths.dashboard.profile.update, icon: <Iconify icon="solar:settings-bold-duotone" /> },
];
