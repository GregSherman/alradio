import log4js from "log4js";
import { getContext } from "./asyncLocalStorage.js";
import { nanoid } from "nanoid";
import chalk from "chalk";
import crypto from "crypto";

const levelColors = {
  error: chalk.red,
  info: chalk.gray,
  warn: chalk.yellow,
  default: chalk.white,
};

const getColorForText = (text) => {
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  return chalk.hex(`#${hash.slice(0, 6)}`);
};

// Configure log4js
log4js.configure({
  appenders: {
    out: {
      type: "stdout",
      layout: {
        type: "pattern",
        pattern: "%m",
      },
    },
  },
  categories: {
    default: { appenders: ["out"], level: "info" },
  },
});

const logger = log4js.getLogger();

const log = (level, message, ...args) => {
  const context = getContext();
  const taskId = context.taskId || "";
  const category = context.category || "";

  const taskIdColored = taskId ? getColorForText(taskId)(`[${taskId}]`) : "";
  const categoryColored = category
    ? getColorForText(category)(`[${category}]`)
    : "";
  const levelColor = levelColors[level] || levelColors.default;

  const argsColored = args
    .map((arg) => {
      if (arg === taskId) return;
      const color = getColorForText(arg);
      return color(`[${arg}]`);
    })
    .join(" ");

  const logMessage =
    `${levelColor(`[${level.toUpperCase()}]`)} ${categoryColored} ${taskIdColored} ${argsColored} ${chalk.grey(message)}`.replace(
      / +/g,
      " ",
    );
  logger[level](logMessage);
};

const generateTaskId = () => nanoid(8);

export { log, generateTaskId };
