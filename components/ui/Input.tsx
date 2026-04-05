import { View, Text, TextInput, type TextInputProps } from 'react-native';

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className={`mb-4 ${className}`}>
      {label ? <Text className="text-sm font-medium text-brand-navy mb-1.5">{label}</Text> : null}
      <TextInput
        className={`border rounded-xl px-4 py-3 text-base text-brand-navy bg-white ${
          error ? 'border-red-500' : 'border-brand-steel/30'
        }`}
        placeholderTextColor="#7C8DA7"
        {...props}
      />
      {error && <Text className="text-sm text-red-500 mt-1">{error}</Text>}
    </View>
  );
}
