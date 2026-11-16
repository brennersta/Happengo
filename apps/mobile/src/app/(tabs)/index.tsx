import { StyleSheet, View } from "react-native";
import { Map } from "@/map/Map";
import { TALLINN, mapStyleUrl } from "@/map/config";

export default function DiscoverScreen() {
  return (
    <View style={styles.fill}>
      <Map center={TALLINN} zoom={11} styleUrl={mapStyleUrl()} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
