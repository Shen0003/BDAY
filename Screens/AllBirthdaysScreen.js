import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../Services/FirebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import BirthdayItem from '../Components/BirthdayItem';

const AllBirthdaysScreen = ({ navigation, route }) => {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = FIREBASE_AUTH.currentUser;

  useEffect(() => {
    loadBirthdays();
  }, []);

  // Load all birthdays from Firestore
  const loadBirthdays = async () => {
    try {
      setLoading(true);
      
      const birthdaysRef = collection(FIRESTORE_DB, 'birthdays');
      
      // Keep the original query with orderBy since the index exists in Firebase
      const q = query(
        birthdaysRef,
        where('userId', '==', currentUser.uid),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const birthdaysList = [];
      
      querySnapshot.forEach((doc) => {
        birthdaysList.push({ id: doc.id, ...doc.data() });
      });
      
      setBirthdays(birthdaysList);
    } catch (error) {
      console.error('Error loading birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate days remaining until birthday
  const getDaysRemaining = (date) => {
    const today = new Date();
    const birthdayDate = date.toDate();
    
    // Get this year's birthday date
    const thisYearBirthday = new Date(birthdayDate);
    thisYearBirthday.setFullYear(today.getFullYear());
    
    // If this year's birthday has already passed, use next year's date
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    // Calculate days remaining
    const diffTime = thisYearBirthday - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Format date to display
  const formatDate = (date) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toDate().toLocaleDateString('en-US', options);
  };

  // View birthday details
  const viewBirthdayDetails = (birthday) => {
    navigation.navigate('BirthdayDetail', { birthday });
  };

  // Navigate to add birthday
  const navigateToAddBirthday = () => {
    navigation.navigate('CalendarMain');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BDAY</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.screenTitle}>All BDay</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8E2F2D" />
            <Text>Loading birthdays...</Text>
          </View>
        ) : birthdays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No birthdays found</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={navigateToAddBirthday}
            >
              <Text style={styles.addButtonText}>Add Birthday</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={birthdays}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BirthdayItem 
                id={item.id} // Added ID prop for notification functionality
                name={item.name}
                date={formatDate(item.date)}
                daysRemaining={getDaysRemaining(item.date)}
                onPress={() => viewBirthdayDetails(item)}
              />
            )}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#8E2F2D',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#8E2F2D',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
});

export default AllBirthdaysScreen;