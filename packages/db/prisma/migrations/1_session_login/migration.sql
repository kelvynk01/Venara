-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('active', 'expired');

-- AlterEnum
BEGIN;
CREATE TYPE "LoginMode_new" AS ENUM ('none', 'session');
ALTER TABLE "ConnectedApp" ALTER COLUMN "loginMode" DROP DEFAULT;
ALTER TABLE "ConnectedApp" ALTER COLUMN "loginMode" TYPE "LoginMode_new" USING ("loginMode"::text::"LoginMode_new");
ALTER TYPE "LoginMode" RENAME TO "LoginMode_old";
ALTER TYPE "LoginMode_new" RENAME TO "LoginMode";
DROP TYPE "LoginMode_old";
ALTER TABLE "ConnectedApp" ALTER COLUMN "loginMode" SET DEFAULT 'none';
COMMIT;

-- AlterTable
ALTER TABLE "ConnectedApp" ADD COLUMN     "sessionCapturedAt" TIMESTAMP(3),
ADD COLUMN     "sessionStatus" "SessionStatus";

