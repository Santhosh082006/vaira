'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Box } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
      } else {
        router.push('/login?registered=true');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm shadow-sm border-slate-200 bg-white">
        <CardHeader className="space-y-2 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl font-semibold text-slate-900">Create an Account</CardTitle>
          <CardDescription className="text-slate-500">
            Join Vaira Operations System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md text-center">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-700 font-medium text-sm">Full Name</Label>
              <Input 
                id="name" 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 border-slate-200 focus-visible:ring-blue-600"
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-medium text-sm">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 border-slate-200 focus-visible:ring-blue-600"
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 font-medium text-sm">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 border-slate-200 focus-visible:ring-blue-600"
                required 
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium mt-2">
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <div className="text-center mt-4">
              <p className="text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
