CREATE TABLE `policy_scenario_batch_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`run_id` text NOT NULL,
	`experiment_slug` text NOT NULL,
	`scenario_id` text NOT NULL,
	`scenario_label` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `policy_scenario_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `experiment_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `policy_scenario_batch_runs_batch_idx` ON `policy_scenario_batch_runs` (`batch_id`);--> statement-breakpoint
CREATE INDEX `policy_scenario_batch_runs_scenario_idx` ON `policy_scenario_batch_runs` (`experiment_slug`,`scenario_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `policy_scenario_batch_runs_run_unique` ON `policy_scenario_batch_runs` (`run_id`);--> statement-breakpoint
CREATE TABLE `policy_scenario_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`scenario_count` integer DEFAULT 0 NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `policy_scenario_batches_status_idx` ON `policy_scenario_batches` (`status`);--> statement-breakpoint
CREATE INDEX `policy_scenario_batches_created_idx` ON `policy_scenario_batches` (`created_at`);