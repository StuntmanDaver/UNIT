// Cross-platform CSV bulk importer for tenant invitations.
//
// Replaces the previous web-only implementation (HTMLInputElement + FileReader)
// with expo-document-picker + expo-file-system + papaparse so that the same
// component renders on iOS, Android, and the web (react-native-web).
//
// Bug fixes vs. the previous implementation:
//   BUG-02 (parent fix): the component now works on native, so the
//     `Platform.OS === 'web'` gate in `app/(admin)/tenants.tsx` can be removed.
//   BUG-09: papaparse handles quoted commas (e.g. `"Consulting, LLC"`) without
//     shifting downstream fields.
//   BUG-10: progress is clamped to 100% via `computeProgress`.
//   BUG-11: batch-level rejections populate the `failed` array row-by-row
//     rather than being silently dropped.
//   BUG-08 (client side): unit_number is carried through the parse → validate
//     → invite pipeline when present on the CSV.
import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { adminService } from '@/services/admin';
import { BRAND } from '@/constants/colors';
import {
  parseCSV,
  computeProgress,
  toInviteRow,
  MAX_CSV_BYTES,
  type ParsedRow,
} from './_csvImporter.utils';

interface CSVImporterProps {
  propertyId: string;
}

const BATCH_SIZE = 25;

