// components/BottomBar.js
import React from "react";
import { styled } from "styled-components";
import {
  Button,
  AppBar,
  MenuList,
  MenuListItem,
  Toolbar,
  Separator,
} from "react95";
import original from "react95/dist/themes/original";
import rose from "react95/dist/themes/rose";
import candy from "react95/dist/themes/candy";
import spruce from "react95/dist/themes/spruce";
import vaporTeal from "react95/dist/themes/vaporTeal";
import marine from "react95/dist/themes/marine";
import azureOrange from "react95/dist/themes/azureOrange";
import bee from "react95/dist/themes/bee";
import eggplant from "react95/dist/themes/eggplant";
import highContrast from "react95/dist/themes/highContrast";
import lilac from "react95/dist/themes/lilac";
import maple from "react95/dist/themes/maple";
import ninjaTurtles from "react95/dist/themes/ninjaTurtles";
import pamelaAnderson from "react95/dist/themes/pamelaAnderson";
import theSixtiesUSA from "react95/dist/themes/theSixtiesUSA";
import vermillion from "react95/dist/themes/vermillion";
import violetDark from "react95/dist/themes/violetDark";
import water from "react95/dist/themes/water";

// Styled component for menu list
const StyledMenuList = styled(MenuList)`
  position: absolute;
  left: 0;
  top: 100%;
  z-index: 2000;
`;

// add a Button that says Theme. open a menulist with menulistitems that display the themes
// from the themes object. when a menulistitem is clicked, the theme is set to the corresponding
// theme in the themes object
const TopBar = ({ onToggleTheme }) => {
  const themes = {
    original,
    candy,
    spruce,
    vaporTeal,
    highContrast,
    lilac,
    maple,
    pamelaAnderson,
    theSixtiesUSA,
    violetDark,
  };

  const [themeDropdownOpen, setThemeDropdownOpen] = React.useState(false);

  const handleThemeChange = (themeKey) => {
    onToggleTheme(themes[themeKey]);
  };

  return (
    <AppBar>
      <Toolbar
        style={{ justifyContent: "space-between", position: "relative" }}
      >
        <div style={{ position: "relative", display: "inline-block" }}>
          <Button
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            active={themeDropdownOpen}
          >
            Themes
          </Button>
          {themeDropdownOpen && (
            <StyledMenuList onClick={() => setThemeDropdownOpen(false)}>
              {Object.keys(themes).map((themeKey) => (
                <MenuListItem
                  key={themeKey}
                  onClick={() => handleThemeChange(themeKey)}
                >
                  {themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}
                </MenuListItem>
              ))}
            </StyledMenuList>
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
