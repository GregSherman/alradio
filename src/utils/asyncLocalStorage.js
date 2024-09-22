import { AsyncLocalStorage } from "async_hooks";
import { log } from "./logger.js";

const asyncLocalStorage = new AsyncLocalStorage();
const runWithContext = (context, fn) => {
  // check the previous context. if there is a taskId, log it
  const previousContext = asyncLocalStorage.getStore();
  if (previousContext && previousContext.taskId) {
    log("info", "", previousContext.taskId, context.taskId, "TASK-SWITCH");
  }
  asyncLocalStorage.run(context, fn);
};
const getContext = () => asyncLocalStorage.getStore() || {};

export { runWithContext, getContext };
