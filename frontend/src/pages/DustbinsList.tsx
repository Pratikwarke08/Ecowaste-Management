import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

interface Dustbin {
  _id: string;
  name: string;
  sector?: string;
  status: string;
  fillLevel: number;
}

const DustbinsList = () => {
  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/dustbins');
        const data = await res.json();
        setDustbins(data);
      } catch (err) {
        const error = err as Error & { message?: string };
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registered Dustbins</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading dustbins...</div>
          ) : dustbins.length === 0 ? (
            <div className="text-sm text-muted-foreground">No dustbins have been added yet.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Sector</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Fill Level</th>
                </tr>
              </thead>
              <tbody>
                {dustbins.map((dustbin) => (
                  <tr key={dustbin._id} className="border-t">
                    <td className="py-2">{dustbin._id.slice(-6)}</td>
                    <td className="py-2">{dustbin.name}</td>
                    <td className="py-2">{dustbin.sector || '—'}</td>
                    <td className="py-2 capitalize">{dustbin.status}</td>
                    <td className="py-2">{dustbin.fillLevel}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DustbinsList;