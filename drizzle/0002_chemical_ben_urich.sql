DELETE FROM `experiment_responses`
WHERE rowid NOT IN (
	SELECT MIN(rowid)
	FROM `experiment_responses`
	GROUP BY `run_id`, `trial_index`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experiment_responses_run_trial_unique` ON `experiment_responses` (`run_id`,`trial_index`);
