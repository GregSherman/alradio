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

const dynamicColors = [
  chalk.hex("#FF1493"), // Deep Pink
  chalk.hex("#FF00FF"), // Fuchsia
  chalk.hex("#C71585"), // MediumVioletRed
  chalk.hex("#FFD700"), // Gold
  chalk.hex("#DA70D6"), // Orchid
  chalk.hex("#F0E68C"), // Khaki
  chalk.hex("#8A2BE2"), // BlueViolet
  chalk.hex("#FF4500"), // OrangeRed
  chalk.hex("#00FFFF"), // Aqua
  chalk.hex("#FF8C00"), // DarkOrange
  chalk.hex("#7FFF00"), // Chartreuse
  chalk.hex("#FF6347"), // Tomato
  chalk.hex("#BA55D3"), // MediumOrchid
  chalk.hex("#E6E6FA"), // Lavender
  chalk.hex("#FF69B4"), // Hot Pink
  chalk.hex("#8B008B"), // DarkMagenta
  chalk.hex("#00FA9A"), // MediumSpringGreen
  chalk.hex("#B0E0E6"), // PowderBlue
  chalk.hex("#FF00FF"), // Magenta
  chalk.hex("#6A5ACD"), // SlateBlue
  chalk.hex("#FFB6C1"), // LightPink
  chalk.hex("#9932CC"), // DarkOrchid
  chalk.hex("#40E0D0"), // Turquoise
  chalk.hex("#FF6347"), // Tomato
  chalk.hex("#FF1493"), // DeepPink
  chalk.hex("#DDA0DD"), // Plum
  chalk.hex("#F08080"), // LightCoral
  chalk.hex("#BA55D3"), // MediumOrchid
  chalk.hex("#FF69B4"), // HotPink
  chalk.hex("#E0FFFF"), // LightCyan
  chalk.hex("#FF8C00"), // DarkOrange
  chalk.hex("#FFC0CB"), // Pink
  chalk.hex("#87CEEB"), // SkyBlue
  chalk.hex("#FFB6C1"), // LightPink
];

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

const log = (level, message, ...args) => {
  const context = getContext();
  const taskId = context.taskId || "";

  const taskIdColored = taskId ? getColorForText(taskId)(`[${taskId}]`) : "";
  const levelColor = levelColors[level] || levelColors.default;

  const argsColored = args
    .map((arg) => {
      if (arg === taskId) return;
      const color = getColorForText(arg);
      return color(`[${arg}]`);
    })
    .join(" ");

  const logMessage =
    `${levelColor(`[${level.toUpperCase()}]`)} ${taskIdColored} ${argsColored} ${chalk.white(message)}`.replace(
      / +/g,
      " ",
    );
  logger[level](logMessage);
};

const generateTaskId = () => nanoid(8);

export { log, generateTaskId };
