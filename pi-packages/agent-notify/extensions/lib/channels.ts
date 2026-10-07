/**
 * Delivery channels. Terminal capabilities only: OSC sequences written to
 * the controlling tty, or an OS notifier executed via argv (never a shell
 * string). osascript is deliberately absent: delivery is terminal-native.
 *
 * E is scoped here: TtyErr and SpawnErr both escape as log+drop inside the
 * adapters; `notify` never throws by design.
 */

import type { Message } from "./events.ts";

const BEL = "\x07";
const ST = "\x1b\\";

/** Ghostty, WezTerm, rxvt-unicode. */
export function osc777(title: string, body: string): string {
	return `\x1b]777;notify;${title};${body}${BEL}`;
}

/** iTerm2. */
export function osc9(title: string, body: string): string {
	return `\x1b]9;${title}: ${body}${BEL}`;
}

/** Kitty: i=notification id, d=0 means not done yet, p=body part. */
export function osc99(title: string, body: string): string {
	return `\x1b]99;i=1:d=0;${title}${ST}\x1b]99;i=1:p=body;${body}${ST}`;
}

/** Which delivery path the host speaks. */
export type Channel =
	| "osc777"
	| "osc9"
	| "osc99"
	| "notify-send"
	| "powershell"
	| "none";

/**
 * 🔒 env record → Channel. Decision table; no env is read past this node.
 *
 * darwin:  kitty→osc99 · iTerm→osc9 · else osc777
 * win32:   WT_SESSION→powershell · else none
 * linux+:  kitty→osc99 · iTerm→osc9 · ghostty/WezTerm→osc777 · else notify-send
 */
export function selectChannel(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): Channel {
	const isKitty = Boolean(env.KITTY_WINDOW_ID);
	const isIterm = env.TERM_PROGRAM === "iTerm.app" || Boolean(env.ITERM_SESSION_ID);
	const isGhosttyLike =
		env.TERM_PROGRAM === "ghostty" ||
		env.TERM_PROGRAM === "WezTerm" ||
		env.TERM === "xterm-ghostty";

	if (isKitty) return "osc99";
	if (isIterm) return "osc9";
	switch (platform) {
		case "darwin":
			return "osc777";
		case "win32":
			return env.WT_SESSION ? "powershell" : "none";
		default:
			return isGhosttyLike ? "osc777" : "notify-send";
	}
}

/** Terminal escape-sequence sink. */
export type TtyWrite = (sequence: string) => void;

/** Fire-and-forget process spawn; SpawnErr is handled inside the adapter. */
export type Exec = (file: string, args: readonly string[]) => void;

export interface Sender {
	/** Emit one notification. Never throws into the caller's run. */
	notify(message: Message): void;
	/** Human-readable channel name, for the startup log line. */
	readonly channel: string;
}

function windowsToastScript(title: string, body: string): string {
	const type = "Windows.UI.Notifications";
	const mgr = `[${type}.ToastNotificationManager, ${type}, ContentType = WindowsRuntime]`;
	const template = `[${type}.ToastTemplateType]::ToastText01`;
	const toast = `[${type}.ToastNotification]::new($xml)`;
	const ps = (s: string) => s.replace(/'/g, "''");
	return [
		`${mgr} > $null`,
		`$xml = [${type}.ToastNotificationManager]::GetTemplateContent(${template})`,
		`$xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${ps(body)}')) > $null`,
		`[${type}.ToastNotificationManager]::CreateToastNotifier('${ps(title)}').Show(${toast})`,
	].join("; ");
}

export interface SenderDeps {
	tty: TtyWrite;
	exec: Exec;
	/** notify-send icon path; resolved once at the composition root. */
	icon?: string;
}

/** Wire a Sender for the chosen channel. */
export function makeSender(channel: Channel, deps: SenderDeps): Sender {
	switch (channel) {
		case "osc777":
		case "osc9":
		case "osc99": {
			const emit = (m: Message): string =>
				channel === "osc777"
					? osc777(m.title, m.body)
					: channel === "osc9"
						? osc9(m.title, m.body)
						: osc99(m.title, m.body);
			return {
				channel,
				notify: (m) => deps.tty(emit(m)), // E: TtyErr handled by the tty adapter
			};
		}
		case "notify-send": {
			const args = (m: Message): string[] => [
				...(deps.icon ? ["-i", deps.icon] : []),
				m.title,
				m.body,
			];
			return {
				channel,
				notify: (m) => deps.exec("notify-send", args(m)), // E: SpawnErr handled by the exec adapter
			};
		}
		case "powershell":
			return {
				channel,
				notify: (m) =>
					deps.exec("powershell.exe", [
						"-NoProfile",
						"-Command",
						windowsToastScript(m.title, m.body),
					]),
			};
		case "none":
			return { channel, notify: () => undefined };
	}
}
