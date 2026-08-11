"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Loader2, Factory } from "lucide-react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    
    try {
      await register(email, username, password, fullName);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/40 to-blue-900/40 z-10" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent z-0" />
        
        <div className="relative z-20 text-center px-10 animate-fade-in">
          <Factory size={80} className="text-blue-400 mx-auto mb-8" />
          <h1 className="text-5xl font-bold text-white mb-4">ManuMind AI</h1>
          <p className="text-xl text-slate-300 max-w-md mx-auto">
            Join the future of manufacturing intelligence
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center p-8 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 animate-slide-up my-auto py-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Create Account</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Sign up to access the intelligent platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass p-8 rounded-2xl space-y-5 border border-border/50">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border bg-secondary/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border bg-secondary/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border bg-secondary/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
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
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border bg-secondary/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all flex justify-center items-center disabled:opacity-70 mt-4 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
