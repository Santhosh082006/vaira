import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, ArrowUpRight, AlertTriangle, MapPin, Activity, ShoppingCart } from 'lucide-react';
import { InventoryChart } from '@/components/dashboard/inventory-chart';
import { calculateDynamicReorderPoints } from '@/lib/services/demandForecasting';

export default async function DashboardPage() {
  const productsCount = await prisma.product.count();
  const warehousesCount = await prisma.warehouse.count();
  const forecasts = await calculateDynamicReorderPoints();
  const reorderCandidates = forecasts.filter(f => f.status === 'REORDER_NOW' || f.status === 'CRITICAL');
  const lowStockCount = reorderCandidates.length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentAnomaliesCount = await prisma.inventoryTransaction.count({
    where: {
      reason: { in: ['DAMAGED', 'MANUAL_ADJUST'] },
      createdAt: { gte: sevenDaysAgo }
    }
  });

  const recentActivity = await prisma.inventoryTransaction.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      inventory: {
        include: { product: true, bin: { include: { rack: { include: { zone: true } } } } }
      }
    }
  });

  const products = await prisma.product.findMany({
    include: { inventory: true },
    take: 8
  });

  const chartData = products.map(p => {
    const stock = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    return {
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      stock: stock,
    };
  }).sort((a, b) => b.stock - a.stock);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Operations Overview</h1>
        <p className="text-sm text-slate-500">Live activity and inventory intelligence.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Products</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{productsCount}</div>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3" /> All SKUs Tracked
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Warehouses</CardTitle>
            <MapPin className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{warehousesCount}</div>
            <p className="text-xs text-slate-500 mt-1">Monitoring live locations</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Anomalies (7d)</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{recentAnomaliesCount}</div>
            <p className="text-xs text-slate-500 mt-1">Shrinkage & manual drops</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm ${lowStockCount > 0 ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${lowStockCount > 0 ? 'text-red-700' : 'text-slate-600'}`}>Reorder Actions</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-900' : 'text-slate-900'}`}>{lowStockCount}</div>
            <p className={`text-xs font-medium mt-1 ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>SKUs below threshold</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Stock Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <InventoryChart data={chartData} />
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Reorder Candidates (Dynamic Forecasting)</CardTitle>
              <CardDescription>Generated from Phase 3 Intelligence</CardDescription>
            </CardHeader>
            <CardContent>
              {reorderCandidates.length === 0 ? (
                <div className="text-sm text-slate-500 py-4 text-center">No critical SKUs currently.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100 uppercase font-medium">
                      <tr>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                        <th className="px-4 py-3 text-right">Reorder Pt</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reorderCandidates.map(f => (
                        <tr key={f.sku} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono text-slate-900">{f.sku}</td>
                          <td className="px-4 py-3 text-right font-medium">{Math.round(f.currentStock)}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{Math.round(f.suggestedReorderPoint)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${f.status === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {f.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="shadow-sm border-slate-200 h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Recent Activity
                <span className="text-xs font-normal text-slate-500">Live</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((tx) => {
                  const isPositive = tx.quantityChange > 0;
                  const isAnomaly = tx.reason === 'DAMAGED' || tx.reason === 'MANUAL_ADJUST';
                  
                  return (
                    <div key={tx.id} className="flex gap-3 text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAnomaly ? 'bg-purple-100 text-purple-600' : isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isAnomaly ? <AlertTriangle className="w-4 h-4" /> : isPositive ? <Package className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 font-medium truncate">
                          {tx.inventory.product.sku}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5 truncate flex justify-between">
                          <span>{tx.reason.replace('_', ' ')}</span>
                          <span className="font-mono">{new Date(tx.createdAt).toLocaleDateString()}</span>
                        </p>
                        <div className="flex justify-between items-center mt-1">
                           <span className="text-xs text-slate-400">{tx.inventory.bin.rack.zone.name} / {tx.inventory.bin.name}</span>
                           <span className={`font-semibold ${isAnomaly ? 'text-purple-600' : isPositive ? 'text-emerald-600' : 'text-slate-700'}`}>
                             {isPositive ? '+' : ''}{tx.quantityChange}
                           </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {recentActivity.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No recent activity.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
