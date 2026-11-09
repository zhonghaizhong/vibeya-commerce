import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261108075431 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vibeya_ai_job" add column if not exists "provider_task_id" text not null default '';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vibeya_ai_job" drop column if exists "provider_task_id";`);
  }

}
