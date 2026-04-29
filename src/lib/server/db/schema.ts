import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const experiments = sqliteTable('experiments', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description').notNull().default(''),
	createdAt: integer('created_at').notNull()
});

export const experimentVersions = sqliteTable(
	'experiment_versions',
	{
		id: text('id').primaryKey(),
		experimentId: text('experiment_id')
			.notNull()
			.references(() => experiments.id, { onDelete: 'cascade' }),
		version: integer('version').notNull(),
		status: text('status').notNull().default('draft'),
		configJson: text('config_json').notNull().default('{}'),
		createdAt: integer('created_at').notNull(),
		publishedAt: integer('published_at')
	},
	(table) => [
		uniqueIndex('experiment_versions_experiment_version_unique').on(
			table.experimentId,
			table.version
		)
	]
);

export const participantSessions = sqliteTable('participant_sessions', {
	id: text('id').primaryKey(),
	userAgent: text('user_agent'),
	createdAt: integer('created_at').notNull(),
	lastSeenAt: integer('last_seen_at').notNull()
});

export const participantConsents = sqliteTable(
	'participant_consents',
	{
		id: text('id').primaryKey(),
		participantSessionId: text('participant_session_id')
			.notNull()
			.references(() => participantSessions.id, { onDelete: 'cascade' }),
		consentVersion: text('consent_version').notNull(),
		userAgent: text('user_agent'),
		detailsJson: text('details_json').notNull().default('{}'),
		acceptedAt: integer('accepted_at').notNull()
	},
	(table) => [
		index('participant_consents_session_idx').on(table.participantSessionId),
		uniqueIndex('participant_consents_session_version_unique').on(
			table.participantSessionId,
			table.consentVersion
		)
	]
);

export const experimentRuns = sqliteTable(
	'experiment_runs',
	{
		id: text('id').primaryKey(),
		participantSessionId: text('participant_session_id')
			.notNull()
			.references(() => participantSessions.id, { onDelete: 'cascade' }),
		experimentVersionId: text('experiment_version_id')
			.notNull()
			.references(() => experimentVersions.id, { onDelete: 'cascade' }),
		status: text('status').notNull().default('started'),
		questionOrderJson: text('question_order_json').notNull().default('[]'),
		startedAt: integer('started_at').notNull(),
		completedAt: integer('completed_at')
	},
	(table) => [
		index('experiment_runs_participant_session_idx').on(table.participantSessionId),
		index('experiment_runs_experiment_version_idx').on(table.experimentVersionId)
	]
);

export const studySessions = sqliteTable(
	'study_sessions',
	{
		id: text('id').primaryKey(),
		participantSessionId: text('participant_session_id')
			.notNull()
			.references(() => participantSessions.id, { onDelete: 'cascade' }),
		protocolId: text('protocol_id').notNull(),
		status: text('status').notNull().default('started'),
		taskOrderJson: text('task_order_json').notNull().default('[]'),
		startedAt: integer('started_at').notNull(),
		completedAt: integer('completed_at'),
		updatedAt: integer('updated_at').notNull()
	},
	(table) => [
		index('study_sessions_participant_session_idx').on(table.participantSessionId),
		index('study_sessions_protocol_idx').on(table.protocolId),
		uniqueIndex('study_sessions_participant_protocol_unique').on(
			table.participantSessionId,
			table.protocolId
		)
	]
);

export const studyTasks = sqliteTable(
	'study_tasks',
	{
		id: text('id').primaryKey(),
		studySessionId: text('study_session_id')
			.notNull()
			.references(() => studySessions.id, { onDelete: 'cascade' }),
		experimentSlug: text('experiment_slug').notNull(),
		position: integer('position').notNull(),
		status: text('status').notNull().default('pending'),
		runId: text('run_id').references(() => experimentRuns.id, { onDelete: 'set null' }),
		startedAt: integer('started_at'),
		completedAt: integer('completed_at')
	},
	(table) => [
		index('study_tasks_study_session_idx').on(table.studySessionId),
		index('study_tasks_run_idx').on(table.runId),
		uniqueIndex('study_tasks_session_position_unique').on(table.studySessionId, table.position),
		uniqueIndex('study_tasks_session_experiment_unique').on(
			table.studySessionId,
			table.experimentSlug
		)
	]
);

