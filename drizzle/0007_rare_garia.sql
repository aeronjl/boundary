CREATE TABLE `reference_datasets` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_study_id` text,
	`experiment_slug` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`compatibility` text DEFAULT 'partial' NOT NULL,
	`sample_size` integer,
	`license` text DEFAULT '' NOT NULL,
	`population` text DEFAULT '' NOT NULL,
	`task_variant` text DEFAULT '' NOT NULL,
	`metric_summary_json` text DEFAULT '{}' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reference_study_id`) REFERENCES `reference_studies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reference_datasets_study_idx` ON `reference_datasets` (`reference_study_id`);--> statement-breakpoint
CREATE INDEX `reference_datasets_experiment_slug_idx` ON `reference_datasets` (`experiment_slug`);--> statement-breakpoint
CREATE INDEX `reference_datasets_status_idx` ON `reference_datasets` (`status`);--> statement-breakpoint
CREATE TABLE `reference_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_dataset_id` text NOT NULL,
	`experiment_slug` text NOT NULL,
	`metric_key` text NOT NULL,
	`label` text NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`comparison_type` text DEFAULT 'distribution' NOT NULL,
	`mean` real,
	`standard_deviation` real,
	`minimum` real,
	`maximum` real,
	`metric_json` text DEFAULT '{}' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reference_dataset_id`) REFERENCES `reference_datasets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reference_metrics_dataset_idx` ON `reference_metrics` (`reference_dataset_id`);--> statement-breakpoint
CREATE INDEX `reference_metrics_experiment_metric_idx` ON `reference_metrics` (`experiment_slug`,`metric_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `reference_metrics_dataset_metric_unique` ON `reference_metrics` (`reference_dataset_id`,`metric_key`);--> statement-breakpoint
CREATE TABLE `reference_studies` (
	`id` text PRIMARY KEY NOT NULL,
	`short_citation` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`doi` text,
	`publication_year` integer,
	`source_type` text DEFAULT 'literature' NOT NULL,
	`population` text DEFAULT '' NOT NULL,
	`sample_size` integer,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
