CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_session_id` text NOT NULL,
	`protocol_id` text NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`task_order_json` text DEFAULT '[]' NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`participant_session_id`) REFERENCES `participant_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_sessions_participant_session_idx` ON `study_sessions` (`participant_session_id`);--> statement-breakpoint
CREATE INDEX `study_sessions_protocol_idx` ON `study_sessions` (`protocol_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_sessions_participant_protocol_unique` ON `study_sessions` (`participant_session_id`,`protocol_id`);--> statement-breakpoint
CREATE TABLE `study_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`study_session_id` text NOT NULL,
	`experiment_slug` text NOT NULL,
	`position` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`run_id` text,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`study_session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `experiment_runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `study_tasks_study_session_idx` ON `study_tasks` (`study_session_id`);--> statement-breakpoint
CREATE INDEX `study_tasks_run_idx` ON `study_tasks` (`run_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_tasks_session_position_unique` ON `study_tasks` (`study_session_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_tasks_session_experiment_unique` ON `study_tasks` (`study_session_id`,`experiment_slug`);