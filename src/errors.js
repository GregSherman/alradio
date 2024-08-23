class EndableError extends Error {
  constructor(message) {
    super(message);
    this.name = "EndableError";
  }
}

class NoProxyError extends EndableError {
  constructor(message) {
    super(message);
    this.name = "NoProxyError";
  }
}

export { EndableError, NoProxyError };
