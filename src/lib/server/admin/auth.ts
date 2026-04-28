import { createHash, timingSafeEqual } from 'node:crypto';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

const adminCookie = 'boundary_admin';
const adminSessionMaxAge = 60 * 60 * 8;

function configuredAdminToken(): string | null {
	const token = process.env.ADMIN_TOKEN;
	return token && token.length > 0 ? token : null;
}

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

function timingSafeStringEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);

	return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminConfigured(): boolean {
	return configuredAdminToken() !== null;
}

export function isAdminTokenValid(candidate: string): boolean {
	const token = configuredAdminToken();
	return token !== null && timingSafeStringEqual(candidate, token);
}

export function isAdminAuthenticated(cookies: Cookies): boolean {
	const token = configuredAdminToken();
	const session = cookies.get(adminCookie);

	return (
		token !== null && session !== undefined && timingSafeStringEqual(session, hashToken(token))
	);
}

export function setAdminSession(cookies: Cookies): void {
	const token = configuredAdminToken();
	if (!token) return;

	cookies.set(adminCookie, hashToken(token), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: adminSessionMaxAge
	});
}

export function clearAdminSession(cookies: Cookies): void {
	cookies.delete(adminCookie, { path: '/' });
}
