import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: {
            display: "none", // 탭 바 완전히 숨김
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
            ),
            href: null, // 탭 바에서 숨김
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Photo",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="camera.fill" color={color} />
            ),
            href: null, // 탭 바에서 숨김
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="message.fill" color={color} />
            ),
            href: null, // 탭 바에서 숨김
          }}
        />
        <Tabs.Screen
          name="result"
          options={{
            title: "Result",
            tabBarIcon: ({ color }) => (
              <IconSymbol
                size={28}
                name="checkmark.circle.fill"
                color={color}
              />
            ),
            href: null, // 탭 바에서 숨김
          }}
        />
      </Tabs>
    </ThemeProvider>
  );
}
