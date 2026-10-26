-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "day" DATE;

-- Lo anotado en Hoy pasa a ser tareas de General con su día (escrito a mano: Prisma solo ve que
-- se borra la tabla). Lo pendiente va al final de la primera columna normal y lo tachado al final
-- de la de terminadas, en el orden en que se anotó. Las claves de orden son la última de la
-- columna con "0001V", "0002V"… agregado: quedan después de todo lo que había y son claves de
-- fractional indexing válidas (no terminan en "0").
WITH general AS (
  SELECT "id" FROM "Board" WHERE "isGeneral" ORDER BY "createdAt" LIMIT 1
),
todo_column AS (
  SELECT c."id" FROM "Column" c JOIN general g ON c."boardId" = g."id"
  WHERE NOT c."isDone" ORDER BY c."position" COLLATE "C" LIMIT 1
),
done_column AS (
  SELECT c."id" FROM "Column" c JOIN general g ON c."boardId" = g."id"
  WHERE c."isDone" LIMIT 1
),
items AS (
  SELECT
    d.*,
    CASE WHEN d."doneAt" IS NULL THEN (SELECT "id" FROM todo_column)
         ELSE (SELECT "id" FROM done_column) END AS "columnId",
    row_number() OVER (
      PARTITION BY d."doneAt" IS NULL ORDER BY d."day", d."createdAt", d."id"
    ) AS n
  FROM "DayItem" d
)
INSERT INTO "Task" ("id", "boardId", "columnId", "title", "position", "completedAt", "day", "createdAt", "updatedAt")
SELECT
  i."id",
  (SELECT "id" FROM general),
  i."columnId",
  i."text",
  COALESCE(
    (SELECT max(t."position" COLLATE "C") FROM "Task" t WHERE t."columnId" = i."columnId"),
    'a0'
  ) || lpad(i.n::text, 4, '0') || 'V',
  i."doneAt",
  i."day",
  i."createdAt",
  i."updatedAt"
FROM items i
WHERE i."columnId" IS NOT NULL;

-- DropTable
DROP TABLE "DayItem";
