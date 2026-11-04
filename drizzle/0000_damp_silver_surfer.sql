CREATE TABLE IF NOT EXISTS "buys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"quote_ref" text NOT NULL,
	"amount_in" numeric(78, 0) NOT NULL,
	"target_asset" text NOT NULL,
	"destination_address" text NOT NULL,
	"cost_bps" integer,
	"amount_in_usd" numeric,
	"amount_out" numeric(78, 0),
	"deposit_address" text,
	"quote_signature" text,
	"quote_raw" jsonb,
	"near_tx_hash" text,
	"oneclick_status" text,
	"status" text NOT NULL,
	"destination_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "buys_quote_ref_unique" UNIQUE("quote_ref"),
	CONSTRAINT "buys_deposit_address_unique" UNIQUE("deposit_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "funding_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"origin_asset" text NOT NULL,
	"amount_in" numeric(78, 0) NOT NULL,
	"expected_out" numeric(78, 0) NOT NULL,
	"refund_to" text NOT NULL,
	"deposit_address" text NOT NULL,
	"quote_deadline" timestamp with time zone NOT NULL,
	"quote_signature" text NOT NULL,
	"quote_raw" jsonb NOT NULL,
	"oneclick_status" text,
	"status" text DEFAULT 'awaiting_deposit' NOT NULL,
	"deposit_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funding_attempts_deposit_address_unique" UNIQUE("deposit_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"near_account_id" text NOT NULL,
	"vault_account_id" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_near_account_id_unique" UNIQUE("near_account_id"),
	CONSTRAINT "users_vault_account_id_unique" UNIQUE("vault_account_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "buys" ADD CONSTRAINT "buys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funding_attempts" ADD CONSTRAINT "funding_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "buys_user_idx" ON "buys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funding_attempts_user_idx" ON "funding_attempts" USING btree ("user_id");