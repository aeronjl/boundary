import type { Cookies } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { participantConsents } from '$lib/server/db/schema';
import {
	ensureParticipantSession,
	getOrCreateParticipantSessionId,
	participantCookieName
} from './lifecycle';

export const participantConsentVersion = 'participant-consent-v1';

export type ParticipantConsentStatus = {
	accepted: boolean;
	consentVersion: string;
	acceptedAt: number | null;
};

export class ConsentRequiredError extends Error {
	constructor() {
		super('Participant consent is required before starting an experiment.');
		this.name = 'ConsentRequiredError';
	}
}

export function isConsentRequiredError(error: unknown): error is ConsentRequiredError {
	return error instanceof ConsentRequiredError;
}

export async function getParticipantConsentStatus(
	participantSessionId: string | null | undefined
): Promise<ParticipantConsentStatus> {
	if (!participantSessionId) {
		return {
			accepted: false,
			consentVersion: participantConsentVersion,
			acceptedAt: null
		};
	}

	const [consent] = await db
		.select()
		.from(participantConsents)
		.where(
			and(
				eq(participantConsents.participantSessionId, participantSessionId),
				eq(participantConsents.consentVersion, participantConsentVersion)
			)
		);

	return {
		accepted: Boolean(consent),
		consentVersion: participantConsentVersion,
		acceptedAt: consent?.acceptedAt ?? null
	};
}

export async function getCookieConsentStatus(cookies: Cookies): Promise<ParticipantConsentStatus> {
	return getParticipantConsentStatus(cookies.get(participantCookieName));
}

export async function acceptParticipantConsent(
	cookies: Cookies,
	userAgent: string | null
): Promise<ParticipantConsentStatus> {
	const participantSessionId = getOrCreateParticipantSessionId(cookies);
	const acceptedAt = Date.now();

	await ensureParticipantSession(participantSessionId, userAgent);
	await db
		.insert(participantConsents)
		.values({
			id: crypto.randomUUID(),
			participantSessionId,
			consentVersion: participantConsentVersion,
			userAgent,
			detailsJson: JSON.stringify({
				dataRecorded: [
					'participant session id',
					'user agent',
					'timestamps',
					'trial responses',
					'scores',
					'response timing metadata'
				]
			}),
			acceptedAt
		})
		.onConflictDoUpdate({
			target: [participantConsents.participantSessionId, participantConsents.consentVersion],
			set: {
				userAgent,
				acceptedAt
			}
		});

	return {
		accepted: true,
		consentVersion: participantConsentVersion,
		acceptedAt
	};
}

export async function requireParticipantConsent(participantSessionId: string): Promise<void> {
	const consent = await getParticipantConsentStatus(participantSessionId);

	if (!consent.accepted) {
		throw new ConsentRequiredError();
	}
}
