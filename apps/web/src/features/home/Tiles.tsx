import {
  boardStatus,
  laneOf,
  sortByPosition,
  type BoardSummary,
  type Lane,
  type Overview,
} from '@notnot/shared'
import { Check, Sun } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { boardStyle } from '../boards/colors'
import { isForToday } from '../today/format'
import { FROM_HOME } from './navigation'

const STATUS_LABEL: Record<Lane, string> = {
  todo: 'Por hacer',
  doing: 'En curso',
  done: 'Al día',
}

const STATUS_INK: Record<Lane, string> = {
  todo: 'text-status-todo',
  doing: 'text-status-doing',
  done: 'text-status-done',
}

type TileProps = {
  to: string
  /** `data-tile`: de acá sale el panel y acá vuelve. */
  tile: string
  color: string
  /** Lo que lee un lector de pantalla: "Pepito: en curso, 4 abiertas, 2 para hoy". */
  label: string
  /** El estado del tablero (`data-status`). */
  status: Lane
  children: ReactNode
}

function Tile({ to, tile, color, label, status, children }: TileProps) {
  return (
    <li className="min-w-0">
      <Link
        to={to}
        state={FROM_HOME}
        data-tile={tile}
        aria-label={label}
        data-status={status}
        style={{ '--tile': color } as CSSProperties}
        className="flex aspect-square min-w-0 flex-col gap-2.5 rounded-xl border border-[color:color-mix(in_oklab,var(--tile)_50%,var(--border))] bg-[color-mix(in_oklab,oklch(from_var(--tile)_max(l,0.8)_c_h)_var(--tile-tint),var(--card))] p-3.5 outline-none transition-colors hover:border-[color:color-mix(in_oklab,var(--tile)_75%,var(--border))] focus-visible:ring-2 focus-visible:ring-ring max-md:gap-2 max-md:p-3"
      >
        {children}
      </Link>
    </li>
  )
}

function TileTop({ icon, name, extra }: { icon: ReactNode; name: string; extra?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="flex min-w-0 items-start gap-2 text-[14px] leading-[18px] font-semibold">
        {icon}
        <span className="line-clamp-2 break-words">{name}</span>
      </span>
      {extra}
    </div>
  )
}

type PreviewItem = {
  key: string
  text: string
  marker: 'doing' | 'today' | 'open'
}

const MARKER_CLASS: Record<PreviewItem['marker'], string> = {
  // Medio lleno: está en curso.
  doing: 'border-status-doing bg-[linear-gradient(90deg,var(--status-doing)_50%,transparent_50%)]',
  today: 'border-sun',
  open: 'border-muted-foreground/50',
}

function TilePreview({ items, empty }: { items: PreviewItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>
  return (
    <ul className="grid gap-1.5 text-xs leading-4 text-muted-foreground">
      {items.map((item) => (
        <li
          key={item.key}
          className={cn(
            'flex min-w-0 items-center gap-2',
            item.marker === 'doing' && 'text-foreground',
          )}
        >
          <span
            aria-hidden="true"
            className={cn('size-2 shrink-0 rounded-full border-[1.5px]', MARKER_CLASS[item.marker])}
          />
          <span className="min-w-0 truncate">{item.text}</span>
        </li>
      ))}
    </ul>
  )
}

function TileFoot({ value, label, status }: { value: string; label: string; status: Lane }) {
  return (
    <div className="mt-auto flex min-w-0 items-baseline gap-1.5">
      <span className="shrink-0 text-[28px] leading-none font-semibold tracking-tight tabular-nums max-md:text-[26px]">
        {value}
      </span>
      <span className="min-w-0 truncate text-xs text-muted-foreground">{label}</span>
      {/* La palabra del estado, en su tinta: así no depende solo del color. */}
      <span className={cn('ml-auto shrink-0 text-xs font-semibold', STATUS_INK[status])}>
        {STATUS_LABEL[status]}
      </span>
    </div>
  )
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

export function BoardTile({
  board,
  overview,
  today,
}: {
  board: BoardSummary
  overview: Overview
  today: string
}) {
  const columns = overview.columns.filter((c) => c.boardId === board.id)
  const laneById = new Map(columns.map((c) => [c.id, laneOf(c, columns)]))
  const tasks = overview.tasks.filter((t) => t.boardId === board.id)
  const open = tasks.filter((t) => t.completedAt === null)
  const forToday = open.filter((t) => isForToday(t, today)).length
  const done = tasks.length - open.length
  const doing = (columnId: string) => laneById.get(columnId) === 'doing'
  // Primero lo que está en curso, después lo de hoy y después el resto, en su orden.
  const rank = (columnId: string, task: (typeof open)[number]) =>
    doing(columnId) ? 0 : isForToday(task, today) ? 1 : 2
  const preview = sortByPosition(open)
    .sort((a, b) => rank(a.columnId, a) - rank(b.columnId, b))
    .slice(0, 3)
  // El cuadrado se pinta con el estado; el color del tablero queda en el punto.
  const status = boardStatus(columns, tasks)

  return (
    <Tile
      to={`/b/${board.slug}`}
      tile={`b:${board.id}`}
      color={`var(--status-${status})`}
      status={status}
      label={`${board.name}: ${STATUS_LABEL[status].toLowerCase()}, ${open.length} ${plural(open.length, 'abierta', 'abiertas')}${forToday ? `, ${forToday} para hoy` : ''}`}
    >
      <TileTop
        icon={
          <span
            aria-hidden="true"
            style={boardStyle(board.color)}
            className="mt-1.25 size-2 shrink-0 rounded-full bg-(--board)"
          />
        }
        name={board.name}
        extra={
          (forToday > 0 || done > 0) && (
            <span className="flex shrink-0 items-center gap-2 leading-[18px]">
              {forToday > 0 && (
                <span
                  title="Para hoy"
                  className="flex items-center gap-0.5 text-xs font-semibold text-sun-ink tabular-nums"
                >
                  <Sun aria-hidden="true" className="size-3.5 fill-current" />
                  {forToday}
                </span>
              )}
              {done > 0 && (
                <span
                  title="Tachadas hoy"
                  className="flex items-center gap-0.5 text-xs text-status-done tabular-nums"
                >
                  <Check aria-hidden="true" strokeWidth={2.6} className="size-3" />
                  {done}
                </span>
              )}
            </span>
          )
        }
      />
      <TilePreview
        empty="Todo al día."
        items={preview.map((task) => ({
          key: task.id,
          text: task.title,
          marker: doing(task.columnId) ? 'doing' : isForToday(task, today) ? 'today' : 'open',
        }))}
      />
      <TileFoot
        value={String(open.length)}
        label={plural(open.length, 'abierta', 'abiertas')}
        status={status}
      />
    </Tile>
  )
}

/** Mientras cargan: los cuadrados vacíos, con su forma. */
export function TileSkeletons({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <li
      key={index}
      aria-hidden="true"
      className="aspect-square animate-pulse rounded-xl bg-muted"
    />
  ))
}
