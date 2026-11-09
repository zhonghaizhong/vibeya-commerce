import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261107162602 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "vibeya_ai_job" ("id" text not null, "customer_id" text not null, "status" text not null, "prompt" text not null, "product_id" text not null, "color" text not null, "print_placement" text not null, "references" text not null, "image" text not null default '', "error" text not null default '', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vibeya_ai_job_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vibeya_ai_job_deleted_at" ON "vibeya_ai_job" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vibeya_ai_job" cascade;`);
  }

}
