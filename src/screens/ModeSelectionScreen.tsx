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
import { GAME_MODES } from '../utils/gameModes';

type TipoPartida = 'classic' | 'infiltrado';

const MODE_UI: Record<ModoJogo, { icon: string; subtitle: string; tag: string }> = {
  [ModoJogo.leve]: {
    icon: '🎲',
    subtitle: 'Dilemas descontraídos para aquecer o jogo.',
    tag: 'ARENA 1',
  },
  [ModoJogo.pesado]: {
    icon: '🔥',
    subtitle: 'Escolhas tensas para grupos sem medo de debate.',
    tag: 'ARENA 3',
  },
  [ModoJogo.nerd]: {
    icon: '🧠',
    subtitle: 'Conflitos de cultura pop, filmes, séries e tecnologia.',
    tag: 'ARENA 2',
  },
  [ModoJogo.culturaBR]: {
    icon: '🇧🇷',
    subtitle: 'Referências brasileiras para debate em grupo.',
    tag: 'ARENA BR',
  },
  [ModoJogo.adultos]: {
    icon: '🔞',
    subtitle: 'Dilemas para grupos adultos e debates sem filtro.',
    tag: 'ARENA X',
  },
  [ModoJogo.favoritas]: {
    icon: '⭐',
    subtitle: 'Seus dilemas salvos para repetir quando quiser.',
    tag: 'SEUS PICKS',
  },
  [ModoJogo.comunidade]: {
    icon: '🌍',
    subtitle: 'As perguntas mais favoritadas pela galera.',
    tag: 'TOP GLOBAL',
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
      setAdminError('PIN admin não configurado no ambiente.');
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
      setAdminError('PIN inválido.');
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
      setProfileError(error instanceof Error ? error.message : 'Não foi possível salvar seu nome.');
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
              <Text style={styles.logoTopLine}>DILEMAS</Text>
              <Text style={styles.logoBottomLine}>Horríveis</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.listContainer}>
          {GAME_MODES.map((mode) => {
            const ui = MODE_UI[mode.value as ModoJogo];
            return (
              <ModeCard
                key={mode.value}
                title={loadingMode === mode.value ? `${mode.label}...` : mode.label}
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
          <Text style={styles.suggestButtonText}>Sugerir novo dilema</Text>
        </Pressable>
      </ScrollView>

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

      <Modal
        visible={showGameTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGameTypeModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Escolha o formato da rodada</Text>
            <Text style={styles.gameTypeHelperText}>
              <Text style={styles.gameTypeHelperStrong}>Clássico:</Text> o grupo debate e escolhe a resposta mais
              votada.
            </Text>
            <Text style={styles.gameTypeHelperText}>
              <Text style={styles.gameTypeHelperStrong}>Infiltrado:</Text> um jogador recebe um papel secreto e precisa
              defender o oposto do que acredita.
            </Text>
            <Text style={styles.gameTypeHelperText}>
              No fim do debate, o grupo vota em quem acha que era o infiltrado.
            </Text>

            <Pressable
              style={({ pressed }) => [styles.gameTypeButton, pressed && styles.gameTypeButtonPressed]}
              onPress={() => handleSelectGameType('classic')}
            >
              <Text style={styles.gameTypeTitle}>Clássico</Text>
              <Text style={styles.gameTypeSubtitle}>Debate livre e voto em grupo.</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.gameTypeButton,
                styles.gameTypeButtonHighlight,
                pressed && styles.gameTypeButtonPressed,
              ]}
              onPress={() => handleSelectGameType('infiltrado')}
            >
              <Text style={styles.gameTypeTitle}>Infiltrado</Text>
              <Text style={styles.gameTypeSubtitle}>
                Papel secreto, defesa invertida e votação final para descobrir o infiltrado.
              </Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalButton} onPress={() => setShowGameTypeModal(false)}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showProfileModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Como podemos te chamar?</Text>
            <Text style={styles.profileHelperText}>Esse nome será usado nos seus comentários.</Text>
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
  },
  logoTopLine: {
    color: '#e2e8f0',
    fontSize: 26,
    letterSpacing: 3,
    fontWeight: '500',
    lineHeight: 30,
    textAlign: 'center',
  },
  logoBottomLine: {
    color: '#67e8f9',
    fontSize: 46,
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
