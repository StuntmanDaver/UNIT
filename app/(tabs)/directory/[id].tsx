import { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { ArrowLeft, Phone, Mail, Globe, Share2, Edit2 } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/lib/AuthContext';
import { getCategoryLabel } from '@/constants/categories';
import { CATEGORY_COLORS } from '@/constants/colors';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: business, isLoading } = useBusiness(id ?? '');
  const svgRef = useRef<unknown>(null);

  if (isLoading) {
    return <LoadingScreen message="Loading business..." />;
  }

  if (!business) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-navy">
        <Text className="text-base font-nunito text-brand-gray leading-relaxed">Business not found.</Text>
      </View>
    );
  }

  const categoryColor = CATEGORY_COLORS[business.category] ?? '#465A75';
  const badgeColor = { bg: categoryColor + '20', text: categoryColor };
  const isOwner = business.owner_email === user?.email;
  const qrValue = `unit://directory/${business.id}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${business.business_name} on UNIT! ${qrValue}`,
        url: qrValue,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share this profile.');
    }
  };

  return (
    <ScrollView className="flex-1 bg-brand-navy" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Dark header */}
      <View className="bg-brand-navy px-4 pt-14 pb-8">
        <Pressable
          onPress={() => router.back()}
          className="mb-4 flex-row items-center gap-1.5"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
          <Text className="text-base font-nunito text-white leading-relaxed">Back</Text>
        </Pressable>

        <View className="items-center">
          <Avatar
            imageUrl={business.logo_url}
            name={business.business_name}
            size={80}
          />
          <Text className="text-3xl font-lora-semibold text-white leading-tight mt-3 text-center">
            {business.business_name}
          </Text>
          {business.unit_number && (
            <Text className="text-sm font-nunito text-brand-steel leading-normal mt-1">Unit {business.unit_number}</Text>
          )}
          <View className="mt-2">
            <Badge
              label={getCategoryLabel(business.category)}
              color={badgeColor}
              size="sm"
            />
          </View>
        </View>
      </View>

      <View className="px-4 pt-6">
        {/* Description */}
        {business.business_description && (
          <Card className="p-6 mb-6">
            <Text className="text-2xl font-lora-semibold text-brand-gray leading-tight mb-2">About</Text>
            <Text className="text-base font-nunito text-brand-gray leading-relaxed">
              {business.business_description}
            </Text>
          </Card>
        )}

        {/* Contact section */}
        {(business.contact_name || business.contact_phone || business.contact_email || business.website) && (
          <Card className="p-6 mb-6">
            <Text className="text-2xl font-lora-semibold text-brand-gray leading-tight mb-3">Contact</Text>

            {business.contact_name && (
              <Text className="text-base font-nunito text-brand-gray leading-relaxed mb-3">{business.contact_name}</Text>
            )}

            {/* Action buttons */}
            <View className="gap-3">
              {business.contact_phone && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${business.contact_phone}`)}
                  className="flex-row items-center gap-4 p-4"
                >
                  <View className="w-10 h-10 rounded-full bg-brand-blue items-center justify-center">
                    <Phone size={18} color="#FFFFFF" />
                  </View>
                  <Text className="text-base font-nunito text-brand-gray leading-relaxed flex-1">
                    {business.contact_phone}
                  </Text>
                </Pressable>
              )}

              {business.contact_email && (
                <Pressable
                  onPress={() => Linking.openURL(`mailto:${business.contact_email}`)}
                  className="flex-row items-center gap-4 p-4"
                >
                  <View className="w-10 h-10 rounded-full bg-brand-blue items-center justify-center">
                    <Mail size={18} color="#FFFFFF" />
                  </View>
                  <Text className="text-base font-nunito text-brand-gray leading-relaxed flex-1">
                    {business.contact_email}
                  </Text>
                </Pressable>
              )}

              {business.website && (
                <Pressable
                  onPress={() => Linking.openURL(business.website!)}
                  className="flex-row items-center gap-4 p-4"
                >
                  <View className="w-10 h-10 rounded-full bg-brand-blue items-center justify-center">
                    <Globe size={18} color="#FFFFFF" />
                  </View>
                  <Text className="text-base font-nunito text-brand-gray leading-relaxed flex-1" numberOfLines={1}>
                    {business.website}
                  </Text>
                </Pressable>
              )}
            </View>
          </Card>
        )}

        {/* QR Code section */}
        <Card className="mb-6 items-center p-6">
          <Text className="text-2xl font-lora-semibold text-brand-gray leading-tight mb-4">Business QR Code</Text>
          <QRCode
            value={qrValue}
            size={150}
            getRef={(ref) => { svgRef.current = ref; }}
          />
          <Pressable
            onPress={handleShare}
            className="mt-4 flex-row items-center gap-2 bg-brand-blue rounded-xl px-5 py-3"
          >
            <Share2 size={16} color="#FFFFFF" />
            <Text className="text-base font-nunito-semibold text-white">Share</Text>
          </Pressable>
        </Card>

        {/* Edit Profile button for owner */}
        {isOwner && (
          <Button
            onPress={() => router.push('/profile/edit')}
            variant="secondary"
          >
            Edit Profile
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
