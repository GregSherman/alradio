import { useEffect, useState } from "react";
import { Window, WindowHeader, WindowContent, Avatar } from "react95";
import styled from "styled-components";
import { fetchNextSong } from "../services/api"; // Ensure this function exists in your api service
import { Rnd } from "react-rnd";
import { useZIndex } from "@/contexts/ZIndexContext";

const StyledWindowContent = styled(WindowContent)`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StyledAvatar = styled(Avatar)`
  width: 100%;
  max-width: 100px; /* Adjust size as needed */
  height: auto;
  margin-right: 16px;
`;

const SongDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: left;
`;

const NextSong = () => {
  const [nextSong, setNextSong] = useState(null);
  const [zIndex, setZIndex] = useState(1);
  const bringToFront = useZIndex();

  useEffect(() => {
    const getNextSong = async () => {
      try {
        const songData = await fetchNextSong();
        setNextSong(songData);
      } catch (error) {
        console.error("Error fetching next song:", error);
      }
    };

    getNextSong();
    const intervalId = setInterval(getNextSong, 10000);
    return () => clearInterval(intervalId);
  }, []);

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
        <WindowHeader className="window-header">Next Song</WindowHeader>
        <StyledWindowContent>
          {nextSong?.title ? (
            <>
              <StyledAvatar square src={nextSong.artUrl} />
              <SongDetails>
                <h2>{nextSong.title}</h2>
                <p>{nextSong.artist}</p>
                <p>{nextSong.album}</p>
              </SongDetails>
            </>
          ) : (
            <>
              <StyledAvatar square />
              <SongDetails>
                <h2>Nothing Queued</h2>
                <p>Nothing Queued</p>
                <p>Nothing Queued</p>
              </SongDetails>
            </>
          )}
        </StyledWindowContent>
      </Window>
    </Rnd>
  );
};

export default NextSong;
