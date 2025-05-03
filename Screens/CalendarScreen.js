import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../Services/FirebaseConfig';
import { 
  collection, 
  getDoc,
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import CalendarView from '../Components/CalendarView';
import BirthdayItem from '../Components/BirthdayItem';
import AddBirthdayModal from '../Components/AddBirthdayModal';
import { useNavigation } from '@react-navigation/native';

const CalendarScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthEvents, setMonthEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewAllMode, setViewAllMode] = useState(false);
  const [birthdayDetailModal, setBirthdayDetailModal] = useState(false);
  const [selectedBirthday, setSelectedBirthday] = useState(null);
  const [editedBirthday, setEditedBirthday] = useState(null);
  
  const currentUser = FIREBASE_AUTH.currentUser;
  const navigation = useNavigation();

  // Load events from Firestore
  const loadEvents = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        console.log("No user logged in");
        setLoading(false);
        return;
      }
      
      // Get all birthdays for the current user
      const eventsRef = collection(FIRESTORE_DB, 'birthdays');
      let eventsQuery = query(
        eventsRef, 
        where('userId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      const allEvents = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp to JS Date
        const jsDate = data.date.toDate();
        
        // Add to the events array
        allEvents.push({ 
          id: doc.id, 
          ...data,
          jsDate: jsDate // Store the JavaScript Date for easier processing
        });
      });
      
      console.log(`Total birthdays found: ${allEvents.length}`);
      
      // Filter for current month events
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const monthEvents = allEvents.filter(event => {
        return event.jsDate.getMonth() === month && event.jsDate.getFullYear() === year;
      });
      
      setMonthEvents(monthEvents);
      console.log(`Found ${monthEvents.length} birthdays for the current month`);
      
      // Get upcoming events - MODIFIED to use 12-month window 
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time portion for accurate comparisons
      
      // Create a date 12 months in the future
      const twelveMonthsLater = new Date(today);
      twelveMonthsLater.setFullYear(today.getFullYear() + 1);
      twelveMonthsLater.setHours(23, 59, 59, 999); // End of day
      
      // Adjust upcoming birthdays calculation to handle birthdays this year
      const upcomingEvents = [];
      
      // Process each birthday
      allEvents.forEach(event => {
        // Get this year's date for the birthday
        const thisYearBirthday = new Date(event.jsDate);
        thisYearBirthday.setFullYear(today.getFullYear());
        
        // If this year's birthday has passed, use next year's date
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        // Check if it's within our 12-month window
        if (thisYearBirthday <= twelveMonthsLater) {
          // Calculate days remaining
          const diffTime = thisYearBirthday - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          upcomingEvents.push({
            ...event,
            nextBirthday: thisYearBirthday,
            daysRemaining: diffDays
          });
        }
      });
      
      // Sort by days remaining (closest first)
      upcomingEvents.sort((a, b) => a.daysRemaining - b.daysRemaining);
      console.log(`Found ${upcomingEvents.length} upcoming birthdays`);
      
      // Debug the first upcoming birthday if any
      if (upcomingEvents.length > 0) {
        const first = upcomingEvents[0];
        console.log(`First upcoming: ${first.name}, Days: ${first.daysRemaining}, Date: ${first.nextBirthday.toDateString()}`);
      }
      
      setUpcomingEvents(upcomingEvents);
      
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load birthdays. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle month navigation
  const changeMonth = (increment) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setSelectedDate(newDate);
  };

  // Handle day selection - MODIFIED to not automatically open the modal
  const handleDaySelect = (date) => {
    setSelectedDate(date);
    // Only updates the selected date without opening the modal
  };

  // Open the add birthday modal
  const openAddModal = () => {
    setModalVisible(true);
  };
  
  // Navigate to All Birthdays screen
  const navigateToAllBirthdays = () => {
    navigation.navigate('AllBirthdays');
  };

  // Add new birthday
  const addBirthday = async (name, date) => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the birthday.');
      return;
    }

    try {
      // Use the provided date
      const birthdayDate = date || selectedDate;
      
      await addDoc(collection(FIRESTORE_DB, 'birthdays'), {
        name: name,
        date: Timestamp.fromDate(birthdayDate),
        userId: currentUser.uid,
        createdAt: Timestamp.now(),
        giftIdea: '',
        birthdayMessage: '',
        partyIdea: ''
      });
      
      // Reset form and reload events
      setModalVisible(false);
      loadEvents();
      
      Alert.alert('Success', 'Birthday added successfully!');
    } catch (error) {
      console.error('Error adding birthday:', error);
      Alert.alert('Error', 'Failed to add birthday. Please try again.');
    }
  };

  // Delete birthday
  const deleteBirthday = async (birthdayId) => {
    try {
      await deleteDoc(doc(FIRESTORE_DB, 'birthdays', birthdayId));
      loadEvents();
      Alert.alert('Success', 'Birthday deleted successfully!');
      setBirthdayDetailModal(false);
    } catch (error) {
      console.error('Error deleting birthday:', error);
      Alert.alert('Error', 'Failed to delete birthday. Please try again.');
    }
  };
  
  // Update birthday
  const updateBirthday = async () => {
    if (!editedBirthday) return;
    
    try {
      const birthdayRef = doc(FIRESTORE_DB, 'birthdays', editedBirthday.id);
      
      // Only update the editable fields
      await updateDoc(birthdayRef, {
        giftIdea: editedBirthday.giftIdea || '',
        birthdayMessage: editedBirthday.birthdayMessage || '',
        partyIdea: editedBirthday.partyIdea || ''
      });
      
      // After successful update, also update the selectedBirthday state
      // so we don't need to fetch again when showing the modal
      setSelectedBirthday({
        ...selectedBirthday,
        giftIdea: editedBirthday.giftIdea || '',
        birthdayMessage: editedBirthday.birthdayMessage || '',
        partyIdea: editedBirthday.partyIdea || ''
      });
      
      // Close the modal and show success message
      Alert.alert('Success', 'Birthday updated successfully!');
      setBirthdayDetailModal(false);
      
      // Refresh the events list to show latest data
      loadEvents();
    } catch (error) {
      console.error('Error updating birthday:', error);
      Alert.alert('Error', 'Failed to update birthday. Please try again.');
    }
  };
  
