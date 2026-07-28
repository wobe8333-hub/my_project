alter table weekly_plans
  add column week_anchor_pointer integer not null default 1;

alter table weekly_plans
  drop constraint weekly_plans_user_id_week_number_key;

alter table weekly_plans
  add constraint weekly_plans_user_id_anchor_week_key
  unique (user_id, week_anchor_pointer, week_number);
