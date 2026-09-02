import { Plus, Trash2 } from 'lucide'
import type { ButtonHTMLAttributes } from 'react'
import { Glyph } from './Glyph'

type IconBtnProps = {
  label: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function TrashButton({ label, className = '', type = 'button', ...props }: IconBtnProps) {
  return (
    <button type={type} aria-label={label} title={label} className={`icon-btn icon-btn-danger ${className}`} {...props}>
      <Glyph icon={Trash2} size={16} strokeWidth={1.75} />
    </button>
  )
}

export function AddButton({
  label,
  variant = 'ghost',
  className = '',
  type = 'button',
  ...props
}: IconBtnProps & { variant?: 'ghost' | 'primary' }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`${variant === 'primary' ? 'icon-btn icon-btn-primary' : 'icon-btn icon-btn-add'} ${className}`}
      {...props}
    >
      <Glyph icon={Plus} size={variant === 'primary' ? 20 : 16} strokeWidth={1.75} />
    </button>
  )
}
