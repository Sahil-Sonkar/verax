import { Badge } from '@/components/ui/badge'
import { categoryColor, inkOn } from '../lib/colors'
import type { NamedScore } from '../types'

export function CategorySnacks({ categories }: { categories: NamedScore[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const color = categoryColor(category.name, category.color)
        return (
          <Badge
            key={category.name}
            variant="secondary"
            className="gap-1.5 border-transparent"
            style={{ background: color, color: inkOn(color) }}
          >
            {category.name}
            <span className="tabular opacity-90">{category.percent}%</span>
          </Badge>
        )
      })}
    </div>
  )
}
