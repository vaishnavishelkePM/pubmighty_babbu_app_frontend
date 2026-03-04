import { CONFIG } from 'src/global-config';

import { DashboardView } from 'src/sections/dashboard/dashboard-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function DashboardPage() {
  return <DashboardView />;
}
