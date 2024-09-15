import axios from "axios";
import crypto from "crypto";
import ClientService from "../ClientService.js";
import AccountModelService from "../../services/db/AccountModelService.js";

class LastFMClient extends ClientService {
  async authorize(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }

    try {
      const sessionKey = await this._getSessionKey(token);
      await AccountModelService.addLastFMToken(authHandle, sessionKey);

      const username = await this._fetchLastFMUsername(sessionKey);
      await AccountModelService.addLastFMUsername(authHandle, username);

      res.redirect(302, `${process.env.CLIENT_URL}`);
    } catch (error) {
      console.error("Error authorizing LastFM:", error);
      res.status(500).json({ message: "Error authorizing LastFM" });
    }
  }

  // session key lasts forever
  async _getSessionKey(token) {
    const api_key = process.env.LASTFM_API_KEY;
    const api_sig = this._generateApiSignature({
      api_key,
      token,
      method: "auth.getSession",
    });

    const response = await axios.get(
      `https://ws.audioscrobbler.com/2.0/?method=auth.getSession&api_key=${api_key}&token=${token}&api_sig=${api_sig}&format=json`,
    );

    return response.data.session.key;
  }

  async scrobbleTrackForUser(handle, track) {
    const sessionKey = await AccountModelService.getLastFMToken(handle);
    if (!sessionKey) {
      return;
    }

    const api_key = process.env.LASTFM_API_KEY;
    const api_sig = this._generateApiSignature({
      api_key,
      sk: sessionKey,
      method: "track.scrobble",
      artist: track.artist,
      track: track.title,
      timestamp: Math.floor(Date.now() / 1000) - 30,
    });

    try {
      await axios.post(
        `https://ws.audioscrobbler.com/2.0/?method=track.scrobble&api_key=${api_key}&sk=${sessionKey}&api_sig=${api_sig}&format=json`,
        this._buildQueryString({
          artist: track.artist,
          track: track.title,
          timestamp: Math.floor(Date.now() / 1000) - 30,
        }),
      );
    } catch (error) {
      console.error("Error scrobbling track for user:", handle, error);
    }

    console.log("Scrobbled track for user:", handle);
  }

  _generateApiSignature(params) {
    const sortedKeys = Object.keys(params).sort();

    let signatureString = "";
    sortedKeys.forEach((key) => {
      signatureString += key + params[key];
    });
    signatureString += process.env.LASTFM_API_SECRET;

    return crypto.createHash("md5").update(signatureString).digest("hex");
  }

  _buildQueryString(params) {
    // Convert the parameters object into a query string
    return Object.keys(params)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`,
      )
      .join("&");
  }

  async _fetchLastFMUsername(sessionKey) {
    const api_key = process.env.LASTFM_API_KEY;
    const api_sig = this._generateApiSignature({
      api_key,
      sk: sessionKey,
      method: "user.getInfo",
    });

    const response = await axios.get(
      `https://ws.audioscrobbler.com/2.0/?method=user.getInfo&api_key=${api_key}&sk=${sessionKey}&api_sig=${api_sig}&format=json`,
    );

    return response.data.user.name;
  }
}

export default new LastFMClient();
