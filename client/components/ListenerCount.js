import { useEffect, useState } from "react";
import { fetchListenerCount } from "../services/api";
import { Window, WindowHeader, WindowContent, Counter } from "react95";

const ListenerCount = () => {
  const [listenerCount, setListenerCount] = useState(0);

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

  // center the counter
  return (
    <Window>
      <WindowHeader className="window-header">Listeners</WindowHeader>
      <WindowContent style={{ display: "flex", justifyContent: "center" }}>
        <Counter value={listenerCount} minLength={12} />
      </WindowContent>
    </Window>
  );
};

export default ListenerCount;
