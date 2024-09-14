import axios from "axios";
import AccountModelService from "../../services/db/AccountModelService.js";
import ClientService from "../ClientService.js";

class SpotifyClient extends ClientService {
  async authorize(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    const code = req.query.code;
    if (!code) {
      return res.status(400).json({ message: "No code provided" });
    }

    try {
      const { accessToken, refreshToken } =
        await this._fetchSpotifyTokens(code);
      await AccountModelService.addSpotifyTokens(
        authHandle,
        accessToken,
        refreshToken,
      );

      const spotifyId = await this._fetchSpotifyProfile(accessToken);
      await AccountModelService.addSpotifyUserId(authHandle, spotifyId);

      res.redirect(302, `${process.env.CLIENT_URL}`);
    } catch (error) {
      console.error("Error authorizing Spotify:", error);
      res.status(500).json({ message: "Error authorizing Spotify" });
    }
  }

  async removeAuthorization(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    try {
      await AccountModelService.addSpotifyTokens(authHandle, null, null);
      await AccountModelService.addSpotifyUserId(authHandle, null);

      res.status(200).json({ message: "Spotify authorization removed" });
    } catch (error) {
      console.error("Error removing Spotify authorization:", error);
      res.status(500).json({ message: "Error removing Spotify authorization" });
    }
  }

  async addSongToPlaylist(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    const { trackId } = req.body;
    if (!trackId) {
      return res.status(400).json({ message: "No trackId provided" });
    }

    try {
      let { accessToken, refreshToken } =
        await AccountModelService.getSpotifyTokens(authHandle);
      accessToken = await this._refreshAccessTokenIfExpired(
        accessToken,
        refreshToken,
        authHandle,
      );

      let alRadioPlaylist = await this._getOrCreatePlaylist(
        accessToken,
        authHandle,
      );

      const trackAlreadyInPlaylist = await this._checkTrackInPlaylist(
        alRadioPlaylist.id,
        trackId,
        accessToken,
      );

      if (trackAlreadyInPlaylist) {
        return res
          .status(200)
          .json({ message: "Track already exists in your playlist." });
      }

      await this._addTrackToPlaylist(alRadioPlaylist.id, trackId, accessToken);

      res.status(200).json({ message: "Track added to your playlist!" });
    } catch (error) {
      console.error("Error adding song to playlist:", error);
      res.status(500).json({ message: "Error adding song to playlist" });
    }
  }

  async _fetchSpotifyTokens(code) {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.REDIRECT_BASE_URL}/auth/spotify/callback`,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
    };
  }

  async _refreshAccessTokenIfExpired(accessToken, refreshToken, authHandle) {
    try {
      await axios.get("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return accessToken;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const tokenResponse = await axios.post(
          "https://accounts.spotify.com/api/token",
          new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: process.env.SPOTIFY_CLIENT_ID,
            client_secret: process.env.SPOTIFY_CLIENT_SECRET,
          }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );
        accessToken = tokenResponse.data.access_token;
        await AccountModelService.addSpotifyTokens(
          authHandle,
          accessToken,
          tokenResponse.data.refresh_token || refreshToken,
        );
        return accessToken;
      } else if (error.response && error.response.status === 403) {
        await AccountModelService.addSpotifyTokens(authHandle, null, null);
        await AccountModelService.addSpotifyUserId(authHandle, null);
        await AccountModelService.addSpotifyQuickAddPlaylistId(
          authHandle,
          null,
        );
        throw new Error("Spotify authorization revoked");
      }
      throw error;
    }
  }

  async _fetchSpotifyProfile(accessToken) {
    const spotifyResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return spotifyResponse.data.id;
  }

  async _getOrCreatePlaylist(
    accessToken,
    authHandle,
    playlistName = "AL Radio",
  ) {
    const userId = await AccountModelService.getSpotifyUserId(authHandle);
    const playlistId =
      await AccountModelService.getSpotifyQuickAddPlaylistId(authHandle);

    if (playlistId) {
      try {
        const playlistResponse = await axios.get(
          `https://api.spotify.com/v1/playlists/${playlistId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        return playlistResponse.data;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          await AccountModelService.addSpotifyQuickAddPlaylistId(
            authHandle,
            null,
          );
        } else {
          throw error;
        }
      }
    }

    const createPlaylistResponse = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: playlistName,
        description: "Playlist created by AL Radio",
        public: false,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    const playlist = createPlaylistResponse.data;
    await AccountModelService.addSpotifyQuickAddPlaylistId(
      authHandle,
      playlist.id,
    );

    return playlist;
  }

  async _getUserPlaylists(accessToken) {
    const playlistsResponse = await axios.get(
      "https://api.spotify.com/v1/me/playlists",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return playlistsResponse.data.items;
  }

  async _checkTrackInPlaylist(playlistId, trackId, accessToken) {
    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data.items.some((item) => item.track.id === trackId);
  }

  async _addTrackToPlaylist(playlistId, trackId, accessToken) {
    await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        uris: [`spotify:track:${trackId}`],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
  }
}

export default new SpotifyClient();
