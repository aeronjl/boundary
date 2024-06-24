// src/lib/resultStore.ts
import { writable } from 'svelte/store';

export const results = writable({
    extroversion: { sum: 0, count: 0 },
    agreeableness: { sum: 0, count: 0 },
    conscientiousness: { sum: 0, count: 0 },
    neuroticism: { sum: 0, count: 0 },
    openness: { sum: 0, count: 0 }
});