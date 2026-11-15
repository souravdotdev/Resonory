CREATE TYPE "public"."tag_origin" AS ENUM('ai', 'user');--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "origin" "tag_origin" DEFAULT 'user' NOT NULL;