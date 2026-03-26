import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModeCard } from '../components/ModeCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { hasSeenModeTutorial, hasSeenTutorial } from '../hooks/useTutorialGate';
import { ModoJogo } from '../models/game';
import { getUserProfile, saveUserProfile } from '../services/profileService';
import { isAdminPinConfigured, useAdminStore } from '../store/adminStore';
import { GAME_MODES, getModoLabel } from '../utils/gameModes';
import { t } from '../i18n';

type TipoPartida = 'classic' | 'infiltrado';

const MODE_UI: Record<ModoJogo, { icon: string; subtitle: string; tag: string }> = {
  [ModoJogo.leve]: {
    icon: '🎲',
    subtitle: t('modeSelection.mode.leve.subtitle'),
    tag: '',
  },
  [ModoJogo.pesado]: {
    icon: '🔥',
    subtitle: t('modeSelection.mode.pesado.subtitle'),
    tag: '',
  },
  [ModoJogo.nerd]: {
    icon: '🧠',
    subtitle: t('modeSelection.mode.nerd.subtitle'),
    tag: '',
  },
  [ModoJogo.culturaBR]: {
    icon: '🇧🇷',
    subtitle: t('modeSelection.mode.culturaBR.subtitle'),
    tag: '',
  },
  [ModoJogo.adultos]: {
    icon: '🔞',
    subtitle: t('modeSelection.mode.adultos.subtitle'),
    tag: '',
  },
  [ModoJogo.favoritas]: {
    icon: '⭐',
    subtitle: t('modeSelection.mode.favoritas.subtitle'),
    tag: t('modeSelection.mode.favoritas.tag'),
  },
  [ModoJogo.comunidade]: {
    icon: '🌍',
    subtitle: t('modeSelection.mode.comunidade.subtitle'),
    tag: t('modeSelection.mode.comunidade.tag'),
  },
};

