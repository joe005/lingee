import { useVanillaView } from '../hooks/useVanillaView';

export default function ChatView() {
  const ref = useVanillaView('view-chat');
  return <div ref={ref} />;
}
