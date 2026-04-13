// components/admin/RevenueChart.tsx
import { View, Text } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryGroup } from 'victory-native';
import { format, parseISO } from 'date-fns';
import type { MonthRevenue } from '@/hooks/usePromotionStats';

type Props = { data: MonthRevenue[] };

const GROSS_COLOR = '#3B82F6';   // blue
const NET_COLOR = '#10B981';     // green

export function RevenueChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <View className="items-center justify-center h-40">
        <Text className="text-sm font-nunito text-brand-gray">No revenue data yet</Text>
      </View>
    );
  }

  const labels = data.map((d) => format(parseISO(`${d.month}-01`), 'MMM'));
  const grossData = data.map((d, i) => ({ x: i + 1, y: d.gross }));
  const netData = data.map((d, i) => ({ x: i + 1, y: d.net }));

  return (
    <View>
      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={{ x: 20 }}
        height={180}
        padding={{ top: 10, bottom: 40, left: 50, right: 20 }}
      >
        <VictoryAxis
          tickValues={data.map((_, i) => i + 1)}
          tickFormat={labels}
          style={{ tickLabels: { fontSize: 10 } }}
        />
        <VictoryAxis dependentAxis tickFormat={(t) => `$${t}`} style={{ tickLabels: { fontSize: 10 } }} />
        <VictoryGroup offset={12} colorScale={[GROSS_COLOR, NET_COLOR]}>
          <VictoryBar data={grossData} barWidth={10} />
          <VictoryBar data={netData} barWidth={10} />
        </VictoryGroup>
      </VictoryChart>
      <View className="flex-row gap-4 px-2 mt-1">
        <View className="flex-row items-center gap-2">
          <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: GROSS_COLOR }} />
          <Text className="text-sm font-nunito text-brand-gray">Gross</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: NET_COLOR }} />
          <Text className="text-sm font-nunito text-brand-gray">Net</Text>
        </View>
      </View>
    </View>
  );
}
