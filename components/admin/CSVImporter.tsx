import React, { useState, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { adminService } from '@/services/admin';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { BRAND } from '@/constants/colors';

interface CSVImporterProps {
  propertyId: string;
}

interface ParsedRow {
  email: string;
  business_name: string;
  category: string;
  contact_name: string;
  contact_phone: string;
  services: string;
  _isValid: boolean;
  _error?: string;
}

export function CSVImporter({ propertyId }: CSVImporterProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      Toast.show({ type: 'error', text1: 'CSV is empty or missing headers' });
      return;
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const emailIdx = headers.indexOf('email');
    const businessNameIdx = headers.indexOf('business_name');
    const categoryIdx = headers.indexOf('category');
    const contactNameIdx = headers.indexOf('contact_name');
    const contactPhoneIdx = headers.indexOf('contact_phone');
    const servicesIdx = headers.indexOf('services');

    if (emailIdx === -1 || businessNameIdx === -1 || categoryIdx === -1) {
      Toast.show({ type: 'error', text1: 'Missing required columns: email, business_name, category' });
      return;
    }

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      // Basic CSV splitting that handles quotes poorly, but enough for MVP
      const row = lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
      
      const email = row[emailIdx] || '';
      const business_name = row[businessNameIdx] || '';
      const category = row[categoryIdx] || '';
      const contact_name = contactNameIdx !== -1 ? row[contactNameIdx] : '';
      const contact_phone = contactPhoneIdx !== -1 ? row[contactPhoneIdx] : '';
      const services = servicesIdx !== -1 ? row[servicesIdx] : '';

      const _isValid = !!(email && email.includes('@') && business_name && category);
      let _error;
      if (!_isValid) {
        if (!email || !email.includes('@')) _error = 'Invalid email';
        else if (!business_name) _error = 'Missing business name';
        else if (!category) _error = 'Missing category';
      }

      rows.push({
        email,
        business_name,
        category,
        contact_name,
        contact_phone,
        services,
        _isValid,
        _error,
      });
    }

    setParsedData(rows);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(r => r._isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    setProgress(0);

    const batchSize = 25;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map(r => ({
        email: r.email,
        business_name: r.business_name,
        category: r.category,
        contact_name: r.contact_name,
        contact_phone: r.contact_phone,
        description: r.services ? `Services: ${r.services}` : undefined,
        property_id: propertyId,
      }));

      try {
        const result = await adminService.inviteTenants(batch);
        successCount += result.imported;
        failCount += result.failed.length;
      } catch (err) {
        failCount += batch.length;
      }

      setProgress(Math.round(((i + batchSize) / validRows.length) * 100));
    }

    Toast.show({
      type: 'success',
      text1: 'Import Complete',
      text2: `Imported: ${successCount}, Failed: ${failCount}`,
    });

    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    setIsImporting(false);
    setParsedData([]);
  };

  const clearData = () => {
    setParsedData([]);
  };

  if (parsedData.length === 0) {
    return (
      <View className="bg-brand-navy-light rounded-xl border border-brand-blue/40 p-6 mb-6 mx-4 mt-4">
        <Text className="text-2xl font-lora-semibold text-brand-gray mb-2">CSV Bulk Import</Text>
        <Text className="text-sm font-nunito text-brand-gray mb-4">
          Expected headers: <Text className="text-sm font-nunito-semibold text-brand-gray bg-brand-navy px-1">email, business_name, category, contact_name, contact_phone, services</Text>
        </Text>
        <Pressable
          onPress={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-brand-blue/40 rounded-xl py-8 items-center bg-brand-navy"
        >
          <Upload size={24} color={BRAND.blue} />
          <Text className="text-base font-nunito-semibold text-brand-gray mt-3">Click to upload CSV</Text>
        </Pressable>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </View>
    );
  }

  const validCount = parsedData.filter(r => r._isValid).length;

  return (
    <View className="bg-brand-navy-light rounded-xl border border-brand-blue/40 p-6 mb-6 mx-4 mt-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-lora-semibold text-brand-gray">Import Preview</Text>
        <Pressable onPress={clearData} className="p-2 -mr-2" disabled={isImporting}>
          <X size={20} color={BRAND.steel} />
        </Pressable>
      </View>

      <View className="bg-brand-navy rounded-xl p-4 mb-4">
        <Text className="text-sm font-nunito-semibold text-brand-gray">
          Found {parsedData.length} rows ({validCount} valid)
        </Text>
      </View>

      <View className="max-h-60 mb-6 border border-brand-blue/40 rounded-xl overflow-hidden">
        {parsedData.slice(0, 100).map((row, idx) => (
          <View
            key={idx}
            className={`flex-row items-center px-4 py-3 border-b border-brand-blue/40 ${
              !row._isValid ? 'bg-red-500/10' : ''
            }`}
          >
            {row._isValid ? (
              <CheckCircle2 size={16} color="#10B981" />
            ) : (
              <AlertCircle size={16} color="#EF4444" />
            )}
            <View className="ml-3 flex-1 flex-row">
              <Text className="text-sm font-nunito-semibold text-brand-gray w-1/3" numberOfLines={1}>{row.email}</Text>
              <Text className="text-sm font-nunito text-brand-gray w-1/3" numberOfLines={1}>{row.business_name}</Text>
              {row._error && (
                <Text className="text-sm font-nunito text-red-500 w-1/3" numberOfLines={1}>{row._error}</Text>
              )}
            </View>
          </View>
        ))}
        {parsedData.length > 100 && (
          <View className="px-4 py-3 bg-brand-navy">
            <Text className="text-sm font-nunito text-brand-gray text-center">... and {parsedData.length - 100} more rows</Text>
          </View>
        )}
      </View>

      {isImporting ? (
        <View className="items-center py-2">
          <ActivityIndicator color={BRAND.blue} />
          <Text className="text-sm font-nunito-semibold text-brand-gray mt-3">Importing... {progress}%</Text>
        </View>
      ) : (
      <Button 
        onPress={handleImport} 
        disabled={validCount === 0}
      >
        {`Import ${validCount} Tenants`}
      </Button>
      )}
    </View>
  );
}
