CREATE TABLE `reference_cohorts` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_study_id` text,
	`reference_dataset_id` text NOT NULL,
	`label` text NOT NULL,
	`population` text DEFAULT '' NOT NULL,
	`group_label` text DEFAULT '' NOT NULL,
	`sample_size` integer,
	`inclusion_criteria` text DEFAULT '' NOT NULL,
	`exclusion_criteria` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reference_study_id`) REFERENCES `reference_studies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reference_dataset_id`) REFERENCES `reference_datasets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reference_cohorts_study_idx` ON `reference_cohorts` (`reference_study_id`);--> statement-breakpoint
CREATE INDEX `reference_cohorts_dataset_idx` ON `reference_cohorts` (`reference_dataset_id`);--> statement-breakpoint
CREATE TABLE `reference_metric_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_metric_id` text NOT NULL,
	`reference_cohort_id` text,
	`source_metric` text DEFAULT '' NOT NULL,
	`source_columns_json` text DEFAULT '[]' NOT NULL,
	`transformation` text DEFAULT '' NOT NULL,
	`direction` text DEFAULT 'same' NOT NULL,
	`extraction_status` text DEFAULT 'candidate' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reference_metric_id`) REFERENCES `reference_metrics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reference_cohort_id`) REFERENCES `reference_cohorts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reference_metric_mappings_metric_idx` ON `reference_metric_mappings` (`reference_metric_id`);--> statement-breakpoint
CREATE INDEX `reference_metric_mappings_cohort_idx` ON `reference_metric_mappings` (`reference_cohort_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reference_metric_mappings_metric_unique` ON `reference_metric_mappings` (`reference_metric_id`);