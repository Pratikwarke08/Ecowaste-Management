import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DUSTBINS = [
  { id: 1, location: "Sector 12, Main Road", status: "Active" },
  { id: 2, location: "Sector 5, Park Lane", status: "Inactive" },
  // ...add more dustbins or fetch from backend
];

const DustbinsList = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Total Dustbins</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2">ID</th>
              <th className="text-left py-2">Location</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {DUSTBINS.map(d => (
              <tr key={d.id}>
                <td className="py-2">{d.id}</td>
                <td className="py-2">{d.location}</td>
                <td className="py-2">{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
);

export default DustbinsList;