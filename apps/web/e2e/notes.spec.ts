import { expect, test, type Locator, type Page } from '@playwright/test'
import { deleteE2EBoards, deleteE2ENotes, e2eName, unlock } from './helpers'

const column = (page: Page, name: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name, exact: true }) })

const titlesIn = (page: Page, name: string) => column(page, name).locator('ol > li').allInnerTexts()

const notesPanel = (page: Page) => page.getByRole('complementary', { name: 'Notas' })

async function createBoard(page: Page, label: string) {
  const res = await page.request.post('/api/boards', {
    data: { name: e2eName(label), color: 'green' },
  })
  expect(res.status()).toBe(201)
  return (await res.json()) as { id: string; slug: string; name: string }
}

/** Escribe una nota común (sin los corchetes con los que arranca): cada línea con Shift+Enter. */
async function writeNote(composer: Locator, lines: string[]) {
  await composer.fill('')
  for (const [index, line] of lines.entries()) {
    if (index > 0) await composer.press('Shift+Enter')
    await composer.pressSequentially(line)
  }
}

async function dragTo(page: Page, source: Locator, target: Locator) {
  // Con el panel de notas abierto, la columna puede quedar fuera de vista.
  await source.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('No se pudo medir el arrastre')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 12, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2ENotes(page.request)
  await deleteE2EBoards(page.request)
})