// In CalendarScreen.js, replace the viewBirthdayDetails function with:
// In CalendarScreen.js, modify the viewBirthdayDetails function:

const viewBirthdayDetails = async (birthday) => {
  try {
    console.log("Fetching latest details for birthday:", birthday.name);
    
    // Ensure we have a properly formatted date object first
    let formattedBirthday = {...birthday};
    
    // If the birthday is from upcomingEvents, handle jsDate property
    if (birthday.date && typeof birthday.date.toDate === 'function') {
      formattedBirthday.date = birthday.date;
    } else if (birthday.jsDate) {
      formattedBirthday.date = Timestamp.fromDate(birthday.jsDate);
    }
    
    // Fetch the latest data from Firestore
    const birthdayRef = doc(FIRESTORE_DB, 'birthdays', birthday.id);
    const docSnapshot = await getDoc(birthdayRef);
    
    if (docSnapshot.exists()) {
      // Use the latest data from Firestore
      const latestData = { 
        id: docSnapshot.id, 
        ...docSnapshot.data() 
      };
      
      console.log("Fetched latest birthday data:", latestData.name);
      
      // Set the states with the latest data
      setSelectedBirthday(latestData);
      setEditedBirthday({...latestData});
      
      // Show the modal
      setBirthdayDetailModal(true);
    } else {
      // Handle case where the birthday doesn't exist anymore
      console.log("No birthday document found with ID:", birthday.id);
      Alert.alert(
        "Birthday Not Found", 
        "This birthday may have been deleted. Refreshing the data.",
        [{ text: "OK", onPress: () => loadEvents() }]
      );
    }
  } catch (error) {
    console.error("Error fetching latest birthday data:", error);
    Alert.alert("Error", "Could not load the latest birthday details.");
  }
};



