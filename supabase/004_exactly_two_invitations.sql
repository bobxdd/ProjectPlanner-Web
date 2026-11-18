-- Exactly two invitations, with no third code even if the accounts have not been created.
-- Run after 003_two_person_workspace.sql, when planner_invites is empty.
-- This is already applied to the connected production project.
alter table public.planner_invites
 add column slot smallint not null unique check (slot in (1,2));
