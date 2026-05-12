import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import Toast from 'react-native-toast-message';
import { ArrowLeft, LifeBuoy, Mail, Send } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/AuthContext';
import { BRAND } from '@/constants/colors';
import {
  appDeepLinkBase,
  appEnvironment,
  appVariant,
  getPublicHost,
  releaseChannel,
  supportEmail,
} from '@/constants/runtime';

type DiagnosticRowProps = {
  label: string;
  value: string;
};

function DiagnosticRow({ label, value }: DiagnosticRowProps) {
  return (
    <View className="py-3 border-b border-brand-blue/20">
      <Text className="text-sm font-nunito-semibold text-brand-ink-muted leading-normal uppercase tracking-wide">
        {label}
      </Text>
      <Text className="text-base font-nunito text-brand-ink leading-relaxed mt-1" selectable>
        {value}
      </Text>
    </View>
  );
}

export default function AdminSupportScreen() {
  const { user, profile, propertyIds } = useAuth();
  const appVersion = Constants.expoConfig?.version ?? 'unknown';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber
    ?? Constants.expoConfig?.android?.versionCode?.toString()
    ?? 'unset';
  const supabaseHost = getPublicHost(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const sentryConfigured = process.env.EXPO_PUBLIC_SENTRY_DSN ? 'configured' : 'not configured';
  const propertySummary = propertyIds.length > 0 ? propertyIds.join(', ') : 'none';

  const handleSendDiagnostics = () => {
    Sentry.captureMessage('Admin support diagnostics requested', {
      level: 'info',
      tags: {
        area: 'admin_support',
        appEnvironment,
        appVariant,
        releaseChannel,
      },
      user: user ? { id: user.id, email: user.email ?? undefined } : undefined,
      extra: {
        appVersion,
        buildNumber,
        supabaseHost,
        propertyIds,
        profileStatus: profile?.status,
        profileRole: profile?.role,
      },
    });

    Toast.show({
      type: 'success',
      text1: 'Diagnostics sent',
      text2: sentryConfigured === 'configured'
        ? 'Support can now find this marker in Sentry.'
        : 'Sentry is not configured in this build.',
    });
  };

  const handleEmailSupport = async () => {
    const subject = encodeURIComponent(`UNIT support request (${appEnvironment})`);
    const body = encodeURIComponent([
      'Describe what failed:',
      '',
      'Diagnostics:',
      `Environment: ${appEnvironment}`,
      `Variant: ${appVariant}`,
      `Version: ${appVersion}`,
      `Build: ${buildNumber}`,
      `Supabase: ${supabaseHost}`,
      `User: ${user?.email ?? 'unknown'}`,
      `Properties: ${propertySummary}`,
    ].join('\n'));
    const mailto = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

    if (await Linking.canOpenURL(mailto)) {
      await Linking.openURL(mailto);
      return;
    }

    Toast.show({
      type: 'error',
      text1: 'Email unavailable',
      text2: `Contact ${supportEmail} with the diagnostics shown here.`,
    });
  };

  return (
    <View className="flex-1 bg-brand-cloud">
      <GradientHeader>
        <Pressable
          onPress={() => router.back()}
          className="mb-4 flex-row items-center gap-1.5"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
          <Text className="text-base font-nunito text-white leading-relaxed">Back</Text>
        </Pressable>
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-full bg-brand-blue items-center justify-center">
            <LifeBuoy size={22} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-3xl font-lora-semibold text-white leading-tight">
              Support
            </Text>
            <Text className="text-sm font-nunito text-white leading-normal mt-1">
              {appEnvironment} - {releaseChannel}
            </Text>
          </View>
        </View>
      </GradientHeader>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Card className="p-5">
          <Text className="text-2xl font-lora-semibold text-brand-ink leading-tight mb-2">
            Diagnostics
          </Text>
          <Text className="text-base font-nunito text-brand-ink-muted leading-relaxed mb-3">
            Send this marker when login, payments, push, or uploads fail.
          </Text>
          <DiagnosticRow label="Environment" value={appEnvironment} />
          <DiagnosticRow label="Variant" value={appVariant} />
          <DiagnosticRow label="App Version" value={appVersion} />
          <DiagnosticRow label="Build" value={buildNumber} />
          <DiagnosticRow label="Deep Link Base" value={appDeepLinkBase} />
          <DiagnosticRow label="Supabase" value={supabaseHost} />
          <DiagnosticRow label="Sentry" value={sentryConfigured} />
          <DiagnosticRow label="Signed In As" value={user?.email ?? 'unknown'} />
          <DiagnosticRow label="Properties" value={propertySummary} />
        </Card>

        <View className="gap-3 mt-5">
          <Button onPress={handleSendDiagnostics}>Send Diagnostics</Button>
          <Pressable
            onPress={handleEmailSupport}
            className="min-h-[48px] rounded-xl bg-brand-mist border border-brand-blue/40 px-4 py-3 flex-row items-center justify-center gap-2"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Mail size={18} color={BRAND.ink} />
            <Text className="text-base font-nunito-semibold text-brand-ink">Email Support</Text>
            <Send size={16} color={BRAND.inkMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
