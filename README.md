# AL Radio Server

The server for AL Radio.

## Setup

- `npm i`
- `pip install -r requirements.txt`.
- FFmpeg: `brew install ffmpeg` or your system equivalent.

### Use Local Database

- Get MongoDB: `brew tap mongodb/brew && brew install mongodb-community` or your system equivalent.
- Run `npm run mongo:local`

Add `mongodb://localhost:28017` to the `MONGO_URI` environment variable:

```conf
# .env
MONGO_URI=mongodb://localhost:28017
```

### Use Hosted Database

Add your MongoDB URI to the `MONGO_URI` environment variable:

```conf
# .env
MONGO_URI=mongodb+srv://{username}:{password}@{appname}.s04om.mongodb.net/...
```

### Add Credentials

These 4 credentials are required for AL Radio to function normally. You may omit `OPENAI_API_KEY` to use the sample song announcement `sample-tts.mp3` and avoid API costs.

```conf
# .env
SPOTIFY_CLIENT_SECRET=
SPOTIFY_CLIENT_ID=
OPENAI_API_KEY=
MONGO_URI=
```

### Security

The `CORS_ORIGIN` should be the client origin. If the client is running at `http://localhost:3000`, then that will be this value.

The `JWT_SECRET` is the secret key that derives the JWTs for the clients. Choose any string locally, the tokens will not be secure.

The `ENVIRONMENT` being set to `dev` weakens various securities in order to ease testing. Set to `prod` to test security aspects.

```conf
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=test-jwt-secret
ENVIRONMENT=dev
```

### HTTP Proxy

Youtube has been cracking down on video downloading by IP banning large ranges. To get around this, AL Radio is equipped with the ability to send requests through proxy servers.

```conf
# .env
PROXY_LIST_URL=
```

Populate this environment variable with a URL that returns a list of proxy servers, separated by `/r/n`. If AL Radio functions locally without this, there is no need to populate it.

### Customize

#### Initial Tracks

Add your initial Spotify Track IDs separated by a comma. These will get added to the suggestion queue. This is required for runs with an empty database in order to start playing music.

```conf
# .env
INITIAL_TRACK_IDS=0HNYFFOwID6HGSqy5xr4av,3f1yAg2u74Wn8Jj14zhJGS,5gPNOBxIfT1Aap0Ji4L5xi,2T6esRR7vvAjJTYJFVIXxt,3NGpqL9pwQjWzb358tJMHM
```

#### Port

The server will exist on the port defined in `.env`, defaulting to `3002`.

```conf
# .env
PORT=3002
```

## Run

- Ensure MongoDB is running locally.
- `npm run start:local`
