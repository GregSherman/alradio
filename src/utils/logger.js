import log4js from "log4js";
import { getContext } from "./asyncLocalStorage.js";
import { nanoid } from "nanoid";
import chalk from "chalk";
import crypto from "crypto";

// Define colors for log levels
const levelColors = {
  error: chalk.red,
  info: chalk.gray,
  warn: chalk.yellow,
  default: chalk.white,
};

// Define a list of dynamic colors
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

// Helper function to get color for text
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
        pattern: "%m", // Custom formatting in `log` function
      },
    },
  },
  categories: {
    default: { appenders: ["out"], level: "info" },
  },
});

const logger = log4js.getLogger();

// Helper function for formatting context info based on category
const formatContext = (category, requestId, requestMethod, requestUrl) => {
  if (category === "server-task") {
    return `${category ? getColorForText(category)(`[${category}]`) : ""}`;
  }

  if (category === "request-task") {
    const requestIdColored = requestId
      ? getColorForText(requestId)(`[${requestId}]`)
      : "";
    const requestMethodColored = requestMethod
      ? getColorForText(requestMethod)(`[${requestMethod}]`)
      : "";
    const requestUrlColored = requestUrl
      ? getColorForText(requestUrl)(`[${requestUrl}]`)
      : "";
    return `${category ? getColorForText(category)(`[${category}]`) : ""} ${requestIdColored} ${requestMethodColored} ${requestUrlColored}`;
  }

  return `${category ? getColorForText(category)(`[${category}]`) : ""}`;
};

// Main log function
const log = (level, message, ...args) => {
  const context = getContext();
  const category = context.category || "";
  const requestId = context.requestId || "";
  const requestMethod = context.requestMethod || "";
  const requestUrl = context.requestUrl || "";

  // Get color for the log level
  const levelColor = levelColors[level] || levelColors.default;

  // Format context info based on the category
  const contextInfo = formatContext(
    category,
    requestId,
    requestMethod,
    requestUrl,
  );

  // Create args colored by dynamic colors
  const argsColored = args
    .map((arg) => {
      const color = getColorForText(arg);
      return color(`[${arg}]`);
    })
    .join(" ");

  // Log the message with color
  logger[level](
    `${levelColor(`[${level.toUpperCase()}]`)} ${contextInfo} ${argsColored} ${chalk.white(message)}`,
  );
};

// Function to generate a unique request ID
const generateRequestId = () => nanoid(8);

export { log, generateRequestId };
