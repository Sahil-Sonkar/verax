import { categoryColor } from '../lib/colors'
import type { NamedScore } from '../types'

const LIGHT = new Set(['#fcaf45', '#f9ce34', '#fccc63'])

function snackInk(color: string) {
  return LIGHT.has(color.toLowerCase()) ? '#262626' : '#ffffff'
}

export function CategorySnacks({ categories }: { categories: NamedScore[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const color = categoryColor(category.name, category.color)
        return (
          <span
            key={category.name}
            className="snack"
            style={{ background: color, color: snackInk(color) }}
          >
            {category.name}
            <span className="tabular opacity-90">{category.percent}%</span>
          </span>
        )
      })}
    </div>
  )
}
