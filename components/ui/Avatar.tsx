import { View, Text, Image } from 'react-native';
import { BRAND } from '@/constants/colors';

type AvatarProps = {
  imageUrl?: string | null;
  name: string;
  size?: number;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ imageUrl, name, size = 40 }: AvatarProps) {
  const fontSize = Math.round(size * 0.38);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: BRAND.blue,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: BRAND.gray, fontSize, fontWeight: '600' }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
