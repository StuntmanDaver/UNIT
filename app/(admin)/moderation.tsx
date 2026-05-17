import { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ChevronLeft, ShieldAlert } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { BRAND } from '@/constants/colors';
import { contentModerationService, type ContentReport, type ReportStatus } from '@/services/contentModeration';
import { firstParam } from '@/lib/routeParams';

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Open',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

export default function AdminModerationScreen() {
  const params = useLocalSearchParams<{ propertyId?: string }>();
  const propertyId = firstParam(params.propertyId) ?? '';
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['contentReports', propertyId],
    queryFn: () => contentModerationService.listReports(propertyId),
    enabled: !!propertyId,
  });

  async function updateStatus(report: ContentReport, status: ReportStatus): Promise<void> {
    setUpdatingId(report.id);
    try {
      await contentModerationService.updateReportStatus({
        id: report.id,
        status,
        resolution_note: status === 'resolved' ? 'Reviewed and resolved by admin.' : null,
      });
      await queryClient.invalidateQueries({ queryKey: ['contentReports', propertyId] });
      Toast.show({ type: 'success', text1: `Report marked ${STATUS_LABELS[status].toLowerCase()}` });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not update report' });
    } finally {
      setUpdatingId(null);
    }
  }

  function renderItem({ item }: { item: ContentReport }) {
    return (
      <Card className="mx-4 mb-3 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-nunito-semibold text-brand-ink leading-relaxed">
              {item.target_type} report
            </Text>
            <Text className="text-sm font-nunito text-brand-ink-muted leading-normal mt-1">
              Reason: {item.reason} - Status: {STATUS_LABELS[item.status]}
            </Text>
            {item.details ? (
              <Text className="text-base font-nunito text-brand-ink leading-relaxed mt-3">
                {item.details}
              </Text>
            ) : null}
            <Text className="text-sm font-nunito text-brand-ink-muted leading-normal mt-3">
              Target ID: {item.target_id}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3 mt-4">
          <View className="flex-1">
            <Button
              onPress={() => updateStatus(item, 'reviewing')}
              variant="secondary"
              loading={updatingId === item.id}
              disabled={updatingId === item.id || item.status === 'reviewing'}
            >
              Review
            </Button>
          </View>
          <View className="flex-1">
            <Button
              onPress={() => updateStatus(item, 'resolved')}
              variant="primary"
              loading={updatingId === item.id}
              disabled={updatingId === item.id || item.status === 'resolved'}
            >
              Resolve
            </Button>
          </View>
          <View className="flex-1">
            <Button
              onPress={() => updateStatus(item, 'dismissed')}
              variant="ghost"
              loading={updatingId === item.id}
              disabled={updatingId === item.id || item.status === 'dismissed'}
            >
              Dismiss
            </Button>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <View className="flex-1 bg-brand-cloud">
      <GradientHeader>
        <Pressable onPress={() => router.back()} hitSlop={8} className="p-3 -ml-3 mb-2">
          <ChevronLeft size={24} color={BRAND.gray} />
        </Pressable>
        <Text className="text-2xl font-lora-semibold text-white leading-tight">
          Moderation Queue
        </Text>
        <Text className="text-sm font-nunito text-white mt-1">
          Review tenant reports for this property
        </Text>
      </GradientHeader>

      {isLoading ? (
        <LoadingScreen message="Loading reports..." />
      ) : (
        <FlatList
          data={reports ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 16, paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <EmptyState
              icon={ShieldAlert}
              title="No reports"
              message="Reported posts and businesses will appear here."
            />
          }
        />
      )}
    </View>
  );
}
