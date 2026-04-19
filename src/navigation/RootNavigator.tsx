import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { RootTabParams } from '@/types';
import RegistrationStack from './RegistrationStack';
import StudyStack from './StudyStack';
import WordListStack from './WordListStack';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import HelpScreen from '@/screens/help/HelpScreen';
import { Colors } from '@/constants';

const Tab = createBottomTabNavigator<RootTabParams>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.6 }}>
      {emoji}
    </Text>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="Registration"
          component={RegistrationStack}
          options={{
            tabBarLabel: '登録',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="📷" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Study"
          component={StudyStack}
          options={{
            tabBarLabel: '学習',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="✏️" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="WordList"
          component={WordListStack}
          options={{
            tabBarLabel: '単語帳',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="📖" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Help"
          component={HelpScreen}
          options={{
            tabBarLabel: '使い方',
            headerShown: true,
            headerTitle: '使い方',
            headerStyle: { backgroundColor: Colors.primary },
            headerTintColor: Colors.textOnPrimary,
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="❓" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: '設定',
            headerShown: true,
            headerTitle: '設定',
            headerStyle: { backgroundColor: Colors.primary },
            headerTintColor: Colors.textOnPrimary,
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="⚙️" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
