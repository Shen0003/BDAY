import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, SafeAreaView, Platform, Alert, Keyboard } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ionicons } from '@expo/vector-icons';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../Services/FirebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { GEMINI_KEY } from '@env';

const API_KEY = GEMINI_KEY;

export default function IdeaScreen({ navigation }) {
  // State for the selected tab
  const [activeTab, setActiveTab] = useState('Gift Idea');
  
  // Form states based on the selected tab
  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedPersonName, setSelectedPersonName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [budget, setBudget] = useState('');
  const [interest, setInterest] = useState('');
  const [mood, setMood] = useState('');
  const [theme, setTheme] = useState('');
  
  // State for upcoming birthdays
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);
  
  // Generated idea state
  const [generatedIdea, setGeneratedIdea] = useState('');
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentUser = FIREBASE_AUTH.currentUser;

  // Reset all form fields
  const resetForm = () => {
    setSelectedPerson('');
    setSelectedPersonName('');
    setGender('');
    setAge('');
    setBudget('');
    setInterest('');
    setMood('');
    setTheme('');
    setGeneratedIdea('');
    setError('');
    setSaveSuccess(false);
    
    // Show feedback to user
    Alert.alert('Reset', 'All fields have been reset.');
    
    // Dismiss keyboard if it's open
    Keyboard.dismiss();
  };

  // Fetch upcoming birthdays function
  const fetchUpcomingBirthdays = async () => {
    setLoadingBirthdays(true);
    try {
      if (!currentUser) {
        console.log("No user logged in");
        setLoadingBirthdays(false);
        return;
      }
      
      const birthdaysRef = collection(FIRESTORE_DB, 'birthdays');
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
      
      console.log(`Fetched ${birthdaysList.length} birthdays for user ${currentUser.uid}`);
      setUpcomingBirthdays(birthdaysList);
    } catch (error) {
      console.error('Error loading birthdays:', error);
      setError('Failed to load birthdays. Please try again.');
    } finally {
      setLoadingBirthdays(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchUpcomingBirthdays();
  }, []);

  // Refetch birthdays whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("IdeaScreen is now focused, refreshing birthdays list");
      fetchUpcomingBirthdays();
      
      return () => {
        // Clean up if needed when screen loses focus
      };
    }, [])
  );

  // Handle selecting a person
  const handlePersonSelect = (personId) => {
    setSelectedPerson(personId);
    
    if (personId) {
      const person = upcomingBirthdays.find(b => b.id === personId);
      if (person) {
        setSelectedPersonName(person.name);
        // Calculate age if birthdate has year information
        try {
          const birthDate = person.date.toDate();
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          setAge(age.toString());
        } catch (e) {
          setAge('');
        }
      }
    } else {
      setSelectedPersonName('');
      setAge('');
    }
  };

  // Function to generate idea using Gemini API
  const generateIdea = async () => {
    if (!API_KEY) {
      setError('Please add your Gemini API key to use this feature');
      return;
    }
    
    if (!selectedPerson) {
      setError('Please select a person from your birthday list first');
      return;
    }
    
    setLoading(true);
    setError('');
    setSaveSuccess(false);
    
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      let prompt = '';
      
      if (activeTab === 'Gift Idea') {
        prompt = `Response with ONLY ONE personalized gift idea for ${selectedPersonName} with the following details:
          - Gender: ${gender || 'Not specified'}
          - Age: ${age || 'Not specified'} 
          - Budget: ${budget || 'Not specified'}
          - Interest: ${interest || 'Not specified'}
          Be specific and creative with your gift suggestion.`;
      } else if (activeTab === 'Message Idea') {
        prompt = `Response with ONLY ONE heartfelt birthday message for ${selectedPersonName} with the following details:
          - Gender: ${gender || 'Not specified'}
          - Age: ${age || 'Not specified'} 
          - Mood: ${mood || 'Not specified'}
          - Theme: ${theme || 'Not specified'}
          Write a personalized, warm message that feels authentic.`;
      } else if (activeTab === 'Party Idea') {
        prompt = `Response with ONLY ONE creative birthday party idea for ${selectedPersonName} with the following details:
          - Gender: ${gender || 'Not specified'}
          - Age: ${age || 'Not specified'} 
          - Budget: ${budget || 'Not specified'}
          - Theme: ${theme || 'Not specified'}
          Include theme, activities, and decoration ideas.`;
      }
      
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      setGeneratedIdea(response);
    } catch (error) {
      console.error('Error generating idea:', error);
      setError('Failed to generate idea. Please check your API key and try again.');
      setGeneratedIdea('');
    } finally {
      setLoading(false);
    }
  };

  // Save generated idea to the selected birthday
  const saveIdeaToBirthday = async () => {
    if (!selectedPerson || !generatedIdea) {
      setError('Please select a person and generate an idea first');
      return;
    }
    
    try {
      setLoading(true);
      const birthdayRef = doc(FIRESTORE_DB, 'birthdays', selectedPerson);
      
      let updateData = {};
      if (activeTab === 'Gift Idea') {
        updateData = { giftIdea: generatedIdea };
      } else if (activeTab === 'Message Idea') {
        updateData = { birthdayMessage: generatedIdea };
      } else if (activeTab === 'Party Idea') {
        updateData = { partyIdea: generatedIdea };
      }
      
      await updateDoc(birthdayRef, updateData);
      setSaveSuccess(true);
      Alert.alert('Success', `${activeTab} saved successfully for ${selectedPersonName}!`);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving idea:', error);
      setError('Failed to save idea. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form fields when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setGeneratedIdea('');
    setError('');
    setSaveSuccess(false);
    // Keep the selected person when changing tabs
  };

  // Render the WHO section (Person Picker)
  const renderWhoSection = () => {
    return (
      <View style={styles.whoSection}>
        <Text style={styles.sectionTitle}>Who</Text>
        
        {loadingBirthdays ? (
          <ActivityIndicator size="small" color="#8E2F2D" style={styles.smallLoader} />
        ) : upcomingBirthdays.length === 0 ? (
          <View style={styles.noBirthdaysContainer}>
            <Text style={styles.noBirthdaysText}>No birthdays found</Text>
            <TouchableOpacity 
              style={styles.addBirthdayButton}
              onPress={() => navigation.navigate('Home', { screen: 'CalendarMain' })}
            >
              <Text style={styles.addBirthdayButtonText}>Add Birthday in Calendar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Select Person</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedPerson}
                onValueChange={handlePersonSelect}
                style={styles.picker}
              >
                <Picker.Item label="Select a person" value="" />
                {upcomingBirthdays.map((birthday) => (
                  <Picker.Item 
                    key={birthday.id} 
                    label={birthday.name} 
                    value={birthday.id} 
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render form based on active tab
  const renderForm = () => {
    return (
      <View style={styles.formContainer}>
        {/* WHO section is now separated and will appear in all tabs */}
        {renderWhoSection()}
        
        <Text style={styles.sectionTitle}>Details</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Gender</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={gender}
              onValueChange={(value) => setGender(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select gender" value="" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Non-binary" value="Non-binary" />
            </Picker>
          </View>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Age</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter age"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />
        </View>
        
        {activeTab === 'Gift Idea' && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Budget</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter budget"
                value={budget}
                onChangeText={setBudget}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Interest</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter interests"
                value={interest}
                onChangeText={setInterest}
              />
            </View>
          </>
        )}
        
        {activeTab === 'Message Idea' && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mood</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter mood (funny, sentimental, etc.)"
                value={mood}
                onChangeText={setMood}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Theme</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter theme"
                value={theme}
                onChangeText={setTheme}
              />
            </View>
          </>
        )}
        
        {activeTab === 'Party Idea' && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Budget</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter budget"
                value={budget}
                onChangeText={setBudget}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Theme</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter theme"
                value={theme}
                onChangeText={setTheme}
              />
            </View>
          </>
        )}

        <TouchableOpacity 
          style={[styles.generateButton, (!selectedPerson && upcomingBirthdays.length > 0) && styles.disabledButton]}
          onPress={generateIdea}
          disabled={!selectedPerson && upcomingBirthdays.length > 0}
        >
          <Text style={styles.generateButtonText}>Generate</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render idea output area
  const renderIdeaOutput = () => {
    const outputTitle = 
      activeTab === 'Gift Idea' ? 'Gift Idea' : 
      activeTab === 'Message Idea' ? 'Birthday Message Idea' : 
      'Party Idea';
    
    return (
      <View style={[styles.ideaContainer, !generatedIdea && styles.emptyIdeaContainer]}>
        <Text style={styles.ideaTitle}>
          {selectedPersonName ? `${outputTitle} for ${selectedPersonName}` : outputTitle}
        </Text>
        {loading ? (
          <ActivityIndicator size="large" color="#8E2F2D" style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : generatedIdea ? (
          <>
            <Text style={styles.ideaText}>{generatedIdea}</Text>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={saveIdeaToBirthday}
              disabled={!selectedPerson || loading}
            >
              <Text style={styles.saveButtonText}>Save to Birthday</Text>
            </TouchableOpacity>
            {saveSuccess && (
              <Text style={styles.successText}>Saved successfully!</Text>
            )}
          </>
        ) : (
          <Text style={styles.placeholderText}>
            {selectedPerson ? 'Generate an idea to see it here' : 'Select a person first, then generate an idea'}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>BDAY Idea</Text>
          <TouchableOpacity onPress={resetForm} style={styles.resetButton}>
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Gift Idea' && styles.activeTab]}
            onPress={() => handleTabChange('Gift Idea')}
          >
            <Text style={[styles.tabText, activeTab === 'Gift Idea' && styles.activeTabText]}>Gift Idea</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Message Idea' && styles.activeTab]}
            onPress={() => handleTabChange('Message Idea')}
          >
            <Text style={[styles.tabText, activeTab === 'Message Idea' && styles.activeTabText]}>Message Idea</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Party Idea' && styles.activeTab]}
            onPress={() => handleTabChange('Party Idea')}
          >
            <Text style={[styles.tabText, activeTab === 'Party Idea' && styles.activeTabText]}>Party Idea</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderForm()}
          {renderIdeaOutput()}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#8E2F2D',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    position: 'relative',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  resetButton: {
    position: 'absolute',
    right: 16,
    top: 50,
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8E2F2D',
  },
  tabText: {
    fontSize: 14,
    color: '#333333',
  },
  activeTabText: {
    color: '#8E2F2D',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  formContainer: {
    padding: 16,
  },
  whoSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noBirthdaysContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  noBirthdaysText: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 10,
  },
  addBirthdayButton: {
    backgroundColor: '#8E2F2D',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  addBirthdayButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: '#555555',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  ideaContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFEEEE',
    borderRadius: 8,
    minHeight: 150,
  },
  emptyIdeaContainer: {
    backgroundColor: '#f9f9f9',
  },
  ideaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ideaText: {
    fontSize: 14,
    lineHeight: 20,
  },
  placeholderText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  successText: {
    fontSize: 14,
    color: 'green',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
  smallLoader: {
    marginVertical: 10,
  },
  generateButton: {
    backgroundColor: '#8E2F2D',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 80, // Add enough padding to prevent content from being hidden behind tab bar
  },
});