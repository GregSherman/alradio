import { useEffect, useState } from "react";
import {
  Window,
  WindowHeader,
  WindowContent,
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableDataCell,
  Avatar,
  ScrollView, // Import ScrollView
} from "react95";
import { fetchSongHistory } from "../services/api";
import GetSong from "./GetSong";
import { Rnd } from "react-rnd";
import { useZIndex } from "@/contexts/ZIndexContext";

const SongHistory = () => {
  const [songHistory, setSongHistory] = useState([
    {
      title: "Loading...",
      artist: "Loading...",
      artUrl: "",
      urlForPlatform: {
        spotify: "default",
        appleMusic: "default",
      },
    },
  ]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zIndex, setZIndex] = useState(1);
  const bringToFront = useZIndex();

  useEffect(() => {
    const getSongHistory = async () => {
      try {
        const historyData = await fetchSongHistory();
        setSongHistory(historyData);
      } catch (error) {
        console.error("Error fetching song history:", error);
      }
    };

    getSongHistory();
    const intervalId = setInterval(getSongHistory, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handleRowClick = (song) => {
    setSelectedSong(song);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSong(null);
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
        <WindowHeader className="window-header">History</WindowHeader>
        <WindowContent>
          <ScrollView
            style={{ height: "400px" }} // Set a fixed height
            scrollable
          >
            <Table>
              <TableHead>
                <TableHeadCell></TableHeadCell>
                <TableHeadCell>Title</TableHeadCell>
                <TableHeadCell>Artist</TableHeadCell>
              </TableHead>
              <TableBody>
                {songHistory.map((song, index) => (
                  <TableRow key={index} onClick={() => handleRowClick(song)}>
                    <TableDataCell>
                      <Avatar square size={50} src={song.artUrl} />
                    </TableDataCell>
                    <TableDataCell>{song.title}</TableDataCell>
                    <TableDataCell>{song.artist}</TableDataCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollView>
        </WindowContent>
      </Window>

      {selectedSong && (
        <GetSong
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          urlForPlatform={selectedSong.urlForPlatform}
        />
      )}
    </Rnd>
  );
};

export default SongHistory;
