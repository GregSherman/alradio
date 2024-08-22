import { useState } from "react";
import {
  Button,
  TextInput,
  Window,
  WindowHeader,
  WindowContent,
} from "react95";
import { API_URL } from "../services/api";
import { Rnd } from "react-rnd";
import { useZIndex } from "@/contexts/ZIndexContext";

const SubmitSong = () => {
  const [query, setQuery] = useState("");
  const [trackId, setTrackId] = useState("");
  const [songMetadata, setSongMetadata] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [notification, setNotification] = useState("");
  const [zIndex, setZIndex] = useState(1);
  const bringToFront = useZIndex();

  const handleQueryChange = (e) => setQuery(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();

      if (result.metadata) {
        setSongMetadata(result.metadata);
        setIsConfirming(true);
        setTrackId(result.metadata.trackId);
      } else if (result.success) {
        setQuery("");
        setSongMetadata(null);
        setIsConfirming(false);
        setNotification("Song submitted successfully!");
        setTimeout(() => setNotification(""), 5000);
      }
    } catch (error) {
      console.error("Error submitting song:", error);
    }
  };

  const handleConfirm = async () => {
    try {
      const response = await fetch(`${API_URL}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trackId }),
      });

      const result = await response.json();
      if (result.success) {
        setNotification("Song confirmed successfully!");
        setTimeout(() => setNotification(""), 5000);
      } else {
        setQuery("");
        setNotification(result.message);
        setTimeout(() => setNotification(""), 5000);
      }
    } catch (error) {
      console.error("Error confirming song:", error);
      setNotification("Error confirming song. Please try again.");
    }

    setQuery("");
    setTrackId("");
    setSongMetadata(null);
    setIsConfirming(false);
  };

  const handleCancel = () => {
    setIsConfirming(false);
    setNotification("Song submission canceled.");
    setTimeout(() => setNotification(""), 5000);
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
        <WindowHeader className="window-header">Submit a Song</WindowHeader>
        <WindowContent>
          <div style={{ display: "flex" }}>
            <TextInput
              value={query}
              onChange={handleQueryChange}
              placeholder="Search for a song..."
              fullWidth
            />
            <Button onClick={handleSubmit} type="submit">
              Request
            </Button>
          </div>
          {isConfirming && songMetadata && (
            <div>
              <h3>Confirm Song</h3>
              <p>Title: {songMetadata.title}</p>
              <p>Artist: {songMetadata.artist}</p>
              <p>Album: {songMetadata.album}</p>
              <Button onClick={() => handleConfirm()}>Confirm</Button>
              <Button onClick={handleCancel}>Cancel</Button>
            </div>
          )}
          {notification && (
            <div style={{ marginTop: 10, color: "magenta" }}>
              {notification}
            </div>
          )}
        </WindowContent>
      </Window>
    </Rnd>
  );
};

export default SubmitSong;
