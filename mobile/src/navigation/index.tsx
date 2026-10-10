import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import DashboardScreen from '../screens/DashboardScreen';
import LoginScreen from '../screens/LoginScreen';
import ProjectDetailScreen from '../screens/ProjectDetailScreen';
import ProjectFormScreen from '../screens/ProjectFormScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TaskFormScreen from '../screens/TaskFormScreen';
import TasksScreen from '../screens/TasksScreen';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Transparent so the animated Background shows through every screen.
const theme = { ...DefaultTheme, dark: true, colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent', text: colors.text, border: colors.border, primary: colors.iris } };

const ICONS: Record<keyof TabParamList, [React.ComponentProps<typeof Ionicons>['name'], React.ComponentProps<typeof Ionicons>['name']]> = {
  Dashboard: ['grid', 'grid-outline'],
  Projects: ['albums', 'albums-outline'],
  Tasks: ['checkmark-done-circle', 'checkmark-done-circle-outline'],
};

function Tabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: colors.iris,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        tabBarStyle: { position: 'absolute', backgroundColor: 'rgba(12,18,44,0.94)', borderTopColor: colors.border, height: 62 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6, elevation: 0 },
        tabBarIcon: ({ focused, color }) => <Ionicons name={ICONS[route.name][focused ? 0 : 1]} size={23} color={color} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Projects" component={ProjectsScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
    </Tab.Navigator>
  );
}

export function AuthNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom', contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function MainNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
        <Stack.Screen name="ProjectForm" component={ProjectFormScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#0d1330' } }} />
        <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#0d1330' } }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
