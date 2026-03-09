import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogOptions {
    context?: any;
    component?: string;
    // Don't log to console if disabled (defaults to false for component renders)
    consoleOutput?: boolean;
}

/**
 * A hook for structured dev logging.
 * Logs are automatically pushed to the `devLogs` table in Convex and conditionally logged to the browser console.
 *
 * Usage:
 * const logger = useDevLogger('MyComponent')
 * logger.info('User clicked button', { btnId: 'submit-data' })
 */
export function useDevLogger(defaultComponent?: string) {
    const saveLog = useMutation(api.devLogs.log);

    const log = useCallback(
        (level: LogLevel, message: string, options?: LogOptions) => {
            const component = options?.component || defaultComponent || "frontend";
            const consoleOutput = options?.consoleOutput ?? true;

            // 1. Console logging (skip if strictly disabled, e.g. for noisy render logs)
            if (consoleOutput) {
                const prefix = `[${component}]`;
                switch (level) {
                    case "debug": console.debug(prefix, message, options?.context || ''); break;
                    case "info": console.info(prefix, message, options?.context || ''); break;
                    case "warn": console.warn(prefix, message, options?.context || ''); break;
                    case "error": console.error(prefix, message, options?.context || ''); break;
                }
            }

            // 2. Convex logging (fire and forget)
            saveLog({
                level,
                message,
                component,
                context: options?.context,
            }).catch(err => {
                // Failsafe in case Convex mutation fails (e.g. rate limits, payload too big)
                console.error("Failed to save dev log to Convex:", err);
            });
        },
        [saveLog, defaultComponent]
    );

    return {
        debug: (message: string, options?: LogOptions) => log("debug", message, options),
        info: (message: string, options?: LogOptions) => log("info", message, options),
        warn: (message: string, options?: LogOptions) => log("warn", message, options),
        error: (message: string, options?: LogOptions) => log("error", message, options),
        raw: log,
    };
}
