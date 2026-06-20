'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
 [k in string]: {
  label?: React.ReactNode
  icon?: React.ComponentType
 } & (
  | { color?: string; theme?: never }
  | { color?: never; theme: Record<keyof typeof THEMES, string> }
 )
}

type ChartContextProps = {
 config: ChartConfig
}

type ChartSideLegendItem = {
 key: string
 label: React.ReactNode
 color: string
 value?: React.ReactNode
 detail?: React.ReactNode
}

type ChartInteractiveLegendItem = {
 key: string
 label: React.ReactNode
 color: string
}

type ChartTooltipPayloadItem = {
 dataKey?: string | number
 name?: string | number
 value?: unknown
 color?: string
 payload?: Record<string, unknown>
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
 const context = React.useContext(ChartContext)

 if (!context) {
  throw new Error('useChart must be used within a <ChartContainer />')
 }

 return context
}

function ChartContainer({
 id,
 className,
 children,
 config,
 ...props
}: React.ComponentProps<'div'> & {
 config: ChartConfig
 children: React.ComponentProps<
  typeof RechartsPrimitive.ResponsiveContainer
 >['children']
}) {
 const uniqueId = React.useId()
 const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

 return (
  <ChartContext.Provider value={{ config }}>
   <div
    data-slot="chart"
    data-chart={chartId}
    className={cn(
     "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
     className,
    )}
    {...props}
   >
    <ChartStyle id={chartId} config={config} />
    <RechartsPrimitive.ResponsiveContainer>
     {children}
    </RechartsPrimitive.ResponsiveContainer>
   </div>
  </ChartContext.Provider>
 )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
 const colorConfig = Object.entries(config).filter(
  ([, config]) => config.theme || config.color,
 )

 if (!colorConfig.length) {
  return null
 }

 return (
  <style
   dangerouslySetInnerHTML={{
    __html: Object.entries(THEMES)
     .map(
      ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
 .map(([key, itemConfig]) => {
  const color =
   itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
   itemConfig.color
  return color ? ` --color-${key}: ${color};` : null
 })
 .join('\n')}
}
`,
     )
     .join('\n'),
   }}
  />
 )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
 active,
 payload,
 className,
 indicator = 'dot',
 hideLabel = false,
 hideIndicator = false,
 label,
 labelFormatter,
 labelClassName,
 formatter,
 color,
 nameKey,
 labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
 React.ComponentProps<'div'> & {
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: 'line' | 'dot' | 'dashed'
  nameKey?: string
  labelKey?: string
 }) {
 const { config } = useChart()

 const tooltipLabel = React.useMemo(() => {
  if (hideLabel || !payload?.length) {
   return null
  }

  const [item] = payload
  const key = `${labelKey || item?.dataKey || item?.name || 'value'}`
  const itemConfig = getPayloadConfigFromPayload(config, item, key)
  const value =
   !labelKey && typeof label === 'string'
    ? config[label as keyof typeof config]?.label || label
    : itemConfig?.label

  if (labelFormatter) {
   return (
    <div className={cn('font-medium', labelClassName)}>
     {labelFormatter(value, payload)}
    </div>
   )
  }

  if (!value) {
   return null
  }

  return <div className={cn('font-medium', labelClassName)}>{value}</div>
 }, [
  label,
  labelFormatter,
  payload,
  hideLabel,
  labelClassName,
  config,
  labelKey,
 ])

 if (!active || !payload?.length) {
  return null
 }

 const nestLabel = payload.length === 1 && indicator !== 'dot'

 return (
  <div
   className={cn(
    'border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ',
    className,
   )}
  >
   {!nestLabel ? tooltipLabel : null}
   <div className="grid gap-1.5">
    {payload.map((item, index) => {
     const key = `${nameKey || item.name || item.dataKey || 'value'}`
     const itemConfig = getPayloadConfigFromPayload(config, item, key)
     const indicatorColor = color || item.payload.fill || item.color

     return (
      <div
       key={item.dataKey}
       className={cn(
        '[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5',
        indicator === 'dot' && 'items-center',
       )}
      >
       {formatter && item?.value !== undefined && item.name ? (
        formatter(item.value, item.name, item, index, item.payload)
       ) : (
        <>
         {itemConfig?.icon ? (
          <itemConfig.icon />
         ) : (
          !hideIndicator && (
           <div
            className={cn(
             'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
             {
              'h-2.5 w-2.5': indicator === 'dot',
              'w-1': indicator === 'line',
              'w-0 border-[1.5px] border-dashed bg-transparent':
               indicator === 'dashed',
              'my-0.5': nestLabel && indicator === 'dashed',
             },
            )}
            style={
             {
              '--color-bg': indicatorColor,
              '--color-border': indicatorColor,
             } as React.CSSProperties
            }
           />
          )
         )}
         <div
          className={cn(
           'flex flex-1 justify-between leading-none',
           nestLabel ? 'items-end' : 'items-center',
          )}
         >
          <div className="grid gap-1.5">
           {nestLabel ? tooltipLabel : null}
           <span className="text-muted-foreground">
            {itemConfig?.label || item.name}
           </span>
          </div>
          {item.value && (
           <span className="text-foreground font-mono font-medium tabular-nums">
            {item.value.toLocaleString()}
           </span>
          )}
         </div>
        </>
       )}
      </div>
     )
    })}
   </div>
  </div>
 )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
 className,
 hideIcon = false,
 payload,
 verticalAlign = 'bottom',
 nameKey,
}: React.ComponentProps<'div'> &
 Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
  hideIcon?: boolean
  nameKey?: string
 }) {
 const { config } = useChart()

 if (!payload?.length) {
  return null
 }

 return (
  <div
   className={cn(
    'text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2',
    verticalAlign === 'top' ? 'pb-3' : 'pt-3',
    className,
   )}
  >
   {payload.map((item) => {
    const key = `${nameKey || item.dataKey || 'value'}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)

    return (
     <div
      key={item.value}
      className={
       '[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3'
      }
     >
      {itemConfig?.icon && !hideIcon ? (
       <itemConfig.icon />
      ) : (
       <div
        className="h-2 w-2 shrink-0 rounded-[2px]"
        style={{
         backgroundColor: item.color,
        }}
       />
      )}
      <span>{itemConfig?.label || item.value}</span>
     </div>
    )
   })}
  </div>
 )
}

