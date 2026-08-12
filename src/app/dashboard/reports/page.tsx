import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportButton } from '@/components/dashboard/export-button';
import { AiReportSummary } from '@/components/dashboard/ai-report-summary';
import { prisma } from '@/lib/prisma';

export default async function ReportsPage() {
  const inventory = await prisma.inventory.findMany({
    include: {
      product: true,
      bin: {
        include: { rack: { include: { zone: { include: { warehouse: true } } } } }
      }
    }
  });

  const exportData = inventory.map(item => ({
    'Product Name': item.product.name,
    'SKU': item.product.sku,
    'Quantity': item.quantity,
    'Warehouse': item.bin.rack.zone.warehouse.name,
    'Location': `${item.bin.rack.zone.name} - ${item.bin.rack.name} - ${item.bin.name}`
  }));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">AI Insights</h1>
          <p className="text-sm text-slate-500">Automated reports and stock analysis.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton data={exportData} filename={`Inventory_Report_${new Date().toISOString().split('T')[0]}`} />
        </div>
      </div>

      <AiReportSummary inventoryData={inventory} />
    </div>
  );
}
