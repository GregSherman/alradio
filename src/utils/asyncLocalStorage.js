import { AsyncLocalStorage } from "async_hooks";

const asyncLocalStorage = new AsyncLocalStorage();
const runWithContext = (context, fn) => {
  asyncLocalStorage.run(context, fn);
};
const getContext = () => asyncLocalStorage.getStore() || {};

export { runWithContext, getContext };
