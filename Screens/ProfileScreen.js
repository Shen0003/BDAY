import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    ActivityIndicator,
    TextInput,
    FlatList,
    Alert
} from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../Services/FirebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = ({ navigation }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [updatedProfile, setUpdatedProfile] = useState({});
    const [activeTab, setActiveTab] = useState(null); // null = main profile, 'saved' = saved posts, 'my' = user posts
    const [posts, setPosts] = useState([]);
    const user = FIREBASE_AUTH.currentUser;

    useEffect(() => {
        fetchUserProfile();
    }, []);

    useEffect(() => {
        if (activeTab === 'saved') {
            fetchSavedPosts();
        } else if (activeTab === 'my') {
            fetchUserPosts();
        }
    }, [activeTab]);

    const fetchUserProfile = async () => {
        try {
            if (user) {
                const userDocRef = doc(FIRESTORE_DB, "users", user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    console.log("User profile data:", userData.email);
                    setProfile(userData);
                    setUpdatedProfile(userData);
                } else {
                    console.log("No profile found for this user");
                    setDefaultProfile();
                }
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            setDefaultProfile();
        } finally {
            setLoading(false);
        }
    };
    
    const setDefaultProfile = () => {
        const defaultProfile = {
            email: user.email,
            displayName: user.email.split('@')[0],
            createdAt: new Date(),
            bio: '',
            savedPosts: [],
        };
        setProfile(defaultProfile);
        setUpdatedProfile(defaultProfile);
    };

    const fetchSavedPosts = async () => {
        setLoading(true);
        try {
            // First get user's saved post IDs
            const userDocRef = doc(FIRESTORE_DB, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists() && userDoc.data().savedPosts) {
                const savedPostIds = userDoc.data().savedPosts;
                
                if (savedPostIds.length === 0) {
                    setPosts([]);
                    setLoading(false);
                    return;
                }
                
                // Then fetch all those posts
                const postsRef = collection(FIRESTORE_DB, "posts");
                const savedPosts = [];
                
                // We need to fetch each post individually since Firestore doesn't support 
                // a direct "where id in [array]" query with document IDs
                for (const postId of savedPostIds) {
                    const postDocRef = doc(FIRESTORE_DB, "posts", postId);
                    const postDoc = await getDoc(postDocRef);
                    
                    if (postDoc.exists()) {
                        savedPosts.push({
                            id: postDoc.id,
                            ...postDoc.data()
                        });
                    }
                }
                
                setPosts(savedPosts);
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error("Error fetching saved posts:", error);
            Alert.alert("Error", "Failed to load saved posts");
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPosts = async () => {
        setLoading(true);
        try {
            const postsRef = collection(FIRESTORE_DB, "posts");
            const q = query(
                postsRef, 
                where("userId", "==", user.uid),
                orderBy("createdAt", "desc")
            );
            
            const querySnapshot = await getDocs(q);
            const userPosts = [];
            
            querySnapshot.forEach((doc) => {
                userPosts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            setPosts(userPosts);
        } catch (error) {
            console.error("Error fetching user posts:", error);
            Alert.alert("Error", "Failed to load your posts");
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (postId) => {
        try {
            await deleteDoc(doc(FIRESTORE_DB, "posts", postId));
            // Update the posts list without re-fetching
            setPosts(posts.filter(post => post.id !== postId));
            Alert.alert("Success", "Post deleted successfully");
        } catch (error) {
            console.error("Error deleting post:", error);
            Alert.alert("Error", "Failed to delete post");
        }
    };

    const handleRemoveSavedPost = async (postId) => {
        try {
            // Get current saved posts
            const userDocRef = doc(FIRESTORE_DB, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const savedPosts = userData.savedPosts || [];
                
                // Remove the post ID
                const updatedSavedPosts = savedPosts.filter(id => id !== postId);
                
                // Update the user document
                await updateDoc(userDocRef, {
                    savedPosts: updatedSavedPosts
                });
                
                // Update local state
                setPosts(posts.filter(post => post.id !== postId));
                
                // Update profile state if needed
                if (profile) {
                    setProfile({
                        ...profile,
                        savedPosts: updatedSavedPosts
                    });
                }
                
                Alert.alert("Success", "Post removed from saved posts");
            }
        } catch (error) {
            console.error("Error removing saved post:", error);
            Alert.alert("Error", "Failed to remove from saved posts");
        }
    };

    const getInitial = (name) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    const saveProfile = async () => {
        setLoading(true);
        try {
            const userDocRef = doc(FIRESTORE_DB, "users", user.uid);
            await updateDoc(userDocRef, updatedProfile);
            setProfile(updatedProfile);
            setEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = () => {
        FIREBASE_AUTH.signOut();
    };

    const renderPost = ({ item }) => {
        return (
            <View style={styles.postContainer}>
                <View style={styles.postHeader}>
                    <View style={styles.userInfo}>
                        <Ionicons name="person-circle-outline" size={24} color="#8E2F2D" />
                        <Text style={styles.userEmail}>{item.userEmail}</Text>
                    </View>
                    {activeTab === 'my' ? (
                        <TouchableOpacity onPress={() => handleDeletePost(item.id)}>
                            <Ionicons name="trash-outline" size={18} color="gray" />
                        </TouchableOpacity>
                    ) : activeTab === 'saved' && (
                        <TouchableOpacity onPress={() => handleRemoveSavedPost(item.id)}>
                            <Ionicons 
                            name= "bookmark"
                            size={20} 
                            color="#8E2F2D"
                            />
                        </TouchableOpacity>
                    )}
                </View>
                
                <Text style={styles.postContent}>{item.content}</Text>
                
                <View style={styles.postFooter}>
                    <View style={styles.likeButton}>
                        <Ionicons name="heart" size={18} color="#8E2F2D" />
                        <Text style={styles.likeCount}>{item.likes || 0}</Text>
                    </View>
                    
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
                <Text style={{textAlign: 'center'}}>Loading...</Text>
            </View>
        );
    }

    // If viewing saved posts or user posts
    if (activeTab === 'saved' || activeTab === 'my') {
        return (
            <View style={styles.mainContainer}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={() => setActiveTab(null)}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {activeTab === 'saved' ? 'Saved Posts' : 'My Posts'}
                    </Text>
                </View>
                
                <FlatList
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {activeTab === 'saved' 
                                    ? 'No saved posts yet. Save posts from the community to view them here.'
                                    : 'You haven\'t posted anything yet. Head to the Community tab to start posting!'
                                }
                            </Text>
                        </View>
                    }
                />
            </View>
        );
    }

    // Main profile view
    return (
        <View style={styles.mainContainer}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>BDAY</Text>
            </View>
            
            <ScrollView style={styles.container}>
                <Text style={styles.sectionTitle}>Profile</Text>
                
                <View style={styles.profileCard}>
                    <View style={styles.profileImageContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {getInitial(profile.displayName)}
                                </Text>
                            </View>
                    </View>
                    
                    <View style={styles.profileInfo}>
                        {editing ? (
                            <>
                                <Text style={styles.label}>Display Name</Text>
                                <TextInput 
                                    style={styles.input}
                                    value={updatedProfile.displayName}
                                    onChangeText={(text) => setUpdatedProfile({...updatedProfile, displayName: text})}
                                />
                                
                                <Text style={styles.label}>Bio</Text>
                                <TextInput 
                                    style={[styles.input, styles.bioInput]}
                                    value={updatedProfile.bio}
                                    onChangeText={(text) => setUpdatedProfile({...updatedProfile, bio: text})}
                                    multiline
                                />
                                
                                <View style={styles.buttonsRow}>
                                    <TouchableOpacity 
                                        style={[styles.button, styles.cancelButton]} 
                                        onPress={() => {
                                            setEditing(false);
                                            setUpdatedProfile(profile);
                                        }}
                                    >
                                        <Text style={styles.buttonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.button, styles.saveButton]} 
                                        onPress={saveProfile}
                                    >
                                        <Text style={[styles.buttonText, styles.saveButtonText]}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={styles.displayName}>{profile.displayName}</Text>
                                <Text style={styles.email}>{profile.email}</Text>
                                
                                {profile.bio ? (
                                    <View style={styles.bioContainer}>
                                        <Text style={styles.bioLabel}>Bio</Text>
                                        <Text style={styles.bio}>{profile.bio}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.noBio}>No bio added yet</Text>
                                )}
                                
                                <TouchableOpacity 
                                    style={[styles.button, styles.editButton]} 
                                    onPress={() => setEditing(true)}
                                >
                                    <Text style={styles.buttonText}>Edit Profile</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
                
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => setActiveTab('saved')}
                >
                    <Text style={styles.actionButtonText}>View Saved Posts</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => setActiveTab('my')}
                >
                    <Text style={styles.actionButtonText}>Manage Your Posts</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.actionButton, styles.signOutButton]} 
                    onPress={handleSignOut}
                >
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#8E2F2D',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: 10,
        marginStart:8,
        marginEnd:8,
        padding: 20,
        borderTopRightRadius: 10,
        borderTopLeftRadius: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    header: {
        backgroundColor: '#8E2F2D',
        padding: 15,
        alignItems: 'center',
        paddingTop: 40,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 15,
        top: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        paddingTop: 10,
        color: 'white',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 10,
    },
    profileCard: {
        backgroundColor: '#FFF0F0',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileImageContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFB800',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: 'white',
    },
    profileInfo: {
        alignItems: 'center',
    },
    displayName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    email: {
        width: '100%',
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        flexWrap: 'wrap',
        textAlign: 'center', 
    },
    bioContainer: {
        width: '100%',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    bioLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    bio: {
        fontSize: 16,
        lineHeight: 24,
    },
    noBio: {
        fontSize: 16,
        color: '#999',
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        alignSelf: 'flex-start',
        marginBottom: 5,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: 'white',
    },
    bioInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 5,
        alignItems: 'center',
        marginVertical: 10,
    },
    editButton: {
        backgroundColor: '#8E2F2D',
        width: '100%',
    },
    cancelButton: {
        backgroundColor: '#ccc',
        flex: 1,
        marginRight: 5,
    },
    saveButton: {
        backgroundColor: '#8E2F2D',
        flex: 1,
        marginLeft: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    saveButtonText: {
        color: 'white',
    },
    actionButton: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 15,
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: 'white',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    signOutButton: {
        backgroundColor: '#f0f0f0',
        marginTop: 10,
        marginBottom: 30,
    },
    signOutText: {
        color: '#333',
        fontWeight: 'bold',
    },
    // Post list styles
    listContainer: {
        padding: 15,
        backgroundColor: '#fff',
    },
    postContainer: {
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
        color: '#444',
    },
    postContent: {
        fontSize: 16,
        marginBottom: 10,
        lineHeight: 22,
    },
    postFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
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
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: 'gray',
        textAlign: 'center',
        fontSize: 16,
    },
});

export default ProfileScreen;