// This will leverage your existing navigation stack and use the dedicated BirthdayDetailScreen
// which is already designed to handle and display birthday details

  // Calculate days remaining
  const getDaysRemaining = (dateObj) => {
    // Handle both Timestamp and Date objects
    const date = dateObj instanceof Date ? dateObj : dateObj.toDate();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate day calculation
    
    const birthdayDate = new Date(date);
    birthdayDate.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(birthdayDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Handle input changes for birthday details
  const handleDetailChange = (field, value) => {
    setEditedBirthday(prev => ({ ...prev, [field]: value }));
  };

  // Reload events when month changes
  useEffect(() => {
    loadEvents();
  }, [selectedDate]);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, []);

  // Format date to display
  const formatDate = (dateObj) => {
    // Handle both Timestamp and Date objects
    const date = dateObj instanceof Date ? dateObj : dateObj.toDate();
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BDAY Calendar</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8E2F2D" />
          <Text style={{textAlign: 'center'}}>Loading calendar...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Calendar section */}
          <View style={styles.calendarHeader}>
            <Text style={styles.sectionTitle}>Calendar</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={openAddModal}
            >
              <Text style={styles.addButtonText}>Add BDay</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.calendarContainer}>
            <CalendarView 
              selectedDate={selectedDate}
              onDateChange={handleDaySelect}
              events={monthEvents}
              onPrevMonth={() => changeMonth(-1)}
              onNextMonth={() => changeMonth(1)}
            />
          </View>
          
          {/* Upcoming section */}
          <View style={styles.upcomingHeader}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <TouchableOpacity onPress={navigateToAllBirthdays}>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingEvents.length === 0 ? (
            <Text style={styles.noEventsText}>No upcoming birthdays</Text>
          ) : (
            // Always show just the first two events in the Calendar screen
            upcomingEvents.slice(0, 2).map((item) => (
              <BirthdayItem
                key={item.id}
                id={item.id}
                name={item.name}
                date={formatDate(item.date)}
                daysRemaining={item.daysRemaining}
                onPress={() => viewBirthdayDetails(item)}
              />
            ))
          )}
        </ScrollView>
      )}
      
      {/* Add Birthday Modal */}
      <AddBirthdayModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={addBirthday}
        initialDate={selectedDate}
      />
      
      {/* Birthday Details Modal */}
      {selectedBirthday && (
      <Modal
        visible={birthdayDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBirthdayDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.birthdayDetailModal}>
            <View style={styles.birthdayDetailHeader}>
              <TouchableOpacity onPress={() => setBirthdayDetailModal(false)}>
                <Text style={styles.backButton}>←</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>BDAY</Text>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    'Delete Birthday',
                    `Are you sure you want to delete ${selectedBirthday.name}'s birthday?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', onPress: () => deleteBirthday(selectedBirthday.id), style: 'destructive' }
                    ]
                  );
                }}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
            
            {/* ScrollView for scrollable content */}
            <ScrollView style={styles.birthdayDetailContent}>
              <Text style={styles.detailLabel}>Name:</Text>
              <TextInput
                style={styles.detailInput}
                value={selectedBirthday.name}
                editable={false}
              />
              
              <Text style={styles.detailLabel}>Date:</Text>
              <TextInput
                style={styles.detailInput}
                value={formatDate(selectedBirthday.date)}
                editable={false}
              />
              
              <Text style={styles.detailLabel}>Gift Idea:</Text>
              <TextInput
                style={styles.detailTextArea}
                value={editedBirthday?.giftIdea || ""}
                placeholder="Enter gift ideas here..."
                multiline={true}
                onChangeText={(text) => handleDetailChange('giftIdea', text)}
              />
              
              <Text style={styles.detailLabel}>Birthday Message Idea:</Text>
              <TextInput
                style={styles.detailTextArea}
                value={editedBirthday?.birthdayMessage || ""}
                placeholder="Enter birthday message ideas here..."
                multiline={true}
                onChangeText={(text) => handleDetailChange('birthdayMessage', text)}
              />
              
              <Text style={styles.detailLabel}>Party Idea:</Text>
              <TextInput
                style={styles.detailTextArea}
                value={editedBirthday?.partyIdea || ""}
                placeholder="Enter party ideas here..."
                multiline={true}
                onChangeText={(text) => handleDetailChange('partyIdea', text)}
              />
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setBirthdayDetailModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={updateBirthday}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
              
              {/* Add extra padding at the bottom to ensure everything is scrollable and visible */}
              <View style={styles.bottomPadding} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#8E2F2D',
    padding: 15,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#8E2F2D',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  calendarContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAllButton: {
    color: '#8E2F2D',
    fontWeight: 'bold',
  },
  noEventsText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    fontSize: 24,
    color: 'white',
    width: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  deleteButton: {
    paddingHorizontal: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    width: '45%',
  },
  cancelButtonText: {
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#8E2F2D',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    width: '45%',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  birthdayDetailModal: {
    backgroundColor: 'white',
    flex: 1,
  },
  birthdayDetailHeader: {
    backgroundColor: '#8E2F2D',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
  },
  birthdayDetailContent: {
    padding: 20,
    flex: 1, // Make sure it takes available space
  },
  detailTextArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    minHeight: 100, // Use minHeight for variable content size
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  bottomPadding: {
    height: 40, // Extra padding at the bottom for better scrolling
  },
});

export default CalendarScreen;