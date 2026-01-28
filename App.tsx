import "react-native-gesture-handler";
import React from "react";
import { Text, TextInput } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/contexts/AuthContext";
import { QuranProvider } from "./src/contexts/QuranContext";
import { QuranAudioProvider } from "./src/contexts/QuranAudioContext";
import ReadScreen from "./src/screens/ReadScreen";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { useFonts as useScheherazade, ScheherazadeNew_400Regular, ScheherazadeNew_700Bold } from "@expo-google-fonts/scheherazade-new";
import { useFonts as useAmiri, Amiri_400Regular, Amiri_700Bold } from "@expo-google-fonts/amiri";

export type RootStackParamList = {
  Read: {
    surahNumber?: string;
    verse?: string;
    themeName?: string;
  };
  ReadTheme: {
    surahNumber?: string;
    verse?: string;
    themeName?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

const App = () => {
  if (Text.defaultProps == null) {
    Text.defaultProps = {};
  }
  Text.defaultProps.allowFontScaling = false;
  Text.defaultProps.maxFontSizeMultiplier = 1;

  if (TextInput.defaultProps == null) {
    TextInput.defaultProps = {};
  }
  TextInput.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.maxFontSizeMultiplier = 1;

  const [scheherazadeLoaded] = useScheherazade({
    ScheherazadeNew_400Regular,
    ScheherazadeNew_700Bold,
  });
  const [amiriLoaded] = useAmiri({
    Amiri_400Regular,
    Amiri_700Bold,
  });

  if (!scheherazadeLoaded || !amiriLoaded) {
    return null;
  }

  const linking = {
    prefixes: ["theclearquran://", "https://theclearquran.org"],
    config: {
      screens: {
        Read: "read/:surahNumber?/:verse?",
        ReadTheme: "read/:surahNumber/theme/:themeName",
      },
    },
  };

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <QuranProvider>
              <QuranAudioProvider>
                <NavigationContainer linking={linking}>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Read" component={ReadScreen} />
                    <Stack.Screen name="ReadTheme" component={ReadScreen} />
                  </Stack.Navigator>
                </NavigationContainer>
              </QuranAudioProvider>
            </QuranProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

export default App;
