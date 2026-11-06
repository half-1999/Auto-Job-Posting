import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const CONFIG = {
  sent: { label: 'Sent', color: 'var(--chart-1)' },
  replies: { label: 'Replies', color: 'var(--chart-2)' },
  failed: { label: 'Failed', color: 'var(--chart-3)' },
}

/** Lazy-loaded (Recharts lives in its own chunk). Bars for weeks or days, lines for months. */
export default function ActivityChart({ data, series = ['sent', 'replies'], variant = 'bar' }) {
  const narrow = !useMediaQuery('(min-width: 640px)')
  const config = Object.fromEntries(series.map((key) => [key, CONFIG[key]]))
  const axis = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        interval={narrow ? 1 : 'preserveStartEnd'}
        minTickGap={8}
      />
      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
      <ChartTooltip
        cursor={variant === 'bar'}
        content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel} />}
      />
      <ChartLegend content={<ChartLegendContent />} />
    </>
  )

  return (
    <ChartContainer config={config} className="aspect-auto size-full">
      {variant === 'line' ? (
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          {axis}
          {series.map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              strokeDasharray={key === 'replies' ? '4 3' : key === 'failed' ? '1 3' : undefined}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
          {axis}
          {series.map((key) => (
            <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          ))}
        </BarChart>
      )}
    </ChartContainer>
  )
}
