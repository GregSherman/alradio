import log4js from "log4js";
import { getContext } from "./asyncLocalStorage.js";
import { nanoid } from "nanoid";
import crypto from "crypto";

// ANSI color codes
const ansiCodes = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  yellow: "\x1b[33m",
  white: "\x1b[37m",
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

// Dynamic colors using ANSI hex codes for specific RGB colors
const dynamicColors = [
  "\x1b[38;2;255;20;147m", // Deep Pink
  "\x1b[38;2;255;0;255m", // Fuchsia
  "\x1b[38;2;199;21;133m", // MediumVioletRed
  "\x1b[38;2;255;215;0m", // Gold
  "\x1b[38;2;218;112;214m", // Orchid
  "\x1b[38;2;240;230;140m", // Khaki
  "\x1b[38;2;138;43;226m", // BlueViolet
  "\x1b[38;2;255;69;0m", // OrangeRed
  "\x1b[38;2;0;255;255m", // Aqua
  "\x1b[38;2;255;140;0m", // DarkOrange
  "\x1b[38;2;127;255;0m", // Chartreuse
  "\x1b[38;2;255;99;71m", // Tomato
  "\x1b[38;2;186;85;211m", // MediumOrchid
  "\x1b[38;2;230;230;250m", // Lavender
  "\x1b[38;2;255;105;180m", // Hot Pink
  "\x1b[38;2;139;0;139m", // DarkMagenta
  "\x1b[38;2;0;250;154m", // MediumSpringGreen
  "\x1b[38;2;176;224;230m", // PowderBlue
  "\x1b[38;2;255;0;255m", // Magenta
  "\x1b[38;2;106;90;205m", // SlateBlue
  "\x1b[38;2;255;182;193m", // LightPink
  "\x1b[38;2;153;50;204m", // DarkOrchid
  "\x1b[38;2;64;224;208m", // Turquoise
  "\x1b[38;2;255;69;71m", // Tomato
  "\x1b[38;2;255;20;147m", // DeepPink
  "\x1b[38;2;221;160;221m", // Plum
  "\x1b[38;2;240;128;128m", // LightCoral
  "\x1b[38;2;186;85;211m", // MediumOrchid
  "\x1b[38;2;255;105;180m", // HotPink
  "\x1b[38;2;224;255;255m", // LightCyan
  "\x1b[38;2;255;140;0m", // DarkOrange
  "\x1b[38;2;255;192;203m", // Pink
  "\x1b[38;2;135;206;235m", // SkyBlue
  "\x1b[38;2;255;182;193m", // LightPink
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
