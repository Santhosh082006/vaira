import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage warehouse configurations and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Organization Settings</CardTitle>
            <CardDescription className="text-slate-500">Update your company details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Company Name</Label>
              <Input defaultValue="Vaira WMS Corp" className="h-10 border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700">Default Currency</Label>
              <Input defaultValue="INR (₹)" className="h-10 border-slate-200" disabled />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white mt-2">Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">System Alerts</CardTitle>
            <CardDescription className="text-slate-500">Configure notification thresholds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Global Low Stock Threshold</Label>
              <Input type="number" defaultValue="10" className="h-10 border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700">Email Notifications</Label>
              <Input defaultValue="admin@vaira.app" className="h-10 border-slate-200" />
            </div>
            <Button className="bg-slate-100 hover:bg-slate-200 text-slate-900 mt-2">Update Alerts</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