export function CSVImporter({ propertyId }: CSVImporterProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failedRows, setFailedRows] = useState<{ email: string; reason: string }[]>([]);
  const queryClient = useQueryClient();

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        // User cancelled — idle state, no toast needed.
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        Toast.show({ type: 'error', text1: 'No file selected' });
        return;
      }

      // T-02-14: reject pathologically large CSVs before they hit the JS bridge
      if (typeof asset.size === 'number' && asset.size > MAX_CSV_BYTES) {
        Toast.show({
          type: 'error',
          text1: 'CSV too large',
          text2: 'Split the file into smaller batches (<2MB).',
        });
        return;
      }

      // expo-file-system v19 File API — `new File(uri).text()` returns the
      // file contents as a UTF-8 string.
      const file = new File(asset.uri);
      const csvText = await file.text();

      const rows = parseCSV(csvText);

      if (rows.length === 0) {
        Toast.show({ type: 'error', text1: 'CSV is empty or missing headers' });
        return;
      }

      setParsedData(rows);
      setFailedRows([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read CSV';
      Toast.show({ type: 'error', text1: 'CSV read failed', text2: message });
    }
  };

  const handleImport = async () => {
    const validRows = parsedData.filter((r) => r._isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    setProgress(0);
    setFailedRows([]);

    const total = validRows.length;
    let successCount = 0;
    const failed: { email: string; reason: string }[] = [];

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const slice = validRows.slice(i, i + BATCH_SIZE);
      const batch = slice.map((r) => toInviteRow(r, propertyId));

      try {
        const result = await adminService.inviteTenants(batch);
        successCount += result.imported;
        // BUG-11: propagate per-row failures from the Edge Function response
        // into the UI rather than swallowing them.
        if (Array.isArray(result.failed)) {
          failed.push(...result.failed);
        }
      } catch (err) {
        // BUG-11: on batch-level rejection, surface one failed entry per row
        // in the batch with a contextual reason.
        const reason = err instanceof Error ? err.message : 'Unknown error';
        slice.forEach((r) =>
          failed.push({ email: r.email, reason: `Batch failed: ${reason}` }),
        );
      }

      // BUG-10: computeProgress clamps to 100 even when the last batch is
      // partial and `i + BATCH_SIZE` overshoots `total`.
      const processed = Math.min(total, i + slice.length);
      setProgress(computeProgress(processed, total));
    }

    setFailedRows(failed);

    Toast.show({
      type: failed.length === 0 ? 'success' : 'info',
      text1: 'Import complete',
      text2: `${successCount} imported, ${failed.length} failed`,
    });

    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    setIsImporting(false);
    // Keep the parsed data visible only when there were failures so the admin
    // can review the error list; otherwise reset.
    if (failed.length === 0) {
      setParsedData([]);
    }
  };

  const clearData = () => {
    setParsedData([]);
    setFailedRows([]);
    setProgress(0);
  };

  if (parsedData.length === 0 && failedRows.length === 0) {
    return (
      <View className="bg-brand-mist rounded-xl border border-brand-blue/40 p-4 mb-4 mx-4 mt-4">
        <Text className="text-2xl font-lora-semibold text-brand-ink mb-2">
          CSV Bulk Import
        </Text>
        <Text className="text-sm font-nunito text-brand-ink mb-4">
          Required headers: email, business_name, category. Optional:
          contact_name, contact_phone, services, unit_number.
        </Text>
        <Pressable
          onPress={handlePickFile}
          className="border-2 border-dashed border-brand-blue/40 rounded-xl p-8 items-center bg-brand-cloud min-h-[44px]"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Upload size={24} color={BRAND.blue} />
          <Text className="text-base font-nunito-semibold text-brand-ink mt-2">
            Pick CSV
          </Text>
        </Pressable>
      </View>
    );
  }

  const validCount = parsedData.filter((r) => r._isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <View className="bg-brand-mist rounded-xl border border-brand-blue/40 p-4 mb-4 mx-4 mt-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-lora-semibold text-brand-ink">
          Import Preview
        </Text>
        <Pressable
          onPress={clearData}
          disabled={isImporting}
          hitSlop={8}
          className="p-2 min-h-[44px] min-w-[44px] items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <X size={20} color={BRAND.blue} />
        </Pressable>
      </View>

      {parsedData.length > 0 && (
        <View className="bg-brand-cloud rounded-xl p-4 mb-4">
          <Text className="text-sm font-nunito-semibold text-brand-ink">
            Found {parsedData.length} rows ({validCount} valid, {invalidCount} invalid)
          </Text>
        </View>
      )}

      {parsedData.length > 0 && (
        <ScrollView
          className="max-h-64 mb-4 border border-brand-blue/40 rounded-xl"
          showsVerticalScrollIndicator={false}
        >
          {parsedData.slice(0, 100).map((row, idx) => (
            <View
              key={idx}
              className={`px-4 py-2 border-b border-brand-blue/40 ${
                !row._isValid ? 'bg-red-500/10' : ''
              }`}
            >
              <View className="flex-row items-center gap-2">
                {row._isValid ? (
                  <CheckCircle2 size={16} color={BRAND.blue} />
                ) : (
                <AlertCircle size={16} color="#DC2626" />
                )}
                <Text
                  className="text-sm font-nunito-semibold text-brand-ink flex-1"
                  numberOfLines={1}
                >
                  {row.email || '(missing email)'}
                </Text>
                <Text
                  className="text-sm font-nunito text-brand-ink flex-1"
                  numberOfLines={1}
                >
                  {row.business_name || '—'}
                </Text>
              </View>
              {!row._isValid && row._errors.length > 0 && (
                <View className="mt-2 gap-1">
                  {row._errors.map((err, errIdx) => (
                    <Text
                      key={errIdx}
                      className="text-sm font-nunito text-red-700"
                    >
                      • {err}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
          {parsedData.length > 100 && (
            <View className="px-4 py-2 bg-brand-cloud">
              <Text className="text-sm font-nunito text-brand-ink text-center">
                … and {parsedData.length - 100} more rows
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {failedRows.length > 0 && !isImporting && (
        <View className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 mb-4">
          <Text className="text-sm font-nunito-semibold text-brand-ink mb-2">
            {failedRows.length} import failures:
          </Text>
          {failedRows.slice(0, 5).map((f, idx) => (
            <Text
              key={idx}
              className="text-sm font-nunito text-red-700"
              numberOfLines={2}
            >
              • {f.email}: {f.reason}
            </Text>
          ))}
          {failedRows.length > 5 && (
            <Text className="text-sm font-nunito text-brand-ink mt-2">
              … and {failedRows.length - 5} more
            </Text>
          )}
        </View>
      )}

      {isImporting ? (
        <View className="items-center py-2">
          <ActivityIndicator color={BRAND.blue} />
          <Text className="text-sm font-nunito-semibold text-brand-ink mt-2">
            Importing… {progress}%
          </Text>
        </View>
      ) : parsedData.length > 0 ? (
        <Button onPress={handleImport} disabled={validCount === 0}>
          {`Import ${validCount} valid row${validCount === 1 ? '' : 's'}`}
        </Button>
      ) : (
        <Button variant="secondary" onPress={clearData}>
          Dismiss
        </Button>
      )}
    </View>
  );
}
