import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261107170959 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vibeya_ai_job" add column if not exists "size" text not null default '';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vibeya_ai_job" drop column if exists "size";`);
  }

}
