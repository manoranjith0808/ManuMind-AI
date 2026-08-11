"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Loader2, Factory } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 z-10" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent z-0" />
        
        <div className="relative z-20 text-center px-10 animate-fade-in">
          <Factory size={80} className="text-cyan-400 mx-auto mb-8" />
          <h1 className="text-5xl font-bold text-white mb-4">ManuMind AI</h1>
          <p className="text-xl text-slate-300 max-w-md mx-auto">
            Intelligent Manufacturing Platform powered by Advanced AI
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your credentials to access the platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass p-8 rounded-2xl space-y-6 border border-border/50">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border bg-secondary/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                placeholder="admin@manumind.ai"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border bg-secondary/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all flex justify-center items-center disabled:opacity-70 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign in to ManuMind"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Request access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
