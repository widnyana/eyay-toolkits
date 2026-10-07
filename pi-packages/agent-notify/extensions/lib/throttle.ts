/**
 * Throttle: one banner per Kind per cooldown window.
 *
 * R: clock (injected; production passes Date.now).
 */

/** Suppression window for a Kind that already produced a banner. */
export const COOLDOWN_MS = 30_000;

export type Clock = () => number;

export class Throttle {
	private readonly lastAt = new Map<string, number>();

	constructor(private readonly now: Clock = Date.now) {}

	/** Check-and-record in one call: true → deliver, false → suppressed. */
	admit(key: string): boolean {
		const t = this.now();
		const last = this.lastAt.get(key);
		if (last !== undefined && t - last < COOLDOWN_MS) return false;
		this.lastAt.set(key, t);
		return true;
	}
}
