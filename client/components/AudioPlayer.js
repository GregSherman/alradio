import { useCallback, useEffect, useState } from "react";
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  Avatar,
  Slider,
  Toolbar,
  ProgressBar,
} from "react95";
import { API_URL, fetchCurrentSong } from "../services/api";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { Rnd } from "react-rnd";
import { useZIndex } from "@/contexts/ZIndexContext";

const AudioPlayer = () => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingProgress, setBufferingProgress] = useState(0);
  const [zIndex, setZIndex] = useState(1);
  const bringToFront = useZIndex();
  const audioUrl = `${API_URL}/stream`;
  const { load, pause, setVolume, getPosition } = useGlobalAudioPlayer();

  // Forces stream to be live on play instead of playing from cache
  const handlePlay = useCallback(() => {
    setIsBuffering(true);
    load(`${audioUrl}?t=${new Date().getTime()}`, {
      autoplay: true,
      html5: true,
      format: "mp3",
    });
  }, [load, audioUrl]);

  const handleTuneIn = useCallback(() => {
    handlePlay();
    setIsPlaying(true);
  }, [handlePlay]);

  const handleTuneOut = useCallback(() => {
    pause();
    setIsPlaying(false);
    setIsBuffering(false);
  }, [pause]);

  // Fetch current song every 10 seconds
  useEffect(() => {
    const getCurrentSong = async () => {
      try {
        const songData = await fetchCurrentSong();
        if (songData.title !== currentSong?.title) {
          setCurrentSong(songData);
        }
      } catch (error) {
        console.error("Error fetching current song:", error);
      }
    };

    getCurrentSong();
    const intervalId = setInterval(getCurrentSong, 10000);
    return () => clearInterval(intervalId);
  }, [currentSong]);

  // Update media session metadata when current song changes
  useEffect(() => {
    if (currentSong && "mediaSession" in navigator) {
      const { mediaSession } = navigator;
      mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: [
          {
            src: currentSong.artUrl,
            sizes: "100x100",
            type: "image/png",
          },
        ],
      });
      mediaSession.setActionHandler("play", handleTuneIn);
      mediaSession.setActionHandler("pause", handleTuneOut);
      mediaSession.setActionHandler("previoustrack", null);
      mediaSession.setActionHandler("nexttrack", null);
      mediaSession.setActionHandler("seekbackward", null);
      mediaSession.setActionHandler("seekforward", null);
    }
  }, [currentSong, handleTuneIn, handleTuneOut]);

  // Buffering effect when starting to play
  useEffect(() => {
    setBufferingProgress(0);
    let progressInterval;

    if (isPlaying) {
      const startTime = Date.now();
      setIsBuffering(true);

      progressInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const smoothProgress = Math.min((elapsedTime / 18000) * 100, 100);

        setBufferingProgress((prevProgress) => {
          if (prevProgress >= 100) return 100;
          const diff = Math.random() * 10;
          const choppyProgress = Math.min(prevProgress + diff, smoothProgress);

          return choppyProgress;
        });

        if (getPosition() > 0) {
          setBufferingProgress(100);
          setTimeout(() => setIsBuffering(false), 300);
        }
      }, 500);

      return () => clearInterval(progressInterval);
    }
  }, [isPlaying, getPosition]);

  const handleVolumeChange = (value) => {
    setVolume(value / 100);
  };

  const handleInteraction = () => {
    setZIndex(bringToFront());
  };

  return (
    <Rnd
      bounds="parent"
      dragHandleClassName="window-header"
      style={{ zIndex }}
      enableResizing={false}
      onDragStart={handleInteraction}
      onResizeStart={handleInteraction}
      onMouseDown={handleInteraction}
      default={{
        x: 500,
        y: 500,
      }}
    >
      <Window>
        <WindowHeader className="window-header">Now Playing</WindowHeader>
        <WindowContent
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "300px", // Maximum size for larger screens
                aspectRatio: "1", // Maintains 1:1 aspect ratio
              }}
            >
              <Avatar
                square
                src={currentSong?.artUrl}
                style={{
                  width: "100%",
                  height: "auto", // Maintain aspect ratio
                  display: "block",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                marginTop: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                {currentSong?.title ? (
                  <>
                    <h2>{currentSong.title}</h2>
                    <p>{currentSong.artist}</p>
                    <p>{currentSong.album}</p>
                  </>
                ) : (
                  <>
                    <h2>Not Playing</h2>
                    <p>Not Playing</p>
                    <p>Not Playing</p>
                  </>
                )}
              </div>
              <div style={{ width: 150, marginLeft: 16 }}>
                <Slider
                  min={0}
                  max={100}
                  defaultValue={75}
                  onChange={handleVolumeChange}
                />
              </div>
            </div>
            {isBuffering && (
              <ProgressBar
                variant="tile"
                value={bufferingProgress}
                style={{ marginTop: 16, width: "100%" }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}></div>
          <Toolbar style={{ display: "flex", padding: 8 }}>
            <Button
              onClick={handleTuneIn}
              active={isPlaying}
              disabled={isPlaying}
              style={{ flex: 1, marginRight: 4 }}
            >
              Tune In
            </Button>
            <Button
              onClick={handleTuneOut}
              active={!isPlaying}
              disabled={!isPlaying}
              style={{ flex: 1, marginLeft: 4 }}
            >
              Tune Out
            </Button>
          </Toolbar>
        </WindowContent>
      </Window>
    </Rnd>
  );
};

export default AudioPlayer;
