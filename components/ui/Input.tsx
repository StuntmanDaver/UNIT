import { View, Text, TextInput, type TextInputProps } from 'react-native';

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className={`mb-4 ${className}`}>
      {label ? <Text className="text-sm font-medium text-brand-gray mb-1.5 font-arcadia">{label}</Text> : null}
      <TextInput
        className={`border rounded-xl px-4 py-3 text-base text-white font-arcadia bg-brand-navy-light ${
          error ? 'border-red-500' : 'border-brand-navy-light'
        }`}
        placeholderTextColor="#7C8DA7"
        {...props}
      />
      {error && <Text className="text-sm text-red-500 mt-1 font-arcadia">{error}</Text>}
    </View>
  );
}
