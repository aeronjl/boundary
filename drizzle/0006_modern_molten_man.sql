CREATE TABLE `study_session_reviews` (
	`study_session_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'included' NOT NULL,
	`reason` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`study_session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_session_reviews_status_idx` ON `study_session_reviews` (`status`);--> statement-breakpoint
CREATE INDEX `study_session_reviews_reason_idx` ON `study_session_reviews` (`reason`);