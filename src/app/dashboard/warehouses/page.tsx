import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default async function WarehousesPage() {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      zones: {
        include: {
          racks: {
            include: {
              bins: true
            }
          }
        }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Warehouses</h1>
          <p className="text-sm text-slate-500">Physical locations and storage hierarchy.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map(warehouse => {
          const totalZones = warehouse.zones.length;
          const totalRacks = warehouse.zones.reduce((acc, z) => acc + z.racks.length, 0);
          const totalBins = warehouse.zones.reduce((acc, z) => acc + z.racks.reduce((rAcc, r) => rAcc + r.bins.length, 0), 0);

          return (
            <Card key={warehouse.id} className="bg-white border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{warehouse.name}</h3>
                    <p className="text-xs text-slate-500">{warehouse.location || 'No location set'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="text-center">
                    <div className="text-xl font-medium text-slate-900">{totalZones}</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Zones</div>
                  </div>
                  <div className="text-center border-l border-r border-slate-100">
                    <div className="text-xl font-medium text-slate-900">{totalRacks}</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Racks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-medium text-slate-900">{totalBins}</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Bins</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
