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
    if (!track.artist || !track.title) {
      return;
    }

    const { lastFMToken } = await AccountModelService.getLastFMToken(handle);
    if (!lastFMToken) {
      return;
    }
    console.log("Scrobbling track for user:", handle);

    const lastFMTrack = await this._searchTrack(track);
    if (!lastFMTrack) {
      console.error("Track not found on LastFM:", track);
      return;
    }

    const lastScrobbledTrack = await this._getLastScrobbledTrack(handle);
    if (lastScrobbledTrack && lastScrobbledTrack.url === lastFMTrack.url) {
      console.log("Track already scrobbled for user:", handle);
      return;
    }

    const api_key = process.env.LASTFM_API_KEY;
    const api_sig = this._generateApiSignature({
      api_key,
      sk: lastFMToken,
      method: "track.scrobble",
      artist: track.artist,
      track: track.title,
      timestamp: Math.floor(Date.now() / 1000) - 30,
    });

    try {
      await axios.post(
        `https://ws.audioscrobbler.com/2.0/?method=track.scrobble&api_key=${api_key}&sk=${lastFMToken}&api_sig=${api_sig}&format=json`,
        this._buildQueryString({
          artist: track.artist,
          track: track.title,
          timestamp: Math.floor(Date.now() / 1000) - 30,
        }),
      );
    } catch (error) {
      console.error("Error scrobbling track for user:", handle, error);
      if (error.response && error.response.status === 403) {
        await AccountModelService.addLastFMToken(handle, null);
        await AccountModelService.addLastFMUsername(handle, null);
      }
    }

    console.log("Scrobbled track for user:", handle);
  }

  async _getLastScrobbledTrack(handle) {
    const { lastFMToken } = await AccountModelService.getLastFMToken(handle);
    if (!lastFMToken) {
      console.error("No LastFM token found for user:", handle);
      return;
    }

    const api_key = process.env.LASTFM_API_KEY;
    const api_sig = this._generateApiSignature({
      api_key,
      sk: lastFMToken,
      method: "user.getRecentTracks",
      limit: 1,
    });

    try {
      const response = await axios.get(
        `https://ws.audioscrobbler.com/2.0/?method=user.getRecentTracks&api_key=${api_key}&sk=${lastFMToken}&api_sig=${api_sig}&limit=1&format=json`,
      );

      return response.data.recenttracks.track[0];
    } catch (error) {
      console.error(
        "Error getting last scrobbled track for user:",
        handle,
        error,
      );
    }
  }

  async _searchTrack(track) {
    const api_key = process.env.LASTFM_API_KEY;
    const api_sig = this._generateApiSignature({
      api_key,
      method: "track.search",
      track: track.title,
      artist: track.artist,
      limit: 1,
    });

    try {
      const response = await axios.get(
        `https://ws.audioscrobbler.com/2.0/?method=track.search&api_key=${api_key}&track=${track.title}&artist=${track.artist}&api_sig=${api_sig}&limit=1&format=json`,
      );

      return response.data.results.trackmatches.track[0];
    } catch (error) {
      console.error("Error searching track:", track, error);
    }
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
