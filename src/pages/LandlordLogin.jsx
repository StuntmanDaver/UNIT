import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UnitLogo from '@/components/UnitLogo';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, Lock, Loader2 } from 'lucide-react';

export default function LandlordLogin() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
    initialData: []
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Find property with matching landlord code
    const matchedProperty = properties.find(p => p.landlord_code === code);

    if (matchedProperty) {
      // Store landlord session
      sessionStorage.setItem('landlord_property_id', matchedProperty.id);
      navigate(createPageUrl('LandlordDashboard') + `?propertyId=${matchedProperty.id}`);
    } else {
      setError('Invalid access code. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900">
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={createPageUrl('Welcome')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Landlord Access</h1>
            <p className="text-zinc-400">Enter your property access code to continue</p>
          </div>

          <Card className="p-8 bg-zinc-900/50 backdrop-blur-xl border-white/10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="code" className="text-sm font-medium text-zinc-300">
                  Access Code
                </Label>
                <Input
                  id="code"
                  type="password"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your access code"
                  className="mt-2 rounded-xl text-center text-lg tracking-widest bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
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
                className="w-full py-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-base font-medium border-0 shadow-lg shadow-indigo-500/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Access Dashboard'
                )}
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-zinc-500 mt-6">
            Contact Unit <a href="mailto:support@unitapp.com" className="text-indigo-400 hover:text-indigo-300 underline">support</a> for access
          </p>
        </motion.div>
      </main>
    </div>
  );
}