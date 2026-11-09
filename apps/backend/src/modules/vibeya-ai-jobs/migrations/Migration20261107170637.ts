import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261107170637 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vibeya_ai_job" add column if not exists "preserve_original_design" boolean not null default true;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vibeya_ai_job" drop column if exists "preserve_original_design";`);
  }

}
