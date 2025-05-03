import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';

// Get device width to calculate day cell size
const { width } = Dimensions.get('window');
// Increase padding for all screens to move calendar further inside
const screenPadding = width < 380 ? 70 : 60; 
const DAY_CELL_SIZE = (width - screenPadding) / 7;

const CalendarView = ({ selectedDate, onDateChange, events, onPrevMonth, onNextMonth }) => {
  // Get days in current month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Generate calendar data
  const generateCalendarData = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay();
    
    const data = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      data.push({ day: '', empty: true, id: `empty-${i}` });
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      
      // Check if there are events on this day
      const dayEvents = events.filter(event => {
        let eventDate;
        // Handle both regular Date objects and those with jsDate property
        if (event.jsDate) {
          eventDate = event.jsDate;
        } else if (event.date && typeof event.date.toDate === 'function') {
          eventDate = event.date.toDate();
        } else if (event.date instanceof Date) {
          eventDate = event.date;
        }
        
        if (!eventDate) return false;
        
        return eventDate.getDate() === i && 
               eventDate.getMonth() === month && 
               eventDate.getFullYear() === year;
      });
      
      data.push({ 
        day: i, 
        date: dayDate,
        events: dayEvents,
        hasEvents: dayEvents.length > 0,
        id: `day-${i}`
      });
    }
    
    return data;
  };

  // Format month and year
  const formatMonthYear = (date) => {
    const options = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Handle day press
  const handleDayPress = (item) => {
    if (item.empty || !item.date) return;
    
    // Create a new date object with the selected day but keeping time components
    const newDate = new Date(selectedDate);
    newDate.setFullYear(item.date.getFullYear());
    newDate.setMonth(item.date.getMonth());
    newDate.setDate(item.date.getDate());
    
    onDateChange(newDate);
  };

  // Render calendar day
  const renderDay = ({ item }) => {
    if (item.empty) {
      return <View style={styles.emptyDay} />;
    }

    // Check if this day is today
    const today = new Date();
    const isToday = item.date.getDate() === today.getDate() &&
                    item.date.getMonth() === today.getMonth() &&
                    item.date.getFullYear() === today.getFullYear();

    // Check if this day is selected
    const isSelected = item.date.getDate() === selectedDate.getDate() &&
                       item.date.getMonth() === selectedDate.getMonth() &&
                       item.date.getFullYear() === selectedDate.getFullYear();

    return (
      <TouchableOpacity
        style={[
          styles.day,
          isToday && styles.today,
          isSelected && styles.selectedDay,
          item.hasEvents && !isSelected && styles.eventDay
        ]}
        onPress={() => handleDayPress(item)}
      >
        <Text
          style={[
            styles.dayText,
            isToday && styles.todayText,
            isSelected && styles.selectedDayText,
            item.hasEvents && !isSelected && styles.eventDayText
          ]}
        >
          {item.day}
        </Text>
        {item.hasEvents && (
          <View style={[
            styles.eventIndicator,
            isSelected && styles.selectedEventIndicator
          ]} />
        )}
      </TouchableOpacity>
    );
  };

  const calendarData = generateCalendarData();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'<'}</Text>
        </TouchableOpacity>
        
        <Text style={styles.monthYear}>{formatMonthYear(selectedDate)}</Text>
        
        <TouchableOpacity onPress={onNextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.weekdaysContainer}>
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, index) => (
          <Text key={index} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
      
      <FlatList
        data={calendarData}
        renderItem={renderDay}
        keyExtractor={item => item.id}
        numColumns={7}
        scrollEnabled={false}
        contentContainerStyle={styles.calendarGrid}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15, // Increased padding for more space inside
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  navButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8E2F2D',
  },
  monthYear: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekday: {
    width: DAY_CELL_SIZE - 2, // Match the day cell width
    textAlign: 'center',
    fontSize: 11, // Slightly smaller font for smaller screens
    fontWeight: 'bold',
    color: '#666',
  },
  calendarGrid: {
    alignItems: 'center',
    justifyContent: 'space-between', // Ensure proper spacing
  },
  day: {
    width: DAY_CELL_SIZE - 4, // Slightly smaller to ensure spacing between cells
    height: DAY_CELL_SIZE - 4,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2, // Increased margin for better spacing
    borderRadius: (DAY_CELL_SIZE - 4) / 2, // Keep it a circle while accounting for new size
  },
  emptyDay: {
    width: DAY_CELL_SIZE - 4, // Match the day cell size
    height: DAY_CELL_SIZE - 4,
    margin: 2, // Same margin as day cells for alignment
  },
  today: {
    backgroundColor: '#f0f0f0',
  },
  selectedDay: {
    backgroundColor: '#8E2F2D',
    borderWidth: 0, // Remove any border that might block the background color
  },
  eventDay: {
    borderWidth: 1,
    borderColor: '#8E2F2D',
  },
  dayText: {
    fontSize: 14,
  },
  todayText: {
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  eventDayText: {
    color: '#8E2F2D',
    fontWeight: 'bold',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E2F2D',
  },
  selectedEventIndicator: {
    backgroundColor: 'white', // White dot for selected dates with events
  }
});

export default CalendarView;