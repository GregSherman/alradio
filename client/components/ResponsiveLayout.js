import React from "react";
import { Rnd } from "react-rnd";
import styled from "styled-components";

const MobileWindow = styled.div`
  width: 100%;
  > div {
    width: 100%;
  }
`;

const ResponsiveLayout = ({
  isMobile,
  children,
  header,
  defaultPosition,
  zIndex,
}) => {
  if (isMobile) {
    return <MobileWindow>{children}</MobileWindow>;
  }

  return (
    <Rnd
      bounds="parent"
      dragHandleClassName="window-header"
      enableResizing={false}
      default={defaultPosition}
      style={{ zIndex }}
    >
      {children}
    </Rnd>
  );
};

export default ResponsiveLayout;
