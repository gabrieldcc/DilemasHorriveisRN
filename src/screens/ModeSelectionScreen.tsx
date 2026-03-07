import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ModeCard } from '../components/ModeCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { hasSeenModeTutorial, hasSeenTutorial } from '../hooks/useTutorialGate';
import { ModoJogo } from '../models/game';
import { getUserProfile, saveUserProfile } from '../services/profileService';
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
  const [loadingMode, setLoadingMode] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      const profile = await getUserProfile();
      if (!isMounted) {
        return;
      }
      setShowProfileModal(!profile);
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleSelectMode = async (mode: ModoJogo) => {
    if (showProfileModal) {
      return;
    }

    setLoadingMode(mode);
    try {
      const seenModeTutorial = await hasSeenModeTutorial(mode);
      if (!seenModeTutorial) {
        router.push({
          pathname: '/tutorial' as never,
          params: { mode },
        });
        return;
      }

      const seenTutorial = await hasSeenTutorial();
      if (seenTutorial) {
        router.push({
          pathname: '/game',
          params: { mode },
        });
        return;
      }
      router.push({
        pathname: '/tutorial' as never,
        params: { mode },
      });
    } finally {
      setLoadingMode(null);
    }
  };

  const handleSaveProfile = async () => {
    if (isSavingProfile) {
      return;
    }

    setProfileError(null);
    setIsSavingProfile(true);
    try {
      await saveUserProfile(firstName, lastName);
      setShowProfileModal(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Nao foi possivel salvar seu nome.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.headerContainer}>
        <Pressable onPress={handleLogoTap} onLongPress={openAdminGate} delayLongPress={3000}>
          <Text style={styles.title}>Dilemas Horríveis</Text>
        </Pressable>
        <Text style={styles.subtitle}>Escolha um modo para comecar</Text>
      </View>

      <View style={styles.listContainer}>
        {GAME_MODES.map((mode) => (
          <ModeCard
            key={mode.value}
            title={loadingMode === mode.value ? `${mode.label}...` : mode.label}
            onPress={() => void handleSelectMode(mode.value as ModoJogo)}
          />
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/suggest' as never)}
        style={({ pressed }) => [styles.suggestButton, pressed && styles.suggestButtonPressed]}
      >
        <Text style={styles.suggestButtonText}>Sugerir novo dilema</Text>
      </Pressable>

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

      <Modal visible={showProfileModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Como podemos te chamar?</Text>
            <Text style={styles.profileHelperText}>Esse nome sera usado nos seus comentarios.</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Nome"
              placeholderTextColor="#64748b"
              autoCapitalize="words"
              returnKeyType="next"
              style={styles.modalInput}
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Sobrenome"
              placeholderTextColor="#64748b"
              autoCapitalize="words"
              returnKeyType="done"
              style={styles.modalInput}
            />
            {profileError ? <Text style={styles.modalError}>{profileError}</Text> : null}
            <Pressable
              style={({ pressed }) => [
                styles.modalButtonPrimary,
                styles.profileSaveButton,
                pressed && styles.profileSaveButtonPressed,
                isSavingProfile && styles.profileSaveButtonDisabled,
              ]}
              disabled={isSavingProfile}
              onPress={() => void handleSaveProfile()}
            >
              <Text style={styles.modalButtonText}>{isSavingProfile ? 'Salvando...' : 'Continuar'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginTop: 48,
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 18,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  suggestButton: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  suggestButtonPressed: {
    opacity: 0.9,
  },
  suggestButtonText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 15,
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
    marginBottom: 10,
  },
  modalError: {
    color: '#fca5a5',
    marginTop: 8,
    fontSize: 13,
  },
  profileHelperText: {
    color: '#94a3b8',
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  profileSaveButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  profileSaveButtonPressed: {
    opacity: 0.9,
  },
  profileSaveButtonDisabled: {
    opacity: 0.65,
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
