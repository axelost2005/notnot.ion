import { expect, test, type Locator, type Page } from '@playwright/test'
import { deleteE2EBoards, e2eName, unlock } from './helpers'

const column = (page: Page, name: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name, exact: true }) })

const titlesIn = (page: Page, name: string) =>
  column(page, name).locator('ol > li').getByRole('button').allInnerTexts()

const card = (scope: Locator, title: string) =>
  scope.getByRole('button', { name: title, exact: true })

type Seeded = { id: string; slug: string; name: string }

/** Un tablero con "Por hacer" y "Hecho" llenas y "En curso" vacía. */
async function seedBoard(page: Page, label: string): Promise<Seeded> {
  const res = await page.request.post('/api/boards', {
    data: { name: e2eName(label), color: 'blue' },
  })
  const board = (await res.json()) as Seeded
  const detail = (await (await page.request.get(`/api/boards/${board.id}`)).json()) as {
    columns: { id: string; name: string }[]
  }
  const columnId = (name: string) => detail.columns.find((c) => c.name === name)!.id
  for (const [name, titles] of [
    ['Por hacer', ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']],
    ['Hecho', ['listo 1', 'listo 2', 'listo 3', 'listo 4', 'listo 5', 'listo 6', 'listo 7']],
  ] as const) {
    for (const title of titles) {
      await page.request.post('/api/tasks', { data: { columnId: columnId(name), title } })
    }
  }
  return board
}

async function centerOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('No se pudo medir el elemento')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function dragWithMouse(page: Page, source: Locator, to: { x: number; y: number }) {
  const from = await centerOf(source)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x, from.y + 12, { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 20 })
  await page.mouse.up()
}

const moveResponse = (page: Page) =>
  page.waitForResponse((res) => res.url().includes('/move') && res.request().method() === 'POST')

// Cargar las tarjetas de a una contra la base lleva su tiempo.
test.describe.configure({ timeout: 90_000 })

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EBoards(page.request)
})

// En una pantalla alta es donde se notaba: la columna vacía es larga.
test.describe('mouse', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('en un tablero, "En curso" vacía recibe la tarjeta en el medio y sobre el título', async ({
    page,
  }) => {
    const board = await seedBoard(page, 'soltar')
    await page.goto(`/b/${board.slug}`)
    const todo = column(page, 'Por hacer')
    await expect(card(todo, 'nueve')).toBeVisible()

    // En línea recta, a la misma altura, hasta el medio de la columna vacía.
    const source = card(todo, 'siete')
    let moved = moveResponse(page)
    await dragWithMouse(page, source, {
      x: (await centerOf(column(page, 'En curso'))).x,
      y: (await centerOf(source)).y,
    })
    expect((await moved).ok()).toBe(true)
    await expect.poll(() => titlesIn(page, 'En curso')).toEqual(['siete'])

    // Sobre el título de la columna.
    moved = moveResponse(page)
    await dragWithMouse(
      page,
      card(todo, 'cinco'),
      await centerOf(column(page, 'En curso').getByRole('heading', { level: 2 })),
    )
    expect((await moved).ok()).toBe(true)
    await expect.poll(() => titlesIn(page, 'En curso')).toContain('cinco')
    await page.reload()
    await expect.poll(() => titlesIn(page, 'En curso')).toHaveLength(2)
  })

  test('en General, "En curso" recibe la tarjeta sobre el título y sobre el pie', async ({
    page,
  }) => {
    await seedBoard(page, 'soltar-general')
    await page.goto('/b/general')
    const todo = column(page, 'Por hacer')
    const doing = column(page, 'En curso')
    await expect(card(todo, 'dos')).toBeVisible()

    let moved = moveResponse(page)
    await dragWithMouse(
      page,
      card(todo, 'dos'),
      await centerOf(doing.getByRole('heading', { level: 2 })),
    )
    expect((await moved).ok()).toBe(true)
    await expect(card(doing, 'dos')).toBeVisible()

    moved = moveResponse(page)
    await dragWithMouse(
      page,
      card(todo, 'tres'),
      await centerOf(doing.getByRole('button', { name: 'Agregar tarjeta' })),
    )
    expect((await moved).ok()).toBe(true)
    await expect(card(doing, 'tres')).toBeVisible()
  })
})

test.describe('touch', () => {
  test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true })

  /**
   * Long-press, hasta el borde derecho, quedarse ahí hasta que pase a la columna de al lado y
   * soltar en el medio de esa columna. Con eventos touch reales (CDP): Playwright solo sabe tocar.
   */
  async function dragToNextColumn(page: Page, source: Locator) {
    const client = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', at?: { x: number; y: number }) =>
      client.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: at ? [{ x: Math.round(at.x), y: Math.round(at.y) }] : [],
      })
    const glide = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
      for (let i = 1; i <= 8; i++) {
        await touch('touchMove', {
          x: from.x + ((to.x - from.x) * i) / 8,
          y: from.y + ((to.y - from.y) * i) / 8,
        })
        await page.waitForTimeout(30)
      }
    }

    const from = await centerOf(source)
    const edge = { x: 365, y: from.y }
    const scroller = page.locator('#vista-tablero > div').first()
    await touch('touchStart', from)
    await page.waitForTimeout(400)
    await glide(from, edge)
    await expect
      .poll(
        async () => {
          await touch('touchMove', { x: edge.x, y: edge.y + 1 })
          return scroller.evaluate((element) => element.scrollLeft)
        },
        { intervals: [50] },
      )
      .toBeGreaterThan(200)
    await glide(edge, { x: 187, y: from.y })
    await page.waitForTimeout(300)
    await touch('touchEnd')
  }

  test('en un tablero, con long-press y el borde se lleva una tarjeta a "En curso"', async ({
    page,
  }) => {
    const board = await seedBoard(page, 'touch')
    await page.goto(`/b/${board.slug}`)
    const source = card(column(page, 'Por hacer'), 'dos')
    await expect(source).toBeVisible()

    const moved = moveResponse(page)
    await dragToNextColumn(page, source)
    expect((await moved).ok()).toBe(true)
    await expect.poll(() => titlesIn(page, 'En curso')).toEqual(['dos'])
  })

  test('en General, con long-press y el borde se lleva una tarjeta a "En curso"', async ({
    page,
  }) => {
    await seedBoard(page, 'touch-general')
    await page.goto('/b/general')
    const source = card(column(page, 'Por hacer'), 'dos')
    await expect(source).toBeVisible()

    const moved = moveResponse(page)
    await dragToNextColumn(page, source)
    expect((await moved).ok()).toBe(true)
    await expect(card(column(page, 'En curso'), 'dos')).toBeAttached()
  })
})
