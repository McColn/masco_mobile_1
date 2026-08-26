// This is an alias — redirects to main clients tab
import { Redirect } from 'expo-router';
export default function BranchClientsScreen() {
  return <Redirect href="/(tabs)/clients" />;
}
