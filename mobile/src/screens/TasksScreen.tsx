import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import Fab from '../components/Fab';
import TaskList from '../components/TaskList';

export default function TasksScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <TaskList
        showProject
        header={
          <View>
            <Text style={styles.title}>Tasks</Text>
            <Text style={styles.sub}>Everything across your projects</Text>
          </View>
        }
      />
      <Fab label="New task" onPress={() => nav.navigate('TaskForm', {})} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 32, letterSpacing: -1.2 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 14.5 },
});
