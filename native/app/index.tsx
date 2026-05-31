import { Redirect } from 'expo-router';
import { useStore } from '../src/store';

export default function Index() {
  const loggedIn = useStore(s => s.loggedIn);
  return loggedIn
    ? <Redirect href="/(tabs)" />
    : <Redirect href="/(auth)/welcome" />;
}
