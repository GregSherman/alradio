import axios from "axios";
import { NoProxyError } from "../errors.js";
import { HttpsProxyAgent } from "https-proxy-agent";

class ProxyService {
  constructor() {
    this._apiUrl = process.env.PROXY_LIST_URL;
    this._activeProxy = {};
    this._proxyList = [];
  }

  async refreshProxyList() {
    if (!this._apiUrl) return;
    try {
      const response = await axios.get(this._apiUrl);
      let proxyList = response.data.split("\r\n");
      this._proxyList.pop();
      this._proxyList = proxyList.map((proxy) => this._parseProxy(proxy));
    } catch (error) {
      console.error("Failed to refresh proxy list.");
    }
  }

  async setProxy() {
    if (!this._apiUrl) return;
    const proxy = await this._getProxy();
    process.env.http_proxy = `http://${proxy.host}:${proxy.port}`;
  }

  _parseProxy(proxy) {
    if (!this._apiUrl) return;
    proxy = proxy.replace("http://", "");
    const [host, port] = proxy.split(":");
    return { host: host, port: +port };
  }

  unsetProxy() {
    if (!this._apiUrl) return;
    process.env.http_proxy = "";
  }

  markActiveProxyBad() {
    if (!this._apiUrl) return;
    this._markProxyBad(this._activeProxy);
    this._activeProxy = {};
  }

  async _testProxy(proxy) {
    if (!this._apiUrl) return;
    const testUrl = "https://httpbin.org/ip";
    try {
      console.log("Testing proxy:", proxy);
      const agent = new HttpsProxyAgent(`http://${proxy.host}:${proxy.port}`);
      await axios.get(testUrl, {
        agent,
        timeout: 5000,
      });
      console.log("Proxy passed test");
      return true;
    } catch (error) {
      console.error("Proxy failed test:", error);
      return false;
    }
  }

  // Go through the proxy list and find a working proxy.
  // If no working proxies are found, refresh the list and try again.
  // If still no proxies are found, throw an error to end the program.
  async _getProxy(raise = false) {
    if (!this._apiUrl) return;
    if (this._activeProxy.host && (await this._testProxy(this._activeProxy))) {
      return this._activeProxy;
    }

    let failedAttempts = 0;
    let max = this._proxyList.length;
    while (failedAttempts < max) {
      const randomIndex = Math.floor(Math.random() * this._proxyList.length);
      const randomProxy = this._proxyList[randomIndex];
      if (await this._testProxy(randomProxy)) {
        this._activeProxy = randomProxy;
        return randomProxy;
      } else {
        this._markProxyBad(randomProxy);
        failedAttempts++;
      }
    }

    if (raise) {
      // No working proxies means we can't continue. End the program.
      throw new NoProxyError("No working proxies found");
    }

    await this.refreshProxyList();
    return this._getProxy(true);
  }

  _markProxyBad(proxy) {
    if (!this._apiUrl) return;
    this._proxyList = this._proxyList.filter((p) => p !== proxy);
  }
}

export default new ProxyService();
