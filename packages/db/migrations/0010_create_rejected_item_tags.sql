CREATE TABLE "rejected_item_tags" (
	"item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tag_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rejected_item_tags_item_id_tag_name_pk" PRIMARY KEY("item_id","tag_name"),
	CONSTRAINT "rejected_item_tags_tag_name_is_slug" CHECK ("rejected_item_tags"."tag_name" ~ '^[a-z0-9+#.]+(-[a-z0-9+#.]+)*$' AND char_length("rejected_item_tags"."tag_name") <= 50)
);
--> statement-breakpoint
ALTER TABLE "rejected_item_tags" ADD CONSTRAINT "rejected_item_tags_item_id_user_id_items_fk" FOREIGN KEY ("item_id","user_id") REFERENCES "public"."items"("id","user_id") ON DELETE cascade ON UPDATE no action;