test('una nota en General crea la tarjeta en otro tablero, se tilda, se mueve y se borra', async ({
  page,
}) => {
  const board = await createBoard(page, 'notas')
  // Título único: General es compartido entre corridas.
  const title = `llamar al cliente ${board.slug.slice(-6)}`
  // Una tarjeta previa para comprobar que la nueva va al final de "Por hacer".
  const detail = (await (await page.request.get(`/api/boards/${board.id}`)).json()) as {
    columns: { id: string; name: string }[]
  }
  const todoId = detail.columns.find((c) => c.name === 'Por hacer')!.id
  await page.request.post('/api/tasks', { data: { columnId: todoId, title: 'tarea previa' } })

  // Escribir desde General.
  await page.goto('/b/general')
  const panel = notesPanel(page)
  const composer = panel.getByRole('combobox', { name: 'Nueva nota en General' })
  await composer.fill(`[] ${title} @${board.slug}`)
  await expect(panel.getByText(`1 tarea → ${board.name}`)).toBeVisible()
  const created = page.waitForResponse((r) => r.url().endsWith('/api/notes') && r.status() === 201)
  await composer.press('Enter')
  await created
  await expect(composer).toHaveValue('[] ')

  const note = panel.locator('article', { hasText: title })
  await expect(note.getByRole('checkbox', { name: `Tildar ${title}` })).not.toBeChecked()
  await expect(note.getByText(board.name)).toBeVisible()

  // La tarjeta está al final de "Por hacer" del otro tablero.
  await page.goto(`/b/${board.slug}`)
  await expect.poll(() => titlesIn(page, 'Por hacer')).toEqual(['tarea previa', title])

  // Tildarla en la nota la pasa a "Hecho".
  await page.goto('/b/general')
  // Esperar la respuesta: page.goto cortaría el pedido en vuelo.
  const toggled = page.waitForResponse((r) => r.url().includes('/toggle-done') && r.ok())
  await note.getByRole('checkbox', { name: `Tildar ${title}` }).check()
  await toggled
  await expect(note.getByRole('checkbox', { name: `Destildar ${title}` })).toBeChecked()
  await page.goto(`/b/${board.slug}`)
  await expect.poll(() => titlesIn(page, 'Hecho')).toEqual([title])

  // Moverla en el tablero actualiza el checkbox de la nota.
  const moved = page.waitForResponse((r) => r.url().includes('/move') && r.ok())
  await dragTo(
    page,
    column(page, 'Hecho').getByRole('button', { name: title, exact: true }),
    column(page, 'En curso'),
  )
  await moved
  await page.goto('/b/general')
  await expect(note.getByRole('checkbox', { name: `Tildar ${title}` })).not.toBeChecked()

  // Borrar la nota deja la tarjeta.
  await note.getByRole('button', { name: 'Borrar nota' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar nota' }).click()
  await expect(note).toHaveCount(0)
  await page.goto(`/b/${board.slug}`)
  await expect.poll(() => titlesIn(page, 'En curso')).toEqual([title])
})

test('el composer arranca con [] y cada Enter crea una tarjeta', async ({ page }) => {
  const board = await createBoard(page, 'de-a-una')
  await page.goto(`/b/${board.slug}`)
  const composer = notesPanel(page).getByRole('combobox', { name: `Nueva nota en ${board.name}` })
  await expect(composer).toHaveValue('[] ')

  await composer.click()
  for (const title of ['llamar a Juan', 'mandar el presupuesto']) {
    await composer.pressSequentially(title)
    const created = page.waitForResponse(
      (r) => r.url().endsWith('/api/notes') && r.status() === 201,
    )
    await composer.press('Enter')
    await created
    // Queda listo para la próxima, sin sacar las manos del teclado.
    await expect(composer).toHaveValue('[] ')
    await expect(composer).toBeFocused()
  }
  await expect
    .poll(() => titlesIn(page, 'Por hacer'))
    .toEqual(['llamar a Juan', 'mandar el presupuesto'])

  // Enter con los corchetes solos no manda nada.
  await composer.press('Enter')
  await expect(composer).toHaveValue('[] ')
  await expect(notesPanel(page).locator('article')).toHaveCount(2)
})

test('composer: chips, autocompletado de @, vista previa y borrador', async ({ page }) => {
  const board = await createBoard(page, 'composer')
  await page.goto(`/b/${board.slug}`)
  const panel = notesPanel(page)
  const composer = panel.getByRole('combobox', { name: `Nueva nota en ${board.name}` })

  await writeNote(composer, ['Charla con el equipo', 'revisar presupuesto'])
  // El chip [ ] marca la línea donde está el cursor.
  await panel.getByRole('button', { name: 'Convertir la línea en tarea' }).click()
  await expect(composer).toHaveValue('Charla con el equipo\n[] revisar presupuesto')
  await expect(panel.getByText(`1 tarea → ${board.name}`)).toBeVisible()

  // El chip @ abre el autocompletado y Enter elige el tablero.
  await composer.press('End')
  await panel.getByRole('button', { name: 'Mandar a un tablero' }).click()
  await expect(panel.getByRole('listbox', { name: 'Tableros' })).toBeVisible()
  await composer.pressSequentially('gen')
  await expect(panel.getByRole('option', { name: /General/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await composer.press('Enter')
  await expect(composer).toHaveValue('Charla con el equipo\n[] revisar presupuesto @general ')
  await expect(panel.getByText('1 tarea → General')).toBeVisible()

  // El borrador sobrevive a recargar.
  await page.reload()
  await expect(
    notesPanel(page).getByRole('combobox', { name: `Nueva nota en ${board.name}` }),
  ).toHaveValue('Charla con el equipo\n[] revisar presupuesto @general ')
})

test('si la tarjeta se borra, la línea queda tachada; los links se pueden abrir', async ({
  page,
}) => {
  const board = await createBoard(page, 'tachado')
  const res = await page.request.post('/api/notes', {
    data: { boardId: board.id, content: 'Ver https://example.com/doc\n[] mandar mail' },
  })
  const note = (await res.json()) as { tasks: { id: string }[] }
  await page.request.delete(`/api/tasks/${note.tasks[0]!.id}`)

  await page.goto(`/b/${board.slug}`)
  const panel = notesPanel(page)
  await expect(panel.getByRole('link', { name: 'https://example.com/doc' })).toHaveAttribute(
    'href',
    'https://example.com/doc',
  )
  const struck = panel.getByText('mandar mail')
  await expect(struck).toBeVisible()
  await expect(struck).toHaveCSS('text-decoration-line', 'line-through')
  await expect(panel.getByRole('checkbox')).toHaveCount(0)
})

test('carga 50 notas y trae las anteriores al scrollear hacia arriba', async ({ page }) => {
  // Crear 55 notas de a una contra la base remota lleva su tiempo.
  test.slow()
  const board = await createBoard(page, 'scroll')
  for (let i = 1; i <= 55; i++) {
    await page.request.post('/api/notes', {
      data: { boardId: board.id, content: `nota número ${i}` },
    })
  }

  await page.goto(`/b/${board.slug}`)
  const panel = notesPanel(page)
  // Arranca abajo de todo, con la más nueva a la vista.
  await expect(panel.getByText('nota número 55', { exact: true })).toBeInViewport()
  await expect(panel.getByText('nota número 5', { exact: true })).toHaveCount(0)

  await panel.getByText('nota número 6', { exact: true }).scrollIntoViewIfNeeded()
  await expect(panel.getByText('nota número 1', { exact: true })).toBeAttached()
  await expect(panel.locator('article')).toHaveCount(55)
})

test('el detalle de la tarjeta linkea a su nota de origen', async ({ page }) => {
  const board = await createBoard(page, 'origen')
  const general = (await (await page.request.get('/api/boards')).json()) as {
    id: string
    slug: string
  }[]
  const generalId = general.find((b) => b.slug === 'general')!.id
  const res = await page.request.post('/api/notes', {
    data: { boardId: generalId, content: `De la reunión\n[] revisar contrato @${board.slug}` },
  })
  const note = (await res.json()) as { id: string }

  await page.goto(`/b/${board.slug}`)
  await page.getByRole('button', { name: 'revisar contrato', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Tarjeta' })
    .getByRole('link', { name: 'Ver la nota en General' })
    .click()

  await page.waitForURL(
    (url) => url.pathname === '/b/general' && url.searchParams.get('nota') === note.id,
  )
  const target = notesPanel(page).locator(`article[data-note-id="${note.id}"]`)
  await expect(target).toHaveAttribute('aria-current', 'true')
  await expect(target).toBeInViewport()
})
