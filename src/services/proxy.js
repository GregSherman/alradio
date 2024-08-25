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
    const speeds = [];
    for (let i = 0; i < 3; i++) {
      speeds.push(await this._getProxySpeedInMbps(proxy));
    }
    const averageSpeed = speeds.reduce((a, b) => a + b) / speeds.length;
    console.log("Proxy speed (mbps):", averageSpeed);
    return averageSpeed > 5;
  }

  async _getProxySpeedInMbps(proxy) {
    const url = "https://api.alradio.live/speedtest";
    console.log("Testing proxy speed:", proxy);
    const agent = new HttpsProxyAgent(`http://${proxy.host}:${proxy.port}`);
    const start = new Date();
    await axios.get(url, { httpsAgent: agent });
    const end = new Date();
    const duration = end - start;
    const speed = 0.18 / (duration / 1000);
    console.log("Speed (mbps):", speed);
    return speed;
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
