import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261118000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vibeya_ai_job" add column if not exists "market_country_code" text not null default '';`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vibeya_ai_job" drop column if exists "market_country_code";`)
  }
}
