CREATE TABLE `experiment_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_session_id` text NOT NULL,
	`experiment_version_id` text NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`question_order_json` text DEFAULT '[]' NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`participant_session_id`) REFERENCES `participant_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`experiment_version_id`) REFERENCES `experiment_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `experiment_runs_participant_session_idx` ON `experiment_runs` (`participant_session_id`);--> statement-breakpoint
CREATE INDEX `experiment_runs_experiment_version_idx` ON `experiment_runs` (`experiment_version_id`);--> statement-breakpoint
CREATE TABLE `experiment_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experiment_versions_experiment_version_unique` ON `experiment_versions` (`experiment_id`,`version`);--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experiments_slug_unique` ON `experiments` (`slug`);--> statement-breakpoint
CREATE TABLE `participant_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tipi_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_version_id` text NOT NULL,
	`item_number` integer NOT NULL,
	`prompt` text NOT NULL,
	`scale` text NOT NULL,
	`scoring` text NOT NULL,
	FOREIGN KEY (`experiment_version_id`) REFERENCES `experiment_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tipi_questions_version_item_unique` ON `tipi_questions` (`experiment_version_id`,`item_number`);--> statement-breakpoint
CREATE INDEX `tipi_questions_version_idx` ON `tipi_questions` (`experiment_version_id`);--> statement-breakpoint
CREATE TABLE `tipi_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`question_id` text NOT NULL,
	`trial_index` integer NOT NULL,
	`response` text NOT NULL,
	`score` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `experiment_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `tipi_questions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tipi_responses_run_trial_unique` ON `tipi_responses` (`run_id`,`trial_index`);--> statement-breakpoint
CREATE INDEX `tipi_responses_run_idx` ON `tipi_responses` (`run_id`);--> statement-breakpoint
CREATE TABLE `tipi_results` (
	`run_id` text PRIMARY KEY NOT NULL,
	`extroversion` integer NOT NULL,
	`agreeableness` integer NOT NULL,
	`conscientiousness` integer NOT NULL,
	`neuroticism` integer NOT NULL,
	`openness` integer NOT NULL,
	`result_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `experiment_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
