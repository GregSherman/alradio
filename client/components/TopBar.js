import React, { useRef, useEffect, useState } from "react";
import { styled } from "styled-components";
import { Button, AppBar, MenuList, MenuListItem, Toolbar } from "react95";
import original from "react95/dist/themes/original";
import candy from "react95/dist/themes/candy";
import spruce from "react95/dist/themes/spruce";
import vaporTeal from "react95/dist/themes/vaporTeal";
import highContrast from "react95/dist/themes/highContrast";
import lilac from "react95/dist/themes/lilac";
import maple from "react95/dist/themes/maple";
import pamelaAnderson from "react95/dist/themes/pamelaAnderson";
import theSixtiesUSA from "react95/dist/themes/theSixtiesUSA";
import violetDark from "react95/dist/themes/violetDark";

// Styled component for menu list
const StyledMenuList = styled(MenuList)`
  position: absolute;
  left: 0;
  top: 100%;
  z-index: 2000;
`;

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

  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const handleThemeChange = (themeKey) => {
    onToggleTheme(themes[themeKey]);
    setThemeDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <AppBar>
      <Toolbar
        style={{ justifyContent: "space-between", position: "relative" }}
      >
        <div style={{ position: "relative", display: "inline-block" }}>
          <Button
            ref={buttonRef}
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            active={themeDropdownOpen}
          >
            Themes
          </Button>
          {themeDropdownOpen && (
            <StyledMenuList
              ref={menuRef}
              onClick={() => setThemeDropdownOpen(false)}
            >
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
