import { useVanillaView } from '../hooks/useVanillaView';

export default function SettingsView() {
  const ref = useVanillaView('view-settings');
  return <div ref={ref} />;
}
