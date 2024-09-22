import EventEmitter from "events";
import { runWithContext } from "../utils/asyncLocalStorage.js";
import { generateTaskId, log } from "../utils/logger.js";

class EventService extends EventEmitter {
  constructor() {
    super();
  }

  onWithClientContext(eventName, listener) {
    const wrappedListener = (...args) => {
      runWithContext(
        { category: "client-task", taskId: generateTaskId() },
        () => {
          log(
            "info",
            `Event triggered. Running client task.`,
            "EVENT",
            eventName,
          );
          listener(...args);
        },
      );
    };
    this.on(eventName, wrappedListener);
  }

  onWithServerContext(eventName, listener) {
    const wrappedListener = (...args) => {
      runWithContext(
        { category: "server-task", taskId: generateTaskId() },
        () => {
          log(
            "info",
            `Event triggered. Running server task.`,
            "EVENT",
            eventName,
          );
          listener(...args);
        },
      );
    };
    this.on(eventName, wrappedListener);
  }
}

export default new EventService();
