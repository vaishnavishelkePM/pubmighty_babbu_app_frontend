import BotView from 'src/sections/dashboard/bot/bots-view';

export default function BotViewPage({ params }) {
  const id = params?.id;
  return <BotView id={id} />;
}
