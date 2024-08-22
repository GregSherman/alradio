import { createContext, useContext, useState } from "react";

const ZIndexContext = createContext();

export const ZIndexProvider = ({ children }) => {
  const [zIndexCounter, setZIndexCounter] = useState(1);

  const bringToFront = () => {
    const nextZIndex = zIndexCounter + 1;
    setZIndexCounter(nextZIndex);
    return nextZIndex;
  };

  return (
    <ZIndexContext.Provider value={bringToFront}>
      {children}
    </ZIndexContext.Provider>
  );
};

export const useZIndex = () => useContext(ZIndexContext);
