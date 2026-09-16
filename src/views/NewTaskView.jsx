import { useVanillaView } from '../hooks/useVanillaView';

export default function NewTaskView() {
  const ref = useVanillaView('view-newtask');
  return <div ref={ref} />;
}
