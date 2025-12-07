import { Text } from "react-native";
import React from "react";

// **텍스트** 형태의 강조 표시를 굵게 표시하는 함수
export const renderFormattedText = (
  text: string,
  textStyle: any
): React.ReactNode => {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <Text style={textStyle}>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          // **텍스트** 형태의 부분을 굵게 표시
          const boldText = part.slice(2, -2); // ** 제거
          return (
            <Text key={index} style={{ fontWeight: "bold" }}>
              {boldText}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};
