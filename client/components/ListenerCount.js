// components/ListenerCount.js
import { useEffect, useState } from "react";
import { fetchListenerCount } from "../services/api";
import { Window, WindowHeader, WindowContent, Counter } from "react95";
import { Rnd } from "react-rnd";
import { useZIndex } from "@/contexts/ZIndexContext";

const ListenerCount = () => {
  const [listenerCount, setListenerCount] = useState(0);
  const [zIndex, setZIndex] = useState(1);
  const bringToFront = useZIndex();

  useEffect(() => {
    const getListenerCount = async () => {
      try {
        const count = await fetchListenerCount();
        setListenerCount(count);
      } catch (error) {
        console.error("Error fetching listener count:", error);
      }
    };

    getListenerCount();
    const intervalId = setInterval(getListenerCount, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handleInteraction = () => {
    setZIndex(bringToFront());
  };

  return (
    <Rnd
      bounds="parent"
      dragHandleClassName="window-header" // Draggable by the WindowHeader only
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
        <WindowHeader className="window-header">Listeners</WindowHeader>
        <WindowContent>
          <Counter value={listenerCount} />
        </WindowContent>
      </Window>
    </Rnd>
  );
};

export default ListenerCount;
