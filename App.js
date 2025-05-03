import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SplashScreen from './Screens/SplashScreen'; // Import the SplashScreen component
import LoginScreen from './Screens/LoginScreen';
import ProfileScreen from './Screens/ProfileScreen';
import CalendarScreen from './Screens/CalendarScreen';  
import AllBirthdaysScreen from './Screens/AllBirthdaysScreen';
import BirthdayDetailScreen from './Screens/BirthdayDetailScreen';
import IdeaScreen from './Screens/IdeaScreen'; 
import CommunityScreen from './Screens/CommunityScreen';
import { FIREBASE_AUTH } from './Services/FirebaseConfig';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Function to register for push notifications
async function registerForPushNotificationsAsync() {
  let token;
  
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Minimum time to show splash screen in milliseconds
const SPLASH_DURATION = 2000; // 2 seconds

export default function App() {
  const Stack = createNativeStackNavigator();
  const Tab = createBottomTabNavigator();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);
  const [authComplete, setAuthComplete] = useState(false);

  // Handle splash screen minimum display time
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashComplete(true);
    }, SPLASH_DURATION);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      if (user) {
        console.log(user.email + " is logged in!");
        setUser(user);
      } else {
        console.log("User logged out");
        setUser(null);
      }
      setAuthComplete(true);
    });

    return () => unsubscribe();
  }, []);
  
  // Update loading state when both splash and auth are complete
  useEffect(() => {
    if (splashComplete && authComplete) {
      setIsLoading(false);
    }
  }, [splashComplete, authComplete]);

  // Set up notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      console.log('Push token:', token);
    });

    // Handle notifications when app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle user interaction with notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Here you could navigate to the birthday details if clicked
      // Example: if (response.notification.request.content.data.id) {
      //   navigate to birthday details page with that ID
      // }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Calendar-related stack navigator
  const CalendarStack = createNativeStackNavigator();
  function CalendarStackNavigator() {
    return (
      <CalendarStack.Navigator>
        <CalendarStack.Screen name="CalendarMain" component={CalendarScreen} options={{ headerShown: false }} />
        <CalendarStack.Screen name="AllBirthdays" component={AllBirthdaysScreen} options={{ headerShown: false }} />
        <CalendarStack.Screen name="BirthdayDetail" component={BirthdayDetailScreen} options={{ headerShown: false }} />
      </CalendarStack.Navigator>
    );
  }

  // Bottom tab navigator for the main app sections
  function TabNavigator() {
    return (
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#8E2F2D',
          tabBarInactiveTintColor: '#000',
          headerShown: false,
          tabBarStyle: {
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            paddingBottom: 5,
          },
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={CalendarStackNavigator} 
          options={{
            tabBarLabel: 'Calendar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Idea" 
          component={IdeaScreen} 
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bulb" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Community" 
          component={CommunityScreen} 
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={24} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoading ? (
          // Show splash screen while checking auth state
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : user ? (
          // User is logged in, show main app
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          // User is not logged in, show login screen
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}