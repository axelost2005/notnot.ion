import type { BoardSummary } from '@notnot/shared'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { boardStyle } from './colors'

type Props = {
  boards: BoardSummary[]
  /** Id del tablero elegido. */
  value: string
  onValueChange: (boardId: string) => void
  'aria-label': string
  className?: string
  /** Al cerrarse, el foco vuelve al selector salvo que se evite (`preventDefault`). */
  onCloseAutoFocus?: (event: Event) => void
}

/** Desplegable de tableros con el punto de color de cada uno (no el `<select>` del sistema). */
export function BoardSelect({ boards, value, onValueChange, className, ...props }: Props) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={props['aria-label']} className={cn('w-full min-w-0', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent onCloseAutoFocus={props.onCloseAutoFocus}>
        {boards.map((board) => (
          <SelectItem key={board.id} value={board.id}>
            <span
              aria-hidden="true"
              style={boardStyle(board.color)}
              className="size-2 shrink-0 rounded-full bg-(--board)"
            />
            <span className="truncate">{board.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
