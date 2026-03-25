import { loadDeforestationData } from '@/lib/loadData';
import MapWrapper from '@/components/MapWrapper';

export default async function Home() {
  const data = await loadDeforestationData();

  return (
    <main className="min-h-screen">
      <MapWrapper data={data} />
    </main>
  );
}
