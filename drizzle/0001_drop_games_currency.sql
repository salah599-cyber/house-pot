ALTER TABLE "games" DROP COLUMN IF EXISTS "currency";

DELETE FROM "platform_settings" WHERE "key" = 'default_currency';
