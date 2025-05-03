// Modify the BirthdayDetailScreen.js file to fetch the latest data on component load

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../Services/FirebaseConfig';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

const BirthdayDetailScreen = ({ navigation, route }) => {
  const initialBirthday = route.params.birthday;
  
  const [birthday, setBirthday] = useState(initialBirthday);
  const [name, setName] = useState(initialBirthday.name);
  const [giftIdea, setGiftIdea] = useState(initialBirthday.giftIdea || '');
  const [birthdayMessage, setBirthdayMessage] = useState(initialBirthday.birthdayMessage || '');
  const [partyIdea, setPartyIdea] = useState(initialBirthday.partyIdea || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Fetch latest data when screen is loaded
  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        setLoading(true);
        // Get reference to the birthday document
        const birthdayRef = doc(FIRESTORE_DB, 'birthdays', initialBirthday.id);
        // Fetch the latest data
        const docSnapshot = await getDoc(birthdayRef);
        
        if (docSnapshot.exists()) {
          const latestData = { id: docSnapshot.id, ...docSnapshot.data() };
          console.log("Fetched latest birthday data:", latestData);
          
          // Update all state with the latest data
          setBirthday(latestData);
          setName(latestData.name);
          setGiftIdea(latestData.giftIdea || '');
          setBirthdayMessage(latestData.birthdayMessage || '');
          setPartyIdea(latestData.partyIdea || '');
        } else {
          console.log("No birthday document found with ID:", initialBirthday.id);
          Alert.alert("Error", "This birthday no longer exists.");
          navigation.goBack();
        }
      } catch (error) {
        console.error("Error fetching latest birthday data:", error);
        Alert.alert("Error", "Could not load the latest birthday details.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchLatestData();
  }, [initialBirthday.id]);
  
  // Format date to display
  const formatDate = (date) => {
    try {
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return date.toDate().toLocaleDateString('en-US', options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date unavailable";
    }
  };
  
  // Save changes to Firestore
  const saveChanges = async () => {
    try {
      const birthdayRef = doc(FIRESTORE_DB, 'birthdays', birthday.id);
      
      await updateDoc(birthdayRef, {
        name,
        giftIdea,
        birthdayMessage,
        partyIdea,
      });
      
      // Update local state with the changes
      setBirthday({
        ...birthday,
        name,
        giftIdea,
        birthdayMessage,
        partyIdea
      });
      
      Alert.alert('Success', 'Birthday details updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating birthday:', error);
      Alert.alert('Error', 'Failed to update birthday details.');
    }
  };
  
  // Delete birthday
  const deleteBirthday = async () => {
    Alert.alert(
      'Delete Birthday',
      `Are you sure you want to delete ${name}'s birthday?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(FIRESTORE_DB, 'birthdays', birthday.id));
              Alert.alert('Success', 'Birthday deleted successfully!');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting birthday:', error);
              Alert.alert('Error', 'Failed to delete birthday.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#8E2F2D" />
        <Text style={{textAlign: 'center'}}>Loading birthday details...</Text>
      </View>
    );
  }

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
      
      <ScrollView style={styles.content}>
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Name:</Text>
          <TextInput
            style={[styles.detailInput, !isEditing && styles.readOnlyInput]}
            value={name}
            onChangeText={setName}
            editable={isEditing}
          />
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.dateText}>{formatDate(birthday.date)}</Text>
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Gift Idea:</Text>
          <TextInput
            style={[styles.detailTextArea, !isEditing && styles.readOnlyInput]}
            value={giftIdea}
            onChangeText={setGiftIdea}
            placeholder="Add gift ideas here..."
            multiline={true}
            editable={isEditing}
          />
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Birthday Message Idea:</Text>
          <TextInput
            style={[styles.detailTextArea, !isEditing && styles.readOnlyInput]}
            value={birthdayMessage}
            onChangeText={setBirthdayMessage}
            placeholder="Add birthday message ideas here..."
            multiline={true}
            editable={isEditing}
          />
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Party Idea:</Text>
          <TextInput
            style={[styles.detailTextArea, !isEditing && styles.readOnlyInput]}
            value={partyIdea}
            onChangeText={setPartyIdea}
            placeholder="Add party ideas here..."
            multiline={true}
            editable={isEditing}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          {isEditing ? (
            <>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  // Reset form and cancel editing
                  setName(birthday.name);
                  setGiftIdea(birthday.giftIdea || '');
                  setBirthdayMessage(birthday.birthdayMessage || '');
                  setPartyIdea(birthday.partyIdea || '');
                  setIsEditing(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveChanges}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={deleteBirthday}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  detailInput: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  detailTextArea: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  readOnlyInput: {
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 40,
  },
  editButton: {
    backgroundColor: '#8E2F2D',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BirthdayDetailScreen;