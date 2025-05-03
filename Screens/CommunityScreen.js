import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getFirestore,
  getDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Initialize Firestore directly in the component
const db = getFirestore();
const auth = getAuth();

const CommunityScreen = ({ navigation }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState([]);
  const flatListRef = useRef(null);
  
  // Get current user directly from auth
  const currentUser = auth.currentUser;

  useEffect(() => {
    // Fetch posts
    const unsubscribePosts = setupPostsListener();
    
    // Fetch saved posts IDs for the current user
    const unsubscribeSaved = setupSavedPostsListener();
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribePosts();
      unsubscribeSaved();
    };
  }, []);

  const setupPostsListener = () => {
    try {
      console.log("Initializing posts collection listener");
      
      if (!db) {
        console.error("Firestore database not initialized");
        setLoading(false);
        return () => {};
      }
      
      const postsCollection = collection(db, 'posts');
      const q = query(postsCollection, orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log("Got snapshot with", querySnapshot.size, "posts");
        const postList = [];
        querySnapshot.forEach((doc) => {
          postList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setPosts(postList);
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        console.error("Error in snapshot listener:", error);
        setLoading(false);
        setRefreshing(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up posts listener:", error);
      setLoading(false);
      return () => {}; 
    }
  };
  
  const setupSavedPostsListener = () => {
    if (!currentUser) {
      return () => {};
    }
    
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          setSavedPostIds(userData.savedPosts || []);
        } else {
          setSavedPostIds([]);
        }
      }, (error) => {
        console.error("Error in user document listener:", error);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up saved posts listener:", error);
      return () => {};
    }
  };

  const handleAddPost = async () => {
    if (newPost.trim() === '') {
      Alert.alert('Error', 'Post cannot be empty');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to post');
      return;
    }

    try {
      const postsCollection = collection(db, 'posts');
      await addDoc(postsCollection, {
        content: newPost,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });
      setNewPost('');
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error adding post: ', error);
      Alert.alert('Error', 'Failed to add post. Please try again.');
    }
  };

  const handleLike = async (postId, currentLikes, likedBy) => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to like posts');
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      // Check if user already liked this post
      const userLikedArray = likedBy || [];
      if (userLikedArray.includes(currentUser.uid)) {
        // Unlike
        await updateDoc(postRef, {
          likes: currentLikes - 1,
          likedBy: userLikedArray.filter(id => id !== currentUser.uid)
        });
      } else {
        // Like
        await updateDoc(postRef, {
          likes: currentLikes + 1,
          likedBy: [...userLikedArray, currentUser.uid]
        });
      }
    } catch (error) {
      console.error('Error updating likes: ', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  };

  const handleSavePost = async (postId) => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to save posts');
      return;
    }
    
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      // Check if already saved
      const isSaved = savedPostIds.includes(postId);
      
      if (isSaved) {
        // Remove from saved posts
        await updateDoc(userDocRef, {
          savedPosts: arrayRemove(postId)
        });
        Alert.alert('Success', 'Post removed from saved posts');
      } else {
        // Add to saved posts
        await updateDoc(userDocRef, {
          savedPosts: arrayUnion(postId)
        });
        Alert.alert('Success', 'Post saved successfully');
      }
    } catch (error) {
      console.error('Error saving post: ', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    }
  };

  const handleDeletePost = async (postId, userId) => {
    // Only allow delete if current user is the post creator
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to delete posts');
      return;
    }

    if (currentUser.uid !== userId) {
      Alert.alert('Error', 'You can only delete your own posts');
      return;
    }

    try {
      await deleteDoc(doc(db, 'posts', postId));
      Alert.alert('Success', 'Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post: ', error);
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listener will update the data automatically
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const navigateToUserProfile = (userId) => {
    // For now, we only navigate to our own profile
    if (currentUser && userId === currentUser.uid) {
      navigation.navigate('Profile');
    }
  };

  const renderItem = ({ item }) => {
    const isMyPost = currentUser && item.userId === currentUser.uid;
    const hasLiked = currentUser && item.likedBy && item.likedBy.includes(currentUser.uid);
    const isSaved = savedPostIds.includes(item.id);
    
    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <Ionicons name="person-circle-outline" size={24} color="#8E2F2D" />
            <Text style={styles.userEmail}>{item.userEmail}</Text>
          </View>
          <View style={styles.postActions}>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={() => handleSavePost(item.id)}
            >
              <Ionicons 
                name={isSaved ? "bookmark" : "bookmark-outline"} 
                size={20} 
                color={isSaved ? "#8E2F2D" : "gray"} 
              />
            </TouchableOpacity>
            
            {isMyPost && (
              <TouchableOpacity 
                style={{marginLeft: 15}}
                onPress={() => handleDeletePost(item.id, item.userId)}
              >
                <Ionicons name="trash-outline" size={18} color="gray" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <Text style={styles.postContent}>{item.content}</Text>
        
        <View style={styles.postFooter}>
          <TouchableOpacity 
            style={styles.likeButton}
            onPress={() => handleLike(item.id, item.likes || 0, item.likedBy)}
          >
            <Ionicons 
              name={hasLiked ? "heart" : "heart-outline"} 
              size={18} 
              color={hasLiked ? "#8E2F2D" : "gray"} 
            />
            <Text style={styles.likeCount}>{item.likes || 0}</Text>
          </TouchableOpacity>
          
          <Text style={styles.timestamp}>
            {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleString() : 'Just now'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8E2F2D" />
        <Text style={{textAlign: 'center'}}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BDAY Community</Text>
      </View>
      
      {/* Use a simpler structure with KeyboardAvoidingView wrapping everything */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 60} // Adjust for navigation bar height
      >
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.postsList}
          contentContainerStyle={styles.postsListContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet. Be the first to share something!</Text>
            </View>
          }
          // Add extra space at the bottom of list to ensure content isn't hidden
          ListFooterComponent={<View style={styles.listFooter} />}
          // Dismiss keyboard when scrolling
          onScrollBeginDrag={Keyboard.dismiss}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Share something..."
            value={newPost}
            onChangeText={setNewPost}
            multiline
            maxHeight={100}
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleAddPost}
          >
            <Ionicons name="send" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidView: {
    flex: 1, // Take up all available space
  },
  postsList: {
    flex: 1,
  },
  postsListContent: {
    padding: 10,
  },
  listFooter: {
    height: 80, // Add padding at the bottom of list for visibility
  },
  postContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userEmail: {
    marginLeft: 5,
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    padding: 5,
  },
  postContent: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 22,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    marginLeft: 5,
    color: 'gray',
  },
  timestamp: {
    fontSize: 12,
    color: 'gray',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    // Additional shadow for better visibility
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    marginBottom: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#8E2F2D',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'gray',
    textAlign: 'center',
  },
});

export default CommunityScreen;