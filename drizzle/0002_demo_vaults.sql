CREATE TABLE IF NOT EXISTS "demo_vaults" (
	"vault_account_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"state" jsonb NOT NULL,
	"withdrawn" numeric(78, 0) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demo_vaults" ADD CONSTRAINT "demo_vaults_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
