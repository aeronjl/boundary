CREATE TABLE `experiment_run_reviews` (
	`run_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'included' NOT NULL,
	`reason` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `experiment_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `experiment_run_reviews_status_idx` ON `experiment_run_reviews` (`status`);--> statement-breakpoint
CREATE INDEX `experiment_run_reviews_reason_idx` ON `experiment_run_reviews` (`reason`);