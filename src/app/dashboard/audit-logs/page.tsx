import { prisma } from '@/lib/prisma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 100 // Limit to recent logs
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">Security and action history across the system.</p>
      </div>

      <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 border-b border-slate-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Timestamp</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">User</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Action</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Entity</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                  <TableCell className="text-slate-500 text-xs font-mono">
                    {log.createdAt.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {log.user?.name || log.userId || 'System'}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-700 text-sm">{log.entity} ({log.entityId})</TableCell>
                  <TableCell className="text-slate-500 text-sm truncate max-w-[200px]" title={log.details || ''}>
                    {log.details || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
