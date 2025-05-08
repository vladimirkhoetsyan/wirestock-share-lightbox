-- AlterTable
ALTER TABLE "lightboxes" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "media_items" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;