export function ModeSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [showGameTypeModal, setShowGameTypeModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<ModoJogo | null>(null);

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
      setAdminError(t('modeSelection.pinMissing'));
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
      setAdminError(t('modeSelection.pinInvalid'));
      return;
    }
    setAdminError(null);
    setAdminPin('');
    setShowAdminModal(false);
    router.push('/admin');
  };

  const handleContinueWithMode = async (mode: ModoJogo, gameType: TipoPartida) => {
    if (showProfileModal) {
      return;
    }

    setLoadingMode(mode);
    try {
      const seenModeTutorial = await hasSeenModeTutorial(mode);
      if (!seenModeTutorial) {
        router.push({
          pathname: '/tutorial' as never,
          params: { mode, gameType },
        });
        return;
      }

      const seenTutorial = await hasSeenTutorial();
      if (seenTutorial) {
        router.push({
          pathname: '/game',
          params: { mode, gameType },
        });
        return;
      }
      router.push({
        pathname: '/tutorial' as never,
        params: { mode, gameType },
      });
    } finally {
      setLoadingMode(null);
    }
  };

  const handleSelectMode = (mode: ModoJogo) => {
    if (showProfileModal) {
      return;
    }

    setPendingMode(mode);
    setShowGameTypeModal(true);
  };

  const handleSelectGameType = (gameType: TipoPartida) => {
    if (!pendingMode) {
      setShowGameTypeModal(false);
      return;
    }

    setShowGameTypeModal(false);
    void handleContinueWithMode(pendingMode, gameType);
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
      setProfileError(error instanceof Error ? error.message : t('modeSelection.profileSaveError'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Pressable onPress={handleLogoTap} onLongPress={openAdminGate} delayLongPress={3000}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoTopLine}>Bad</Text>
              <Text style={styles.logoBottomLine}>Pick</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.listContainer}>
          {GAME_MODES.map((mode) => {
            const ui = MODE_UI[mode.value as ModoJogo];
            return (
              <ModeCard
                key={mode.value}
                title={loadingMode === mode.value ? `${getModoLabel(mode.value as ModoJogo)}...` : getModoLabel(mode.value as ModoJogo)}
                icon={ui?.icon}
                subtitle={ui?.subtitle}
                tag={ui?.tag}
                onPress={() => void handleSelectMode(mode.value as ModoJogo)}
              />
            );
          })}
        </View>

        <Pressable
          onPress={() => router.push('/suggest' as never)}
          style={({ pressed }) => [styles.suggestButton, { marginBottom: insets.bottom + 16 }, pressed && styles.suggestButtonPressed]}
        >
          <Text style={styles.suggestButtonText}>{t('modeSelection.suggestNew')}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showAdminModal} transparent animationType="fade" onRequestClose={() => setShowAdminModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('modeSelection.adminAccess')}</Text>
            <TextInput
              value={adminPin}
              onChangeText={setAdminPin}
              placeholder={t('modeSelection.pinPlaceholder')}
              placeholderTextColor="#64748b"
              secureTextEntry
              style={styles.modalInput}
            />
            {adminError ? <Text style={styles.modalError}>{adminError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalButton} onPress={() => setShowAdminModal(false)}>
                <Text style={styles.modalButtonText}>{t('modeSelection.cancel')}</Text>
              </Pressable>
              <Pressable style={styles.modalButtonPrimary} onPress={handleUnlockAdmin}>
                <Text style={styles.modalButtonText}>{t('modeSelection.enter')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showGameTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGameTypeModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('modeSelection.roundFormat')}</Text>
            <Text style={styles.gameTypeHelperText}>
              <Text style={styles.gameTypeHelperStrong}>{t('modeSelection.classicHelpTitle')}</Text> {t('modeSelection.classicHelpBody')}
            </Text>
            <Text style={styles.gameTypeHelperText}>
              <Text style={styles.gameTypeHelperStrong}>{t('modeSelection.infiltradoHelpTitle')}</Text> {t('modeSelection.infiltradoHelpBody')}
            </Text>
            <Text style={styles.gameTypeHelperText}>
              {t('modeSelection.infiltradoHelpFooter')}
            </Text>

            <Pressable
              style={({ pressed }) => [styles.gameTypeButton, pressed && styles.gameTypeButtonPressed]}
              onPress={() => handleSelectGameType('classic')}
            >
              <Text style={styles.gameTypeTitle}>{t('modeSelection.classic')}</Text>
              <Text style={styles.gameTypeSubtitle}>{t('modeSelection.classicSubtitle')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.gameTypeButton,
                styles.gameTypeButtonHighlight,
                pressed && styles.gameTypeButtonPressed,
              ]}
              onPress={() => handleSelectGameType('infiltrado')}
            >
              <Text style={styles.gameTypeTitle}>{t('modeSelection.infiltrado')}</Text>
              <Text style={styles.gameTypeSubtitle}>{t('modeSelection.infiltradoSubtitle')}</Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalButton} onPress={() => setShowGameTypeModal(false)}>
                <Text style={styles.modalButtonText}>{t('modeSelection.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showProfileModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('modeSelection.howToCallYou')}</Text>
            <Text style={styles.profileHelperText}>{t('modeSelection.profileHelper')}</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('modeSelection.firstName')}
              placeholderTextColor="#64748b"
              autoCapitalize="words"
              returnKeyType="next"
              style={styles.modalInput}
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('modeSelection.lastName')}
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
              <Text style={styles.modalButtonText}>{isSavingProfile ? t('modeSelection.saving') : t('modeSelection.continue')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  headerContainer: {
    marginTop: 32,
    marginBottom: 24,
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  logoTopLine: {
    color: '#e2e8f0',
      fontSize: 42,
    lineHeight: 48,
    fontStyle: 'italic',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(34, 211, 238, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  logoBottomLine: {
    color: '#67e8f9',
    fontSize: 42,
    lineHeight: 48,
    fontStyle: 'italic',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(34, 211, 238, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  listContainer: {
    flexGrow: 1,
  },
  suggestButton: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  suggestButtonPressed: {
    opacity: 0.9,
  },
  suggestButtonText: {
    color: '#e2e8f0',
    fontWeight: '500',
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
    fontWeight: '500',
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
  gameTypeHelperText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  gameTypeHelperStrong: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  gameTypeButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  gameTypeButtonHighlight: {
    borderColor: '#0e7490',
  },
  gameTypeButtonPressed: {
    opacity: 0.9,
  },
  gameTypeTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  gameTypeSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
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
    fontWeight: '500',
  },
});
