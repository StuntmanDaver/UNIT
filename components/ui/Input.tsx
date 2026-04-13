import { View, Text, TextInput, type TextInputProps } from 'react-native';

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className={`mb-4 ${className}`}>
      {label ? <Text className="text-sm font-nunito text-brand-gray mb-2">{label}</Text> : null}
      <TextInput
        className={`border rounded-xl px-4 py-3 text-base text-white font-nunito bg-brand-navy-light ${
          error ? 'border-red-500' : 'border-brand-blue/40'
        }`}
        placeholderTextColor="#7C8DA7"
        {...props}
      />
      {error && <Text className="text-sm font-nunito text-red-500 mt-1">{error}</Text>}
    </View>
  );
}
