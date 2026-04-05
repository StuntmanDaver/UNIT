import { useEffect } from 'react';
import { router } from 'expo-router';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function AdminTabRedirect() {
  useEffect(() => {
    router.replace('/(admin)/');
  }, []);

  return <LoadingScreen message="Loading admin..." />;
}
