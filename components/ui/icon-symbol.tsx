
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, StyleProp, TextStyle } from "react-native";

type MaterialName = ComponentProps<typeof MaterialIcons>["name"];

type ExtraSymbolNames =
  | "globe.europe.africa.fill"
  | "gearshape.fill"
  | "location.magnifyingglass"
  | "xmark"
  | "chevron.up"
  | "chevron.down"
  | "map.fill"
  | "route.fill";

type IconMapping = Partial<Record<SymbolViewProps["name"] | ExtraSymbolNames, MaterialName>>;
export type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",

  "globe.europe.africa.fill": "public",
  "gearshape.fill": "settings",
  "location.magnifyingglass": "search",
  "xmark": "close",
  "chevron.up": "keyboard-arrow-up",
  "chevron.down": "keyboard-arrow-down",

  "map.fill": "map",
  "route.fill": "alt-route",
} satisfies IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name] as MaterialName}
      style={style}
    />
  );
}
