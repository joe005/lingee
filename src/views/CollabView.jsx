import { useVanillaView } from '../hooks/useVanillaView';

export default function CollabView() {
  const ref = useVanillaView('view-collab');
  return <div ref={ref} />;
}
