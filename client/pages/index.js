// pages/index.js
import React from "react";
import { createGlobalStyle, ThemeProvider } from "styled-components";
import { styleReset } from "react95";
import { ZIndexProvider } from "../contexts/ZIndexContext";
import candy from "react95/dist/themes/candy";
import ms_sans_serif from "react95/dist/fonts/ms_sans_serif.woff2";
import ms_sans_serif_bold from "react95/dist/fonts/ms_sans_serif_bold.woff2";
import styled from "styled-components";

import AudioPlayer from "@/components/AudioPlayer";
import SongHistory from "@/components/SongHistory";
import NextSong from "@/components/NextSong";
import ListenerCount from "@/components/ListenerCount";
import SubmitSong from "@/components/SubmitSong";
import TopBar from "@/components/TopBar";
import { useState } from "react";

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
    /* Prevent text selection */
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  /* Scanline effect */
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

// Styled title for the application
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

// Create ContentContainer with margin-top equal to the height of the TopBar
const ContentContainer = styled.div`
  margin-top: 40px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: calc(100vh - 40px);
  box-sizing: border-box;
`;

export default function Home() {
  const [theme, setTheme] = useState(candy);
  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ZIndexProvider>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <TopBar onToggleTheme={toggleTheme} />
        <ContentContainer>
          <RadioTitle>AL Radio</RadioTitle>
          <ListenerCount />
          <AudioPlayer />
          <NextSong />
          <SubmitSong />
          <SongHistory />
        </ContentContainer>
      </ThemeProvider>
    </ZIndexProvider>
  );
}
