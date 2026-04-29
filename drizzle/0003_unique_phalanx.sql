CREATE TABLE `participant_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_session_id` text NOT NULL,
	`consent_version` text NOT NULL,
	`user_agent` text,
	`details_json` text DEFAULT '{}' NOT NULL,
	`accepted_at` integer NOT NULL,
	FOREIGN KEY (`participant_session_id`) REFERENCES `participant_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `participant_consents_session_idx` ON `participant_consents` (`participant_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `participant_consents_session_version_unique` ON `participant_consents` (`participant_session_id`,`consent_version`);