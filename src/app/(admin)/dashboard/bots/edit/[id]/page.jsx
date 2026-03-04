
import { CONFIG } from 'src/global-config';

import EditBotPageView from 'src/sections/dashboard/bot/edit-bot-view';

export const metadata = { title: `Edit Bot - ${CONFIG.appName}` };

export default function EditBotPageViewPage() {
  return <EditBotPageView />;
}
