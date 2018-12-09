import { app } from "../init.js";
import { ErrorHandling } from "./error-handling.js";

type Constructor<T> = new (...args: any[]) => T;

export function AutoSync<B extends Constructor<ErrorHandling>>(baseClass: B) {
    return class extends baseClass {
        constructor(...args: any[]) {
            super(...args);
            app.loaded.then(() => this.startPeriodicSync());
        }

        startPeriodicSync() {
            setTimeout(async () => {
                if (app.loggedIn && !app.locked) {
                    try {
                        await app.synchronize();
                    } catch (e) {
                        await this.handleError(e);
                    }
                }
                this.startPeriodicSync();
            }, app.settings.syncInterval * 60 * 1000);
        }
    };
}