function ChartSideLegend({
 items,
 className,
}: React.ComponentProps<'div'> & {
 items: ChartSideLegendItem[]
}) {
 if (!items.length) {
  return null
 }

 return (
  <div
   className={cn(
    'text-muted-foreground grid min-w-0 content-center gap-2 text-xs',
    className,
   )}
  >
   {items.map((item) => (
    <div
     key={item.key}
     className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 leading-tight"
    >
     <span
      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
      style={{ backgroundColor: item.color }}
     />
     <span className="min-w-0 break-words font-medium text-foreground/85">
      {item.label}
     </span>
     {item.detail ? (
      <span className="text-right font-semibold tabular-nums text-foreground">
       {item.detail}
      </span>
     ) : null}
     {item.value ? (
      <span className="col-start-2 col-end-4 min-w-0 truncate text-[11px] tabular-nums text-muted-foreground">
       {item.value}
      </span>
     ) : null}
    </div>
   ))}
  </div>
 )
}

function ChartInteractiveLegend({
 items,
 activeKey,
 onActiveChange,
 className,
}: {
 items: ChartInteractiveLegendItem[]
 activeKey?: string | null
 onActiveChange?: (key: string | null) => void
 className?: string
}) {
 if (!items.length) return null

 return (
  <div className={cn('mb-3 flex flex-wrap gap-x-4 gap-y-2', className)}>
   {items.map((item) => (
    <button
     key={item.key}
     type="button"
     aria-pressed={activeKey === item.key}
     className={cn(
      'flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-[background-color,color,opacity]',
      activeKey === item.key && 'bg-muted/40 text-foreground',
      activeKey && activeKey !== item.key && 'opacity-40',
      'hover:bg-muted/20 focus-visible:bg-muted/20 focus-visible:text-foreground',
     )}
     onMouseEnter={() => onActiveChange?.(item.key)}
     onMouseLeave={() => onActiveChange?.(null)}
     onFocus={() => onActiveChange?.(item.key)}
     onBlur={() => onActiveChange?.(null)}
    >
     <span
      className="h-2.5 w-2.5 shrink-0 rounded-sm"
      style={{ backgroundColor: item.color }}
     />
     {item.label}
    </button>
   ))}
  </div>
 )
}

function ChartValueTooltipContent({
 active,
 payload,
 label,
 valueLabel,
 visibleDataKey,
 formatValue = (value) => String(value),
 formatLabel,
}: {
 active?: boolean
 payload?: ChartTooltipPayloadItem[]
 label?: React.ReactNode
 valueLabel?: React.ReactNode
 visibleDataKey?: string | null
 formatValue?: (value: number) => React.ReactNode
 formatLabel?: (label: React.ReactNode) => React.ReactNode
}) {
 const visibleItems = payload?.filter(
  (item) =>
   item.value !== null &&
   item.value !== undefined &&
   (!visibleDataKey || String(item.dataKey) === visibleDataKey),
 )

 if (!active || !visibleItems?.length) return null

 const payloadLabel = visibleItems[0]?.payload?.label
 const rawHeading =
  label ??
  (typeof payloadLabel === 'string' || typeof payloadLabel === 'number'
   ? payloadLabel
   : visibleItems[0]?.name)
 const heading = formatLabel ? formatLabel(rawHeading) : rawHeading

 return (
  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
   {heading ? <p className="mb-1 font-medium text-foreground">{heading}</p> : null}
   <div className="grid gap-1">
    {visibleItems.map((item) => {
     const fill = item.payload?.fill
     return (
      <div key={String(item.dataKey)} className="flex items-center gap-2">
       <span
        className="inline-block h-2 w-2 shrink-0 rounded-sm"
        style={{
         backgroundColor:
          item.color ?? (typeof fill === 'string' ? fill : undefined),
        }}
       />
       <span className="text-muted-foreground">{valueLabel ?? item.name}:</span>
       <span className="font-medium tabular-nums text-foreground">
        {formatValue(Number(item.value))}
       </span>
      </div>
     )
    })}
   </div>
  </div>
 )
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
 config: ChartConfig,
 payload: unknown,
 key: string,
) {
 if (typeof payload !== 'object' || payload === null) {
  return undefined
 }

 const payloadPayload =
  'payload' in payload &&
  typeof payload.payload === 'object' &&
  payload.payload !== null
   ? payload.payload
   : undefined

 let configLabelKey: string = key

 if (
  key in payload &&
  typeof payload[key as keyof typeof payload] === 'string'
 ) {
  configLabelKey = payload[key as keyof typeof payload] as string
 } else if (
  payloadPayload &&
  key in payloadPayload &&
  typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
 ) {
  configLabelKey = payloadPayload[
   key as keyof typeof payloadPayload
  ] as string
 }

 return configLabelKey in config
  ? config[configLabelKey]
  : config[key as keyof typeof config]
}

export {
 ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
 ChartLegendContent,
 ChartSideLegend,
 ChartInteractiveLegend,
 ChartValueTooltipContent,
  ChartStyle,
}
