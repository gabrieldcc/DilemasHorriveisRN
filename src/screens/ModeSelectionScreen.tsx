import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ModeCard } from '../components/ModeCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { isAdminPinConfigured, useAdminStore } from '../store/adminStore';
import { GAME_MODES } from '../utils/gameModes';

export function ModeSelectionScreen() {
  const router = useRouter();
  const unlockAdmin = useAdminStore((state) => state.unlock);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [adminGestureArmed, setAdminGestureArmed] = useState(false);

  const handleLogoTap = () => {
    const nextCount = logoTapCount + 1;
    if (nextCount >= 3) {
      setLogoTapCount(0);
      setAdminGestureArmed(true);
      setTimeout(() => setAdminGestureArmed(false), 6000);
      return;
    }
    setLogoTapCount(nextCount);
  };

  const openAdminGate = () => {
    if (!adminGestureArmed) {
      return;
    }
    setAdminGestureArmed(false);
    if (!isAdminPinConfigured()) {
      setAdminError('PIN admin nao configurado no ambiente.');
      setShowAdminModal(true);
      return;
    }
    setAdminError(null);
    setAdminPin('');
    setShowAdminModal(true);
  };

  const handleUnlockAdmin = () => {
    const isValid = unlockAdmin(adminPin.trim());
    if (!isValid) {
      setAdminError('PIN invalido.');
      return;
    }
    setAdminError(null);
    setAdminPin('');
    setShowAdminModal(false);
    router.push('/admin');
  };

  return (
    <ScreenContainer>
      <View style={styles.headerContainer}>
        <Pressable onPress={handleLogoTap} onLongPress={openAdminGate} delayLongPress={3000}>
          <Text style={styles.title}>Dilemas Horriveis</Text>
        </Pressable>
        <Text style={styles.subtitle}>Escolha um modo para comecar</Text>
      </View>

      <View style={styles.listContainer}>
        {GAME_MODES.map((mode) => (
          <ModeCard
            key={mode.value}
            title={mode.label}
            onPress={() =>
              router.push({
                pathname: '/game',
                params: { mode: mode.value },
              })
            }
          />
        ))}
      </View>

      <Modal visible={showAdminModal} transparent animationType="fade" onRequestClose={() => setShowAdminModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Acesso admin</Text>
            <TextInput
              value={adminPin}
              onChangeText={setAdminPin}
              placeholder="Digite o PIN"
              placeholderTextColor="#64748b"
              secureTextEntry
              style={styles.modalInput}
            />
            {adminError ? <Text style={styles.modalError}>{adminError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalButton} onPress={() => setShowAdminModal(false)}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalButtonPrimary} onPress={handleUnlockAdmin}>
                <Text style={styles.modalButtonText}>Entrar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    color: '#f8fafc',
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 18,
  },
  listContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalError: {
    color: '#fca5a5',
    marginTop: 8,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    gap: 10,
  },
  modalButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalButtonPrimary: {
    backgroundColor: '#0e7490',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
});
