import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BirthdayItem = ({ id, name, date, daysRemaining, onPress }) => {
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  
  // Check notification status on component mount
  useEffect(() => {
    checkNotificationStatus();
  }, []);
  
  // Check if this birthday has a notification set
  const checkNotificationStatus = async () => {
    try {
      const notificationId = await AsyncStorage.getItem(`notification_${id}`);
      setNotificationEnabled(notificationId !== null);
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };
  
  // Get initial letter for avatar
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'B';
  };
  
  // Get random avatar color based on name
  const getAvatarColor = (name) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2'];
    let sum = 0;
    
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    
    return colors[sum % colors.length];
  };

  // Check if notification permission is granted
  async function checkNotificationPermission() {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'You need to enable notifications permission to receive birthday reminders.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } else {
      Alert.alert(
        'Physical device needed',
        'Notifications require a physical device to work properly.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  // Schedule a notification for the birthday
  const scheduleBirthdayNotification = async () => {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return;
    
    try {
      // Parse the date
      const birthdayDate = new Date(date);
      
      // For testing only - set notification to appear 10 seconds from now
      const trigger = new Date(Date.now() + 10 * 1000);
      
      // If the date is in the past for this year, set it for next year
      const now = new Date();
      if (trigger < now) {
        trigger.setFullYear(trigger.getFullYear() + 1);
      }
      
      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${name}'s Birthday in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}!`,
          body: `Don't forget to wish ${name} a happy birthday !`,
          data: { id, name },
        },
        trigger,
      });
      
      // Store the notification ID in AsyncStorage
      await AsyncStorage.setItem(`notification_${id}`, notificationId);
      
      setNotificationEnabled(true);
      Alert.alert('Success', `Birthday reminder set for ${name}!`);
      
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', 'Failed to set birthday reminder. Please try again.');
    }
  };

  // Cancel a scheduled notification
  const cancelBirthdayNotification = async () => {
    try {
      // Retrieve the notification ID from AsyncStorage
      const notificationId = await AsyncStorage.getItem(`notification_${id}`);
      
      if (notificationId) {
        // Cancel the notification
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        
        // Remove the notification ID from AsyncStorage
        await AsyncStorage.removeItem(`notification_${id}`);
      }
      
      setNotificationEnabled(false);
      Alert.alert('Success', `Birthday reminder for ${name} has been removed.`);
    } catch (error) {
      console.error('Error canceling notification:', error);
      Alert.alert('Error', 'Failed to remove birthday reminder. Please try again.');
    }
  };

  // Toggle notification on/off
  const toggleNotification = () => {
    if (notificationEnabled) {
      cancelBirthdayNotification();
    } else {
      scheduleBirthdayNotification();
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View 
        style={[
          styles.avatar, 
          { backgroundColor: getAvatarColor(name) }
        ]}
      >
        <Text style={styles.initial}>{getInitial(name)}</Text>
      </View>
      
      <View style={styles.details}>
        <Text style={styles.name}>{name} Birthday</Text>
        <Text style={styles.date}>
          {typeof daysRemaining === 'number' 
            ? `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining` 
            : date}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.notification}
        onPress={toggleNotification}
      >
        <Text style={[
          styles.notificationIcon,
          notificationEnabled && styles.notificationEnabled
        ]}>
          🔔
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.chevron}>
        <Text style={styles.chevronIcon}>▶</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  initial: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  details: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  date: {
    color: '#666',
    fontSize: 14,
  },
  notification: {
    padding: 5,
  },
  notificationIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  notificationEnabled: {
    opacity: 1,
    color: '#8E2F2D',
  },
  chevron: {
    marginLeft: 5,
  },
  chevronIcon: {
    fontSize: 14,
    color: '#8E2F2D',
  },
});

export default BirthdayItem;
