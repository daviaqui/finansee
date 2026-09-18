import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { currency } from '../lib/format'
import type { DashboardData } from '../types'

type CategorySlice = Omit<DashboardData['expenses_by_category'][number], 'amount'> & { amount: number }

const tooltipWidth = 192
const tooltipHeight = 68
const tooltipGap = 16
const percentage = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function CategoryDonut({ data }: { data: CategorySlice[] }) {
  const [position, setPosition] = useState<{ x: number; y: number }>()

  return (
    <div
      className="donut-wrap"
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        const cardBounds = event.currentTarget.parentElement!.getBoundingClientRect()
        const x = event.clientX - bounds.left
        const y = event.clientY - bounds.top
        const rightEdge = cardBounds.right - bounds.left
        setPosition({
          x: Math.max(0, Math.min(x + tooltipGap, rightEdge - tooltipWidth)),
          y: Math.max(0, Math.min(y >= tooltipHeight + tooltipGap ? y - tooltipHeight - tooltipGap : y + tooltipGap, bounds.height - tooltipHeight)),
        })
      }}
      onMouseLeave={() => setPosition(undefined)}
      onKeyDown={() => setPosition(undefined)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius={57}
            outerRadius={78}
            paddingAngle={3}
            activeShape={{ filter: 'brightness(1.08)', strokeWidth: 3 }}
          >
            {data.map((item) => <Cell key={item.category} fill={item.color} />)}
          </Pie>
          <Tooltip
            position={position}
            offset={tooltipGap}
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 5, pointerEvents: 'none' }}
            content={({ active, payload }) => {
              const item = data.find((entry) => entry.category === payload?.[0]?.name)
              if (!active || !item) return null
              return (
                <div className="category-tooltip" role="status">
                  <div className="category-tooltip-title"><i style={{ background: item.color }} /><span>{item.category}</span></div>
                  <div className="category-tooltip-values"><strong>{currency.format(item.amount)}</strong><span>{percentage.format(item.percentage)}%</span></div>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-label"><strong>{data.length}</strong><span>categorias</span></div>
    </div>
  )
}
