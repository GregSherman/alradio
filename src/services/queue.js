import { EventEmitter } from "events";

class QueueService extends EventEmitter {
  constructor() {
    super();
    // Format: [{trackId: "trackId1", userSubmittedId: "userSubmittedId"}, ...]
    this._userQueue = [];
    // Format: [{trackId: "trackId1", userSubmittedId: null}, ...]
    this._suggestionQueue = [];
    // Format: [{path: "path/to/audio/file", metadata: {trackid: '...', userSubmittedId: 'greg'}}, ...]
    this._audioQueue = [];
    this._numSongsToPreload = 2;
  }

  addToUserQueue(trackId, userSubmittedId) {
    this._userQueue.push({ trackId, userSubmittedId });
    this._suggestionQueue = [];
    console.log("Added trackId", trackId, "to user queue");
  }

  addToSuggestionQueue(trackId) {
    if (this._suggestionQueue.length < 5) {
      this._suggestionQueue.push({ trackId, userSubmittedId: null });
      console.log("Added trackId", trackId, "to suggestion queue");
      return true;
    }
    return false;
  }

  popNextTrack() {
    if (this._userQueue.length === 0) {
      if (this._suggestionQueue.length === 0) {
        return {};
      }
      return this._suggestionQueue.shift();
    }
    return this._userQueue.shift();
  }

  addToAudioQueue(audioFile) {
    this._audioQueue.push(audioFile);
    this.emit("songQueued");
    console.log(
      "Added audio file",
      audioFile.metadata?.title,
      " - ",
      audioFile.metadata?.artist,
      "to audio queue",
    );
  }

  popNextAudioFile() {
    const file = this._audioQueue.shift();
    if (this.audioQueueNeedsFilling()) {
      console.log("Audio queue needs filling");
      this.emit("audioQueueNeedsFilling");
    }
    return file;
  }

  audioQueueNeedsFilling() {
    return this._audioQueue.length < this._numSongsToPreload;
  }

  isAudioQueueEmpty() {
    return this._audioQueue.length === 0;
  }

  getLastQueuedSongMetadata() {
    return this._audioQueue[this._audioQueue.length - 1]?.metadata;
  }

  getNextQueuedSongMetadata() {
    return this._audioQueue[0]?.metadata;
  }

  isUserQueueFull() {
    return this._userQueue.length >= 100;
  }

  userQueueHasTrack(trackId) {
    return this._userQueue.includes(trackId);
  }

  audioQueueHasTrack(trackId) {
    return this._audioQueue.some(
      (audioFile) => audioFile.metadata.trackId === trackId,
    );
  }

  getSuggestionQueue() {
    return this._suggestionQueue;
  }

  getUserQueue() {
    return this._userQueue;
  }

  getAudioQueue() {
    return this._audioQueue;
  }

  editUserQueue(newQueue) {
    this._userQueue = newQueue;
  }

  editSuggestionQueue(newQueue) {
    this._suggestionQueue = newQueue;
  }

  editAudioQueue(newQueue) {
    this._audioQueue = newQueue;
  }
}

export default new QueueService();
