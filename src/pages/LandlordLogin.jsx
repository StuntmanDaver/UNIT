import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UnitLogo from '@/components/UnitLogo';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Loader2, Mail } from 'lucide-react';

export default function LandlordLogin() {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendLink = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: window.location.origin + '/LandlordDashboard'
      }
    });

    if (sendError) {
      setError('Something went wrong sending your link. Check your email address and try again.');
    } else {
      setEmailSent(true);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy">
      <header className="fixed top-0 left-0 right-0 z-40 bg-brand-navy/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/Welcome" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-3">
            <UnitLogo size={32} />
            <span className="text-xl font-bold text-white">Unit</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="pt-32 pb-20 px-6 flex items-center justify-center min-h-screen">
        {emailSent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md"
          >
            <Card className="p-8 bg-brand-navy/50 backdrop-blur-xl border-white/10 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-slate/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-brand-slate-light" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-zinc-400 mb-6">
                We sent a sign-in link to {email}. Check your inbox and click the link to access your dashboard.
              </p>
              <Button
                variant="ghost"
                onClick={() => { setEmailSent(false); setError(''); }}
                className="text-brand-slate-light hover:text-brand-steel"
              >
                Resend link
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-brand-slate/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-brand-slate-light" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Landlord Access</h1>
              <p className="text-zinc-400">Enter your email to receive a sign-in link</p>
            </div>

            <Card className="p-8 bg-brand-navy/50 backdrop-blur-xl border-white/10">
              <form onSubmit={handleSendLink} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="landlord@example.com"
                    className="mt-2 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full py-6 rounded-xl bg-gradient-to-r from-brand-slate to-brand-navy hover:from-brand-slate-light hover:to-brand-navy-light text-white text-base font-medium border-0 shadow-lg shadow-brand-slate/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Magic Link'
                  )}
                </Button>
              </form>
            </Card>

            <p className="text-center text-sm text-zinc-500 mt-6">
              Contact Unit <a href="mailto:support@unitapp.com" className="text-brand-slate-light hover:text-brand-steel underline">support</a> for access
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
