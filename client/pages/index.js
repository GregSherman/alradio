import React, { useState, useEffect } from "react";
import { createGlobalStyle, ThemeProvider } from "styled-components";
import { styleReset } from "react95";
import { ZIndexProvider } from "../contexts/ZIndexContext";
import candy from "react95/dist/themes/candy";
import ms_sans_serif from "react95/dist/fonts/ms_sans_serif.woff2";
import ms_sans_serif_bold from "react95/dist/fonts/ms_sans_serif_bold.woff2";
import styled from "styled-components";
import { ScrollView, Window } from "react95";

import AudioPlayer from "@/components/AudioPlayer";
import SongHistory from "@/components/SongHistory";
import NextSong from "@/components/NextSong";
import ListenerCount from "@/components/ListenerCount";
import SubmitSong from "@/components/SubmitSong";
import TopBar from "@/components/TopBar";
import ResponsiveLayout from "@/components/ResponsiveLayout";

// Global Styles with scanline effect
const GlobalStyles = createGlobalStyle`
  ${styleReset}
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('${ms_sans_serif}') format('woff2');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('${ms_sans_serif_bold}') format('woff2');
    font-weight: bold;
    font-style: normal;
  }
  body, input, select, textarea {
    font-family: 'ms_sans_serif';
  }

  body {
    background-color: ${({ theme }) => theme.headerBackground};
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.05),
      rgba(255, 255, 255, 0.05) 1px,
      rgba(255, 255, 255, 0.1) 1px,
      rgba(255, 255, 255, 0.1) 2px
    );
    z-index: 1000;
    pointer-events: none;
  }
`;

const RadioTitle = styled.h1`
  font-size: 5rem;
  margin: 0;
  text-align: right;
  flex-grow: 1;
  color: ${({ theme }) => theme.tooltip};
  text-shadow:
    1px 1px 0 #fff,
    2px 2px 0 #ccc,
    3px 3px 0 #999,
    4px 4px 0 #666;
  width: 100%;
  margin-right: 20px;
`;

const ContentContainer = styled.div`
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: calc(100vh - 40px);
  box-sizing: border-box;
`;

const MobileScrollView = styled(ScrollView)`
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  margin: 0;
`;

const TopBarContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
`;

export default function Home() {
  const [theme, setTheme] = useState(candy);
  const [isMobile, setIsMobile] = useState(false);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Check size on initial render
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const Content = () => (
    <>
      <TopBarContainer>
        <TopBar style={{ zIndex: "3000" }} onToggleTheme={toggleTheme} />
      </TopBarContainer>
      <ContentContainer>
        <RadioTitle>AL Radio</RadioTitle>
        <ResponsiveLayout
          isMobile={isMobile}
          header="Listeners"
          defaultPosition={{ x: 100, y: 150 }}
          zIndex={1}
        >
          <ListenerCount />
        </ResponsiveLayout>
        <ResponsiveLayout
          isMobile={isMobile}
          header="Audio Player"
          defaultPosition={{ x: 700, y: 300 }}
          zIndex={5}
        >
          <AudioPlayer />
        </ResponsiveLayout>
        <ResponsiveLayout
          isMobile={isMobile}
          header="Next Song"
          defaultPosition={{ x: 100, y: 500 }}
          zIndex={2}
        >
          <NextSong />
        </ResponsiveLayout>
        <ResponsiveLayout
          isMobile={isMobile}
          header="Submit Song"
          defaultPosition={{ x: 600, y: 100 }}
          zIndex={3}
        >
          <SubmitSong />
        </ResponsiveLayout>
        <ResponsiveLayout
          isMobile={isMobile}
          header="Song History"
          defaultPosition={{ x: 1200, y: 200 }}
          zIndex={4}
        >
          <SongHistory />
        </ResponsiveLayout>
      </ContentContainer>
    </>
  );

  return (
    <ZIndexProvider>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        {isMobile ? (
          <Window>
            <MobileScrollView>
              <Content />
            </MobileScrollView>
          </Window>
        ) : (
          <Content />
        )}
      </ThemeProvider>
    </ZIndexProvider>
  );
}
