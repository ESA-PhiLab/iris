/**
 * Questions about the mask before leaving an image the user edited
 *
 * How difficult the mask was, notes for the reviewers and whether it is
 * complete. The answers are saved with the user's mask of the image.
 */

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSegmentationStore } from '../../stores/segmentationStore';
import { useUiStore } from '../../stores/uiStore';
import { backend } from '../../services/backend';
import type { ImageNotes } from '../../services/localLabels';
import { openImage } from '../../segmentation/navigation';

const DIFFICULTIES = ['very easy', 'easy', 'okay', 'difficult', 'very difficult'];

const ImageNotesDialog: React.FC = () => {
  const { theme } = useTheme();
  const leavingTo = useUiStore((state) => state.leavingTo);
  const setLeavingTo = useUiStore((state) => state.setLeavingTo);
  const currentImageId = useSegmentationStore((state) => state.currentImageId);
  const [info, setInfo] = useState<ImageNotes | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!leavingTo || !currentImageId) return;
    let cancelled = false;
    setInfo(null);
    backend().loadNotes(currentImageId)
      .catch(() => null)
      .then((loaded) => {
        if (cancelled) return;
        // Without a saved mask there is nothing to note
        if (loaded) setInfo(loaded);
        else openImage(leavingTo);
      });
    return () => { cancelled = true; };
  }, [leavingTo, currentImageId]);

  if (!leavingTo || !info) return null;

  const goBack = () => setLeavingTo(null);
  const saveAndContinue = async () => {
    setSaving(true);
    try {
      await backend().saveNotes(currentImageId!, info);
      useSegmentationStore.getState().setShowDialogueBeforeNextImage(false);
      openImage(leavingTo);
    } catch (error) {
      setSaving(false);
      useUiStore.getState().showErrorModal(error instanceof Error ? error.message : String(error));
    }
  };

  const label: React.CSSProperties = { margin: '0 0 8px', fontSize: '13px', color: theme.gray700 };
  const button = (primary: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: saving ? 'wait' : 'pointer',
    border: `1px solid ${primary ? theme.buttonPrimaryBg : theme.buttonSecondaryBorder}`,
    backgroundColor: primary ? theme.buttonPrimaryBg : theme.buttonSecondaryBg,
    color: primary ? theme.buttonPrimaryText : theme.buttonSecondaryText,
  });

  return (
    <div
      data-testid="image-notes-dialog"
      onClick={(e) => { if (e.target === e.currentTarget) goBack(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.modalOverlay,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-notes-title"
        style={{
          backgroundColor: theme.modalBg,
          border: `1px solid ${theme.modalBorder}`,
          borderRadius: '12px',
          width: '440px',
          maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '16px 20px',
          backgroundColor: theme.modalHeaderBg,
          borderBottom: `1px solid ${theme.modalBorder}`,
          fontSize: '15px',
          fontWeight: 600,
          color: theme.gray900,
        }} id="image-notes-title">
          Before you continue...
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={label}>How difficult was it to create this mask?</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range"
                min={1}
                max={5}
                value={info.difficulty}
                aria-label="Difficulty"
                onChange={(e) => setInfo({ ...info, difficulty: Number(e.target.value) })}
                style={{ flex: 1, accentColor: theme.primary }}
              />
              <span style={{ width: '90px', fontSize: '13px', color: theme.gray900 }}>
                {DIFFICULTIES[info.difficulty - 1]}
              </span>
            </div>
          </div>
          <div>
            <p style={label}>Do you have any comments about this mask (max. 256 characters)?</p>
            <textarea
              value={info.notes}
              maxLength={256}
              rows={3}
              aria-label="Notes"
              onChange={(e) => setInfo({ ...info, notes: e.target.value })}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px',
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '13px',
                resize: 'vertical',
                color: theme.inputText,
                backgroundColor: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
              }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.gray900 }}>
            <input
              type="checkbox"
              checked={info.complete}
              onChange={(e) => setInfo({ ...info, complete: e.target.checked })}
              style={{ accentColor: theme.primary }}
            />
            I think this mask is complete and ready for evaluation.
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={goBack} disabled={saving} style={button(false)}>Go back to the mask</button>
            <button onClick={saveAndContinue} disabled={saving} style={button(true)}>Save and continue</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageNotesDialog;
