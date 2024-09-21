import log4js from "log4js";
import { getContext } from "./asyncLocalStorage.js";
import { nanoid } from "nanoid";
import crypto from "crypto";

// ANSI color codes (30-37)
const ansiCodes = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

// Helper function to wrap text in ANSI color codes
const colorText = (text, color) => `${color}${text}${ansiCodes.reset}`;

// Define level colors with ANSI codes
const levelColors = {
  error: ansiCodes.red,
  info: ansiCodes.gray,
  warn: ansiCodes.yellow,
  default: ansiCodes.white,
};

// Dynamic colors mapped to available ANSI color codes (30-37)
const dynamicColors = [
  ansiCodes.red,
  ansiCodes.green,
  ansiCodes.yellow,
  ansiCodes.blue,
  ansiCodes.magenta,
  ansiCodes.cyan,
];

// Function to get color for a specific text using a hash
const getColorForText = (text) => {
  const hash = crypto.createHash("md5").update(text).digest("hex");
  const index = parseInt(hash, 16) % dynamicColors.length;
  return dynamicColors[index];
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

// Main logging function
const log = (level, message, ...args) => {
  const context = getContext();
  const taskId = context.taskId || "";

  // Color taskId if present
  const taskIdColored = taskId
    ? colorText(`[${taskId}]`, getColorForText(taskId))
    : "";
  const levelColor = levelColors[level] || levelColors.default;

  // Color each argument
  const argsColored = args
    .map((arg) => {
      if (arg === taskId) return;
      const color = getColorForText(arg);
      return colorText(`[${arg}]`, color);
    })
    .join(" ");

  // Combine everything into the final log message
  const logMessage =
    `${colorText(`[${level.toUpperCase()}]`, levelColor)} ${taskIdColored} ${argsColored} ${colorText(message, ansiCodes.gray)}`.replace(
      / +/g,
      " ",
    );

  // Log based on the level
  logger[level](logMessage);
};

// Generate a task ID using nanoid
const generateTaskId = () => nanoid(8);

export { log, generateTaskId };
