import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ArrowUpRight, ArrowDownRight, MapPin } from 'lucide-react';
import { InventoryChart } from '@/components/dashboard/inventory-chart';
import { calculateDynamicReorderPoints } from '@/lib/services/demandForecasting';

export default async function DashboardPage() {
  const productsCount = await prisma.product.count();
  const warehousesCount = await prisma.warehouse.count();
  const forecasts = await calculateDynamicReorderPoints();
  const lowStockCount = forecasts.filter(f => f.status === 'REORDER_NOW' || f.status === 'CRITICAL').length;

  // Aggregate data for the chart
  const products = await prisma.product.findMany({
    include: {
      inventory: true
    },
    take: 8 // Top 8 products for the chart
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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of warehouse operations and alerts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Products</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{productsCount}</div>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3" /> +4 this week
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Warehouses</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{warehousesCount}</div>
            <p className="text-xs text-slate-500 mt-1">Active locations</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-amber-200 bg-amber-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Low Stock Alerts</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">{lowStockCount}</div>
            <p className="text-xs text-amber-600 font-medium mt-1">Requires reorder</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <div className="mt-8">
        <InventoryChart data={chartData} />
      </div>
    </div>
  );
}
