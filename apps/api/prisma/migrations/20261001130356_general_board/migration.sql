-- Inbox pasa a ser General: la misma fila, con otro nombre (sin perder el dato).
ALTER TABLE "Board" RENAME COLUMN "isInbox" TO "isGeneral";

UPDATE "Board" SET "name" = 'General', "updatedAt" = NOW() WHERE "isGeneral";

-- El slug `general`, si no lo usa ya otro tablero.
UPDATE "Board" SET "slug" = 'general'
WHERE "isGeneral" AND NOT EXISTS (SELECT 1 FROM "Board" WHERE "slug" = 'general');
