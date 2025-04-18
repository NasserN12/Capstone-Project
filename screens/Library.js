import React, { useState, useCallback, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

// Custom components & services
import TopBarProfileIcon from "../components/TopBarProfileIcon";
import SongCard from "../components/SongCard";
import PlayList from "../components/Playlist";
import { useGetSongs } from "../hooks/useGetSongs";
import { playlistService } from "../services/playlistService";
import { songService } from "../services/songService";

// THEME IMPORT
import { useTheme } from "../context/ThemeContext";
import ThemedScreen from "../components/ThemedScreen";

export default function LibraryScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  // Active tab can be: "Playlists", "MyUploads", "Liked", or false (for recently-played)
  const [activeTab, setActiveTab] = useState(false);

  // 1) Liked songs
  const {
    songs: likedSongs,
    loading: likedLoading,
    error: likedError,
    refreshSongs: refreshLikedSongs,
  } = useGetSongs("liked");

  // 2) Recently Played
  const {
    songs: recentlyPlayedSongs,
    loading: recentlyPlayedLoading,
    error: recentlyPlayedError,
    refreshSongs: refreshRecentlyPlayed,
  } = useGetSongs("recently-played");

  // 3) My Uploads
  const {
    songs: myUploads,
    loading: myUploadsLoading,
    error: myUploadsError,
    refreshSongs: refreshMyUploads,
  } = useGetSongs("my-uploads");

  // For deleting a song from My Uploads
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteSong = async (songId) => {
    try {
      setDeletingId(songId);
      Alert.alert(
        "Delete Song",
        "Are you sure you want to delete this song? This action cannot be undone.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setDeletingId(null),
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await songService.deleteSong(songId);
              refreshMyUploads();
              setDeletingId(null);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Failed to delete song:", error);
      Alert.alert("Error", "Failed to delete song. Please try again later.");
      setDeletingId(null);
    }
  };

  // 4) Playlists
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState(null);

  // For creating a new playlist
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);

  // On screen focus, refresh everything
  useFocusEffect(
    useCallback(() => {
      refreshLikedSongs();
      refreshRecentlyPlayed();
      refreshMyUploads();
      fetchPlaylists();
    }, [])
  );

  // Fetch all user playlists
  const fetchPlaylists = async () => {
    try {
      setPlaylistsLoading(true);
      const data = await playlistService.getUserPlaylists();
      setPlaylists(data);
    } catch (err) {
      setPlaylistsError(err.message || "Error fetching playlists");
    } finally {
      setPlaylistsLoading(false);
    }
  };

  // Create a new playlist
  const handleCreatePlaylist = async () => {
    if (playlistTitle.trim() === "") {
      Alert.alert("Error", "Please enter a playlist title");
      return;
    }
    try {
      setLoadingCreate(true);
      await playlistService.createPlaylist({
        title: playlistTitle,
        songs: [],
      });
      Alert.alert("Success", "Playlist created successfully!");
      setModalVisible(false);
      setPlaylistTitle("");
      fetchPlaylists();
    } catch (error) {
      console.error("Error creating playlist:", error);
      Alert.alert("Error", "Failed to create playlist");
    } finally {
      setLoadingCreate(false);
    }
  };

  // Delete entire playlist
  const handleDeletePlaylist = async (playlistId) => {
    try {
      setPlaylistsLoading(true);
      await playlistService.deletePlaylist(playlistId);
      fetchPlaylists();
    } catch (error) {
      console.error("Error deleting playlist:", error);
      Alert.alert("Error", "Failed to delete playlist");
    } finally {
      setPlaylistsLoading(false);
    }
  };

  // For top bar
  const handleProfilePress = () => {
    navigation.navigate("Profile");
  };

  // A button for each tab
  const TabButton = ({ title, isActive, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tabButton,
        {
          borderColor: theme.text, // default border color
          borderWidth: 1,
          backgroundColor: isActive ? theme.secondary : theme.background,
        },
      ]}
    >
      <Text style={{ color: theme.text }}>{title}</Text>
    </TouchableOpacity>
  );

  // A quick helper for a row-based icon & text
  const ActionButton = ({ icon, title, onPress }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={[styles.actionIconContainer, { backgroundColor: theme.primary }]}>
        <Text style={{ fontSize: 24, color: theme.text }}>{icon}</Text>
      </View>
      <Text style={[styles.actionText, { color: theme.text }]}>{title}</Text>
    </TouchableOpacity>
  );

  /***********************************************
   * RENDER: PLAYLISTS
   ***********************************************/
  const renderPlaylists = () => {
    if (playlistsLoading) {
      return <ActivityIndicator size="large" color={theme.primary} />;
    }
    if (playlistsError) {
      return <Text style={[styles.errorText, { color: theme.text }]}>{playlistsError}</Text>;
    }
    return (
      <>
        {/* Insert your button at the top */}
        <ActionButton
          icon="+"
          title="Create a Playlist"
          onPress={() => setModalVisible(true)}
        />

        <FlatList
          key={"playlists"}
          data={playlists}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.songListContainer}
          ListEmptyComponent={() => (
            <Text style={[styles.emptyText, { color: theme.text }]}>
              You don't have any playlists yet. Create one!
            </Text>
          )}
          renderItem={({ item }) => (
            <PlayList title={item.title} playlistId={item.id} onDelete={handleDeletePlaylist} />
          )}
        />

        {/* Create Playlist Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Create New Playlist
              </Text>

              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.secondary }]}
                placeholder="Playlist title"
                placeholderTextColor="#666"
                value={playlistTitle}
                onChangeText={setPlaylistTitle}
              />

              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.primary }]}
                onPress={handleCreatePlaylist}
                disabled={loadingCreate}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>
                  {loadingCreate ? "Creating..." : "Create Playlist"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.primary, borderWidth: 1 }]}
                onPress={() => {
                  setModalVisible(false);
                  setPlaylistTitle("");
                }}
                disabled={loadingCreate}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  /***********************************************
   * RENDER: MY UPLOADS
   ***********************************************/
  const renderMyUploads = () => {
    if (myUploadsLoading) {
      return <ActivityIndicator size="large" color={theme.primary} />;
    }
    if (myUploadsError) {
      return <Text style={[styles.errorText, { color: theme.text }]}>{myUploadsError}</Text>;
    }
    return (
      <>
        <ActionButton
          icon="+"
          title="Upload a Song"
          onPress={() => navigation.navigate("Upload")}
        />
        <FlatList
          data={myUploads}
          keyExtractor={(item) => item.songId.toString()}
          contentContainerStyle={styles.songListContainer}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={() => (
            <Text style={[styles.emptyText, { color: theme.text }]}>No Uploaded Songs</Text>
          )}
          renderItem={({ item }) => (
            <SongCard
              song={item}
              isOwnContent={true}
              onRemove={handleDeleteSong}
              isDeleting={deletingId === item.songId}
              contextSongs={myUploads} // Add context songs
            />
          )}
        />
      </>
    );
  };

  /***********************************************
   * RENDER: LIKED
   ***********************************************/
  const renderLiked = () => (
    <FlatList
      data={likedSongs}
      keyExtractor={(item) => item.songId.toString()}
      ListHeaderComponent={() => (
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Liked Songs</Text>
      )}
      renderItem={({ item }) => (
        <SongCard 
          song={item} 
          contextSongs={likedSongs} // Add context songs
        />
      )}
      contentContainerStyle={styles.songListContainer}
      ListEmptyComponent={() => (
        <Text style={[styles.emptyText, { color: theme.text }]}>
          {likedLoading ? <ActivityIndicator size="small" color={theme.primary} /> : "No liked songs yet"}
        </Text>
      )}
      showsVerticalScrollIndicator={false}
      onRefresh={refreshLikedSongs}
      refreshing={likedLoading}
    />
  );

  /***********************************************
   * RENDER: DEFAULT (RECENTLY PLAYED)
   ***********************************************/
  const renderDefault = () => (
    <FlatList
      data={recentlyPlayedSongs}
      keyExtractor={(item) => `recent-${item.songId}`}
      ListHeaderComponent={() => (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recently played</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <SongCard 
          song={item} 
          contextSongs={recentlyPlayedSongs} // Add context songs
        />
      )}
      contentContainerStyle={styles.songListContainer}
      showsVerticalScrollIndicator={false}
      onRefresh={refreshRecentlyPlayed}
      refreshing={recentlyPlayedLoading}
      ListEmptyComponent={() => (
        <Text style={[styles.emptyText, { color: theme.text }]}>
          {recentlyPlayedLoading ? "Loading..." : "No recently played songs"}
        </Text>
      )}
    />
  );

  return (
    <ThemedScreen style={styles.fullContainer}>
      <StatusBar barStyle="light-content" />

      {/* Tabs & Content */}
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.tabContainer}>
          <TabButton
            title="Playlists"
            isActive={activeTab === "Playlists"}
            onPress={() => {
              setActiveTab(activeTab === "Playlists" ? false : "Playlists");
            }}
          />
          <TabButton
            title="My Uploads"
            isActive={activeTab === "MyUploads"}
            onPress={() => {
              setActiveTab(activeTab === "MyUploads" ? false : "MyUploads");
            }}
          />
          <TabButton
            title="Liked"
            isActive={activeTab === "Liked"}
            onPress={() => {
              setActiveTab(activeTab === "Liked" ? false : "Liked");
            }}
          />
        </View>

        {activeTab === "Playlists"
          ? renderPlaylists()
          : activeTab === "MyUploads"
          ? renderMyUploads()
          : activeTab === "Liked"
          ? renderLiked()
          : renderDefault()}
      </View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  songListContainer: {
    paddingBottom: 150,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  sectionContainer: {
    marginTop: 10,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
  errorText: {
    textAlign: "center",
    marginTop: 20,
    color: "red",
  },

  /* For the "New Playlist" FAB & Modal */
  fabButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#ccc",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    alignSelf: "flex-end",
    marginRight: 10,
  },
  fabButtonText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#333",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    color: "#fff",
  },
  createButton: {
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
  },
  cancelButton: {
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  cancelButtonText: {
    fontSize: 16,
  },
});
