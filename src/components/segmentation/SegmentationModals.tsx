import React from 'react';
import PreferencesModal from '../PreferencesModal';
import { UserProfileModal } from '../UserProfileModal';
import { LoginForm } from '../LoginForm';
import HelpModal from '../HelpModal';
import ConfirmDialog from '../ConfirmDialog';
import ClassSelectionModal from '../ClassSelectionModal';
import ImageInfoModal from '../ImageInfoModal';
import ConfusionMatrixModal from '../ConfusionMatrixModal';
import ErrorModal from '../ErrorModal';
import { useSegmentationStore } from '../../stores/segmentationStore';
import '../ErrorModal.css';

interface SegmentationModalsProps {
  isPreferencesOpen: boolean;
  onClosePreferences: () => void;
  isProfileOpen: boolean;
  onCloseProfile: () => void;
  profileUserId: string;
  isLoginOpen: boolean;
  loginMode: 'login' | 'register';
  onLoginSuccess?: () => void;
  isHelpOpen: boolean;
  onCloseHelp: () => void;
  isResetMaskOpen: boolean;
  onCloseResetMask: () => void;
  onConfirmResetMask: () => void;
  isClassSelectionOpen: boolean;
  onCloseClassSelection: () => void;
  isImageInfoOpen: boolean;
  onCloseImageInfo: () => void;
  isConfusionMatrixOpen: boolean;
  onCloseConfusionMatrix: () => void;
}

const SegmentationModals: React.FC<SegmentationModalsProps> = ({
  isPreferencesOpen,
  onClosePreferences,
  isProfileOpen,
  onCloseProfile,
  profileUserId,
  isLoginOpen,
  loginMode,
  onLoginSuccess,
  isHelpOpen,
  onCloseHelp,
  isResetMaskOpen,
  onCloseResetMask,
  onConfirmResetMask,
  isClassSelectionOpen,
  onCloseClassSelection,
  isImageInfoOpen,
  onCloseImageInfo,
  isConfusionMatrixOpen,
  onCloseConfusionMatrix
}) => {
  const { errorModal, hideErrorModal } = useSegmentationStore();

  return (
    <>
      <PreferencesModal isOpen={isPreferencesOpen} onClose={onClosePreferences} />
      
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={onCloseProfile}
        userId={profileUserId}
      />
      
      {isLoginOpen && <LoginForm initialMode={loginMode} onSuccess={onLoginSuccess} />}
      
      <HelpModal isOpen={isHelpOpen} onClose={onCloseHelp} />
      
      <ConfirmDialog
        isOpen={isResetMaskOpen}
        onClose={onCloseResetMask}
        onConfirm={onConfirmResetMask}
        message="Are you sure you want to reset all your drawn pixels?"
        confirmText="Reset"
        cancelText="Cancel"
        type="warning"
      />
      
      <ClassSelectionModal
        isOpen={isClassSelectionOpen}
        onClose={onCloseClassSelection}
      />
      
      <ImageInfoModal isOpen={isImageInfoOpen} onClose={onCloseImageInfo} />
      
      <ConfusionMatrixModal
        isOpen={isConfusionMatrixOpen}
        onClose={onCloseConfusionMatrix}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={hideErrorModal}
      />
    </>
  );
};

export default SegmentationModals;
