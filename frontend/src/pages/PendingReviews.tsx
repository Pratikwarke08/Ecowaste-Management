import Navigation from '@/components/layout/Navigation';

const PENDING = [
  { id: 101, collector: "Raj", date: "2024-06-01", status: "Pending" },
  // ...more pending reviews
];

const PendingReviews = () => (
  <div className="min-h-screen bg-background">
    <Navigation userRole="employee" />
    <main className="lg:ml-64 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-eco rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Pending Reviews</h1>
          <p className="text-white/90">All collections awaiting review</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Collector</th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {PENDING.map(item => (
                <tr key={item.id}>
                  <td className="p-2">{item.id}</td>
                  <td className="p-2">{item.collector}</td>
                  <td className="p-2">{item.date}</td>
                  <td className="p-2">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
);

export default PendingReviews;