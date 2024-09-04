import { EventEmitter } from "events";
import RequestModelService from "./db/RequestModelService.js";
class QueueService extends EventEmitter {
  constructor() {
    super();
    // Format: [{trackId: "trackId1", userSubmittedId: null}, ...]
    this._autoSuggestionQueue = [];
    // Format: [{path: "path/to/audio/file", metadata: {trackid: '...', userSubmittedId: 'greg'}}, ...]
    this._audioQueue = [];
    this._numSongsToPreload = 2;
  }

  async addToUserQueue(trackId, userSubmittedId) {
    await RequestModelService.addRequest(trackId, userSubmittedId);
    this._autoSuggestionQueue = [];
  }

  addToSuggestionQueue(trackId) {
    if (this._autoSuggestionQueue.length < 5) {
      this._autoSuggestionQueue.push({ trackId, userSubmittedId: null });
      console.log("Added trackId", trackId, "to suggestion queue");
      return true;
    }
    return false;
  }

  async popNextTrack() {
    if (!(await RequestModelService.hasRequestedTracks())) {
      if (this._autoSuggestionQueue.length === 0) {
        return {};
      }
      return this._autoSuggestionQueue.shift();
    }
    return RequestModelService.getNextUserRequest();
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

  async isUserQueueFull() {
    return RequestModelService.isQueueFull();
  }

  async userQueueHasTrack(trackId) {
    return RequestModelService.isTrackRequested(trackId);
  }

  audioQueueHasTrack(trackId) {
    return this._audioQueue.some(
      (audioFile) => audioFile.metadata.trackId === trackId,
    );
  }

  getSuggestionQueue() {
    return this._autoSuggestionQueue;
  }

  async getUserQueue() {
    return RequestModelService.fetchLastRequestedTracks();
  }

  getAudioQueue() {
    return this._audioQueue;
  }

  async editUserQueue(newQueue) {
    await RequestModelService.updateRequestQueue(newQueue);
  }

  editSuggestionQueue(newQueue) {
    this._autoSuggestionQueue = newQueue;
  }

  editAudioQueue(newQueue) {
    this._audioQueue = newQueue;
  }

  async markSongAsFailed(trackId, requestId) {
    await RequestModelService.markRequestAsFailed(requestId);
  }
}

export default new QueueService();
