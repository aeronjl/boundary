import { writable } from 'svelte/store';
import type { TipiResult } from '$lib/experiments/tipi';

export const tipiResult = writable<TipiResult | null>(null);
