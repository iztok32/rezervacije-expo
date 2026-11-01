import { Stack } from 'expo-router';

// Upravljanje: sklad podzaslonov v zavihku (glave izrišejo zasloni sami, kot drugod v aplikaciji)
export default function ManageLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
