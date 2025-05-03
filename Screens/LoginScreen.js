import { StyleSheet, View, Text, KeyboardAvoidingView, Image } from "react-native";
import React, { useState } from "react";
import { TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { FIREBASE_AUTH, FIRESTORE_DB } from "../Services/FirebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const auth = FIREBASE_AUTH;

  const resetErrors = () => {
    setEmailError(false);
    setPasswordError(false);
  };

  const signIn = async () => {
    resetErrors();
    setIsLoading(true);
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      console.log(response);
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/user-not-found') {
        setEmailError(true);
        Alert.alert('Error', 'No user found with this email.');
      } else if (error.code === 'auth/invalid-credential') {
        setEmailError(true);
        setPasswordError(true);
        Alert.alert('Error', 'Incorrect email or password.');
      } else if (error.code === 'auth/invalid-email') { 
        setEmailError(true);
        Alert.alert('Error', 'Please enter a valid email address.');
      } else if (error.code === 'auth/missing-password') {
        setPasswordError(true);
        Alert.alert('Error', 'Please enter a password.');
      }
      else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  const signUp = async () => {
    resetErrors();
    setIsLoading(true);
    try {
      // Create the authentication account
      const response = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User created:", response.user.uid);
      
      // Create a user document in Firestore with the display name
      const userDisplayName = displayName || email.split('@')[0]; // Use display name if provided, otherwise use email username
      
      // Create user profile in Firestore
      const userDocRef = doc(FIRESTORE_DB, "users", response.user.uid);
      await setDoc(userDocRef, {
        email: email,
        displayName: userDisplayName,
        createdAt: new Date(),
        bio: ''
      });
      
      console.log("User profile created in Firestore");
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setEmailError(true);
        Alert.alert('Error', 'This email is already registered.');
      } else if (error.code === 'auth/invalid-email') {
        setEmailError(true);
        Alert.alert('Error', 'Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError(true);
        Alert.alert('Error', 'Password should be at least 6 characters long.');
      } else if (error.code === 'auth/missing-password') {
        setPasswordError(true);
        Alert.alert('Error', 'Please enter a password.');
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <View style={styles.container}>        
      <Image source={require('../assets/app_ic.png')} />
      <Text style={styles.title}>Welcome to BDAY</Text>
      <View style={styles.inputContainer}>
        <KeyboardAvoidingView behavior="position">
          <TextInput
            style={[
              styles.input, 
              emailError && styles.inputError
            ]}
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError(false);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Display Name (optional)"
              value={displayName}
              onChangeText={setDisplayName}
            />
          )}
          <TextInput
            style={[
              styles.input,
              passwordError && styles.inputError
            ]}
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError(false);
            }}
            secureTextEntry
          />
          <TouchableOpacity
            style={styles.button}
            onPress={isSignUp ? signUp : signIn}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            setIsSignUp(!isSignUp);
            resetErrors();
          }}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#8E2F2D',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    height: 60,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    fontSize: 20,
  },
  inputError: {
    borderColor: '#FF0000',
    borderWidth: 2,
  },
  button: {
    backgroundColor: 'black',
    paddingVertical: 12,
    alignItems: 'center',
    borderColor: '#3b3b3b',
    borderWidth: 1,
  },
  buttonText: {
    color: '#A9A9A9',
    fontSize: 20,
    fontWeight: 'bold',
  },
  toggleText: {
    marginTop: 12,
    color: 'black',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default LoginScreen;