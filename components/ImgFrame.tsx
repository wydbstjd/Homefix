import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

interface ImgFrameProps {
  style: object;
}
const ImgFrame = ({ children, style }: PropsWithChildren<ImgFrameProps>) => {
  const frameStyle = children ? styles.img : styles.default;
  return (
    <View style={StyleSheet.compose(frameStyle, style)}>
      {children ?? <Text>선택한 이미지가 이곳에 표시됩니다.</Text>}
    </View>
  );
};

export default ImgFrame;

const styles = StyleSheet.create({
  default: {
    display: "flex",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#909090",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10%",
  },
  img: {
    alignItems: "center",
    justifyContent: "center",
  },
});
