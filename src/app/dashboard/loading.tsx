export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 bg-slate-200 rounded-md"></div>
        <div className="h-4 w-96 bg-slate-100 rounded-md"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
              <div className="h-5 w-5 bg-slate-100 rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-8 w-16 bg-slate-200 rounded"></div>
              <div className="h-3 w-32 bg-slate-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-96 bg-white border border-slate-200 rounded-xl shadow-sm mt-8"></div>
    </div>
  );
}
