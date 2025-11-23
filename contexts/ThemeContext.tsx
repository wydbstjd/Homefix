import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  themeColors: {
    background: string;
    text: string;
    headerBackground: string;
    buttonBackground: string;
    cardBackground: string;
    borderColor: string;
    inputBackground: string;
  };
  fontSizeMultiplier: number;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>('medium');

  // 폰트 크기 배수 정의
  const fontSizeMultiplier = fontSize === 'small' ? 0.9 : fontSize === 'medium' ? 1.0 : 1.1;

  // 테마 색상 정의
  const themeColors = {
    background: isDarkMode ? "#000000" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#000000",
    headerBackground: isDarkMode ? "#1a1a1a" : "#f5f5f5",
    buttonBackground: isDarkMode ? "#2a2a2a" : "#f0f0f0",
    cardBackground: isDarkMode ? "#1a1a1a" : "#FFFFFF",
    borderColor: isDarkMode ? "#333333" : "#e0e0e0",
    inputBackground: isDarkMode ? "#2a2a2a" : "#FFFFFF",
  };

  // 다크모드 토글 함수
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    AsyncStorage.setItem("isDarkMode", JSON.stringify(newMode));
  };

  // 폰트 크기 설정 함수
  const setFontSize = (size: 'small' | 'medium' | 'large') => {
    setFontSizeState(size);
    AsyncStorage.setItem("fontSize", size);
  };

  // 앱 시작 시 저장된 테마 설정 불러오기
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("isDarkMode");
        if (savedTheme !== null) {
          setIsDarkMode(JSON.parse(savedTheme));
        }

        const savedFontSize = await AsyncStorage.getItem("fontSize");
        if (savedFontSize !== null && ['small', 'medium', 'large'].includes(savedFontSize)) {
          setFontSizeState(savedFontSize as 'small' | 'medium' | 'large');
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    };
    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider 
      value={{ 
        isDarkMode, 
        toggleDarkMode, 
        fontSize, 
        setFontSize, 
        themeColors, 
        fontSizeMultiplier 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
