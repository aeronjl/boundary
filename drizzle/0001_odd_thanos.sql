CREATE TABLE `experiment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`event_type` text NOT NULL,
	`trial_index` integer,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `experiment_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `experiment_events_run_idx` ON `experiment_events` (`run_id`);--> statement-breakpoint
CREATE INDEX `experiment_events_run_event_type_idx` ON `experiment_events` (`run_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `experiment_events_run_trial_idx` ON `experiment_events` (`run_id`,`trial_index`);--> statement-breakpoint
CREATE TABLE `experiment_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`trial_index` integer NOT NULL,
	`item_id` text,
	`response_type` text NOT NULL,
	`response_json` text NOT NULL,
	`score_json` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `experiment_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `experiment_responses_run_idx` ON `experiment_responses` (`run_id`);--> statement-breakpoint
CREATE INDEX `experiment_responses_run_trial_idx` ON `experiment_responses` (`run_id`,`trial_index`);--> statement-breakpoint
CREATE INDEX `experiment_responses_run_item_idx` ON `experiment_responses` (`run_id`,`item_id`);