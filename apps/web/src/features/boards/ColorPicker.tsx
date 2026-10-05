import { BOARD_COLORS, type BoardColor } from '@notnot/shared'
import { boardStyle, COLOR_LABELS } from './colors'

type Props = {
  value: BoardColor
  onChange: (color: BoardColor) => void
}

/** Radios nativos: se recorren con las flechas como cualquier grupo de radios. */
export function ColorPicker({ value, onChange }: Props) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">Color</legend>
      <div className="grid w-fit grid-cols-7 gap-1">
        {BOARD_COLORS.map((color) => (
          <label
            key={color}
            style={boardStyle(color)}
            title={COLOR_LABELS[color]}
            className="grid size-8 cursor-pointer place-items-center rounded-full"
          >
            <input
              type="radio"
              name="board-color"
              value={color}
              checked={value === color}
              onChange={() => onChange(color)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="size-5 rounded-full bg-(--board) ring-offset-2 ring-offset-popover transition-shadow peer-checked:ring-2 peer-checked:ring-(--board) peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
            />
            <span className="sr-only">{COLOR_LABELS[color]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
