import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity,
  Platform,
  Button
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddBirthdayModal = ({ visible, onClose, onSave, initialDate }) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(initialDate || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reset date when modal opens with a new initial date
  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate, visible]);

  const handleSave = () => {
    onSave(name, date);
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setShowDatePicker(false);
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add BDay</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              autoFocus
            />
            
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity 
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!name.trim()}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 18,
    color: '#666',
  },
  modalContent: {
    padding: 15,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  dateSelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  dateText: {
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    width: '48%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#8E2F2D',
    borderRadius: 5,
    padding: 12,
    width: '48%',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default AddBirthdayModal;