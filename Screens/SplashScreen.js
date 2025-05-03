import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/app_ic.png')} 
        style={styles.logo}
      />
      <Text style={styles.title}>BDAY</Text>
      <Text style={styles.subtitle}>Never miss a birthday again</Text>
      <ActivityIndicator 
        size="large" 
        color="#fff" 
        style={styles.loader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8E2F2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    opacity: 0.8,
    marginBottom: 40,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  }
});

export default SplashScreen;