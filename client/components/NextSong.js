import { useEffect, useState } from "react";
import { Window, WindowHeader, WindowContent, Avatar } from "react95";
import styled from "styled-components";
import { fetchNextSong } from "../services/api";

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

  return (
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
  );
};

export default NextSong;