export const studySessionReviews = sqliteTable(
	'study_session_reviews',
	{
		studySessionId: text('study_session_id')
			.primaryKey()
			.references(() => studySessions.id, { onDelete: 'cascade' }),
		status: text('status').notNull().default('included'),
		reason: text('reason'),
		note: text('note').notNull().default(''),
		createdAt: integer('created_at').notNull(),
		updatedAt: integer('updated_at').notNull()
	},
	(table) => [
		index('study_session_reviews_status_idx').on(table.status),
		index('study_session_reviews_reason_idx').on(table.reason)
	]
);

export const experimentRunReviews = sqliteTable(
	'experiment_run_reviews',
	{
		runId: text('run_id')
			.primaryKey()
			.references(() => experimentRuns.id, { onDelete: 'cascade' }),
		status: text('status').notNull().default('included'),
		reason: text('reason'),
		note: text('note').notNull().default(''),
		createdAt: integer('created_at').notNull(),
		updatedAt: integer('updated_at').notNull()
	},
	(table) => [
		index('experiment_run_reviews_status_idx').on(table.status),
		index('experiment_run_reviews_reason_idx').on(table.reason)
	]
);

export const experimentEvents = sqliteTable(
	'experiment_events',
	{
		id: text('id').primaryKey(),
		runId: text('run_id')
			.notNull()
			.references(() => experimentRuns.id, { onDelete: 'cascade' }),
		eventType: text('event_type').notNull(),
		trialIndex: integer('trial_index'),
		payloadJson: text('payload_json').notNull().default('{}'),
		createdAt: integer('created_at').notNull()
	},
	(table) => [
		index('experiment_events_run_idx').on(table.runId),
		index('experiment_events_run_event_type_idx').on(table.runId, table.eventType),
		index('experiment_events_run_trial_idx').on(table.runId, table.trialIndex)
	]
);

export const experimentResponses = sqliteTable(
	'experiment_responses',
	{
		id: text('id').primaryKey(),
		runId: text('run_id')
			.notNull()
			.references(() => experimentRuns.id, { onDelete: 'cascade' }),
		trialIndex: integer('trial_index').notNull(),
		itemId: text('item_id'),
		responseType: text('response_type').notNull(),
		responseJson: text('response_json').notNull(),
		scoreJson: text('score_json'),
		metadataJson: text('metadata_json').notNull().default('{}'),
		createdAt: integer('created_at').notNull()
	},
	(table) => [
		index('experiment_responses_run_idx').on(table.runId),
		index('experiment_responses_run_trial_idx').on(table.runId, table.trialIndex),
		index('experiment_responses_run_item_idx').on(table.runId, table.itemId),
		uniqueIndex('experiment_responses_run_trial_unique').on(table.runId, table.trialIndex)
	]
);

export const tipiQuestions = sqliteTable(
	'tipi_questions',
	{
		id: text('id').primaryKey(),
		experimentVersionId: text('experiment_version_id')
			.notNull()
			.references(() => experimentVersions.id, { onDelete: 'cascade' }),
		itemNumber: integer('item_number').notNull(),
		prompt: text('prompt').notNull(),
		scale: text('scale').notNull(),
		scoring: text('scoring').notNull()
	},
	(table) => [
		uniqueIndex('tipi_questions_version_item_unique').on(
			table.experimentVersionId,
			table.itemNumber
		),
		index('tipi_questions_version_idx').on(table.experimentVersionId)
	]
);

export const tipiResponses = sqliteTable(
	'tipi_responses',
	{
		id: text('id').primaryKey(),
		runId: text('run_id')
			.notNull()
			.references(() => experimentRuns.id, { onDelete: 'cascade' }),
		questionId: text('question_id')
			.notNull()
			.references(() => tipiQuestions.id, { onDelete: 'restrict' }),
		trialIndex: integer('trial_index').notNull(),
		response: text('response').notNull(),
		score: integer('score').notNull(),
		createdAt: integer('created_at').notNull()
	},
	(table) => [
		uniqueIndex('tipi_responses_run_trial_unique').on(table.runId, table.trialIndex),
		index('tipi_responses_run_idx').on(table.runId)
	]
);

export const tipiResults = sqliteTable('tipi_results', {
	runId: text('run_id')
		.primaryKey()
		.references(() => experimentRuns.id, { onDelete: 'cascade' }),
	extroversion: integer('extroversion').notNull(),
	agreeableness: integer('agreeableness').notNull(),
	conscientiousness: integer('conscientiousness').notNull(),
	neuroticism: integer('neuroticism').notNull(),
	openness: integer('openness').notNull(),
	resultJson: text('result_json').notNull(),
	createdAt: integer('created_at').notNull()
});
