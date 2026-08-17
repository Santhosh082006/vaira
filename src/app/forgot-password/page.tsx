"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    
    try {
      // Simulate API call for forgot password (since real email sending requires setup)
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage("Failed to send reset email. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Card className="w-full max-w-md shadow-lg border-0 ring-1 ring-slate-200">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2 text-blue-600">
            <AlertCircle size={24} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Reset password</CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "success" ? (
            <div className="text-center space-y-6">
              <div className="bg-green-50 text-green-700 p-4 rounded-lg flex flex-col items-center gap-3">
                <CheckCircle2 size={32} className="text-green-600" />
                <p className="text-sm font-medium">Check your email</p>
                <p className="text-xs text-green-600/80">We've sent a password reset link to {email}</p>
              </div>
              <Button asChild variant="outline" className="w-full h-10 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900">
                <Link href="/login">
                  Return to login
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 font-medium text-sm">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 border-slate-200 focus-visible:ring-blue-600"
                  placeholder="name@example.com"
                  required 
                  disabled={status === "loading"}
                />
              </div>
              
              {status === "error" && (
                <div className="text-red-500 text-sm font-medium">{errorMessage}</div>
              )}

              <Button type="submit" disabled={status === "loading"} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium mt-2">
                {status === "loading" ? 'Sending link...' : 'Send reset link'}
              </Button>
              
              <div className="text-center mt-4">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors">
                  <ArrowLeft size={16} /> Back to log in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
