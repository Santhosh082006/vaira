import { prisma } from '@/lib/prisma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default async function OrdersPage() {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: { supplier: true, items: true },
    orderBy: { createdAt: 'desc' }
  });

  const salesOrders = await prisma.salesOrder.findMany({
    include: { customer: true, items: true },
    orderBy: { createdAt: 'desc' }
  });

  const allOrders = [
    ...purchaseOrders.map(po => ({ ...po, type: 'PURCHASE', partnerName: po.supplier.name })),
    ...salesOrders.map(so => ({ ...so, type: 'SALES', partnerName: so.customer.name }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">Track inbound receipts and outbound dispatches.</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 border-b border-slate-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Order ID</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Type</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Partner</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider text-right">Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              allOrders.map((order) => {
                const isPurchase = order.type === 'PURCHASE';

                return (
                  <TableRow key={order.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                    <TableCell className="font-mono text-xs text-slate-600">
                      {order.id.split('-')[0]}
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${isPurchase ? 'text-emerald-700' : 'text-blue-700'}`}>
                        {isPurchase ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {isPurchase ? 'INBOUND' : 'OUTBOUND'}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{order.partnerName}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {order.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-700 font-medium">
                      {order.items.length}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
