/**
 * Review: the masks of every user, for the admins of a project without a
 * server
 *
 * Who annotated each image, their notes, how well their masks agree, and the
 * GeoTIFFs of the masks merged by majority.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { backend } from '../services/backend';
import { useSegmentationStore } from '../stores/segmentationStore';
import { ImageReview, collectReview, scoreImage } from '../review/review';
import { downloadFile, exportMergedImages } from '../export/annotated';
import { mergeMasks } from '../segmentation/merge';
import type { ScoreKind } from '../segmentation/merge';
import { goToImage } from '../segmentation/navigation';

const DIFFICULTIES = ['very easy', 'easy', 'okay', 'difficult', 'very difficult'];

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const config = useSegmentationStore((state) => state.config);
  const images = useSegmentationStore((state) => state.images);
  const [reviews, setReviews] = useState<ImageReview[] | null>(null);
  const [shared, setShared] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const source = backend().review?.() ?? null;
  const segmentation = config?.segmentation as any;
  const scoreKind: ScoreKind = segmentation?.score ?? 'f1';
  const maskArea = useSegmentationStore((state) => state.maskArea);
  const maskLength = maskArea ? (maskArea[2] - maskArea[0]) * (maskArea[3] - maskArea[1]) : 0;

  const load = useCallback(async () => {
    if (!source) return;
    setError(null);
    setStatus('Loading the masks of all users...');
    try {
      const result = await collectReview(
        source, images.map((image) => image.image_id), segmentation?.unverified_threshold ?? 1
      );
      setReviews(result.images);
      setShared(result.shared);
      setStatus(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : String(err));
    }
    // source is recreated on every render but stays the same backend
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const annotated = (reviews ?? []).filter((review) => review.annotations.length);

  const computeScores = async () => {
    if (!source || !reviews) return;
    setBusy(true);
    setError(null);
    try {
      const scored: ImageReview[] = [];
      for (const [i, review] of reviews.entries()) {
        setStatus(`Scoring image ${i + 1} of ${reviews.length}...`);
        if (!review.annotations.length) {
          scored.push(review);
          continue;
        }
        const { scores } = await scoreImage(source, review, maskLength, scoreKind);
        scored.push({
          ...review,
          annotations: review.annotations.map((annotation) => ({ ...annotation, score: scores[annotation.user] })),
        });
      }
      setReviews(scored);
      setStatus(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const exportMerged = async (imageIds: string[]) => {
    if (!source || !config) return;
    setBusy(true);
    setError(null);
    try {
      const result = await exportMergedImages(imageIds, (done, total) => {
        setStatus(`Exporting ${done} of ${total} images...`);
      }, {
        config,
        imageFiles: (imageId) => backend().imageFiles(config, imageId),
        async mergedMask(imageId, length) {
          const review = reviews?.find((candidate) => candidate.imageId === imageId);
          if (!review?.annotations.length) return null;
          const masks = await Promise.all(review.annotations.map(({ user }) => source.loadMask(user, imageId, length)));
          const found = masks.filter((mask) => mask).map((mask) => mask!.mask);
          return found.length ? mergeMasks(found) : null;
        },
      });
      setStatus(null);
      if (result) {
        downloadFile(result.bytes, result.name, result.name.endsWith('.zip') ? 'application/zip' : 'image/tiff');
      } else {
        setError('No image has masks to export');
      }
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const button = (primary = false): React.CSSProperties => ({
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: busy ? 'wait' : 'pointer',
    border: `1px solid ${primary ? theme.buttonPrimaryBg : theme.buttonSecondaryBorder}`,
    backgroundColor: primary ? theme.buttonPrimaryBg : theme.buttonSecondaryBg,
    color: primary ? theme.buttonPrimaryText : theme.buttonSecondaryText,
  });
  const cell: React.CSSProperties = {
    padding: '8px 10px',
    borderBottom: `1px solid ${theme.modalBorder}`,
    fontSize: '13px',
    color: theme.gray900,
    verticalAlign: 'top',
    textAlign: 'left',
  };
  const users = new Set(annotated.flatMap((review) => review.annotations.map((a) => a.user)));

  return (
    <div
      data-testid="review-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
      <div style={{
        backgroundColor: theme.modalBg,
        border: `1px solid ${theme.modalBorder}`,
        borderRadius: '12px',
        width: '820px',
        maxWidth: '94vw',
        maxHeight: '86vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: theme.modalHeaderBg,
          borderBottom: `1px solid ${theme.modalBorder}`,
        }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: theme.gray900 }}>Review</span>
          <button onClick={onClose} aria-label="Close review" style={{
            background: 'transparent', border: 'none', cursor: 'pointer', color: theme.gray500, fontSize: '18px',
          }}>×</button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {!source && (
            <p style={{ fontSize: '13px', color: theme.gray600 }}>Only admins review the masks of all users.</p>
          )}
          {source && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: theme.gray700, flex: 1 }}>
                  {reviews
                    ? `${annotated.length} of ${reviews.length} images annotated by ${users.size} users`
                    : ''}
                  {!shared && ' (the masks of this browser only)'}
                </span>
                <button onClick={computeScores} disabled={busy || !annotated.length} style={button()}>
                  Compute scores
                </button>
                <button
                  onClick={() => exportMerged(annotated.map((review) => review.imageId))}
                  disabled={busy || !annotated.length}
                  style={button(true)}
                >
                  Export merged masks
                </button>
              </div>
              {status && <p role="status" style={{ fontSize: '13px', color: theme.gray600 }}>{status}</p>}
              {error && (
                <p style={{ fontSize: '13px', color: theme.alert, backgroundColor: theme.alertPale, padding: '8px 12px', borderRadius: '6px' }}>
                  {error}
                </p>
              )}
              {reviews && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Image', 'Annotations', `Score (${scoreKind})`, ''].map((title) => (
                        <th key={title} style={{ ...cell, fontWeight: 600, color: theme.gray600 }}>{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr key={review.imageId}>
                        <td style={cell}>
                          <a
                            href={backend().pageUrl(review.imageId)}
                            onClick={(e) => { e.preventDefault(); onClose(); goToImage(review.imageId, { ask: false }); }}
                            style={{ color: theme.primary }}
                          >
                            {review.imageId}
                          </a>
                        </td>
                        <td style={cell}>
                          {review.annotations.length === 0 && <span style={{ color: theme.gray500 }}>none</span>}
                          {review.annotations.map((annotation) => (
                            <div key={annotation.user} title={annotation.notes?.notes || undefined}>
                              {annotation.user}
                              {annotation.notes?.complete ? ' ✓' : ''}
                              <span style={{ color: theme.gray500 }}>
                                {annotation.notes ? ` · ${DIFFICULTIES[annotation.notes.difficulty - 1] ?? ''}` : ''}
                                {annotation.notes?.notes ? ' · has notes' : ''}
                              </span>
                            </div>
                          ))}
                        </td>
                        <td style={cell}>
                          {review.annotations.map((annotation) => (
                            <div key={annotation.user}>
                              {annotation.score === undefined ? '–' : `${annotation.score}%`}
                              {annotation.score !== undefined && review.unverified ? ' (unverified)' : ''}
                            </div>
                          ))}
                        </td>
                        <td style={{ ...cell, textAlign: 'right' }}>
                          {review.annotations.length > 0 && (
                            <button onClick={() => exportMerged([review.imageId])} disabled={busy} style={button()}>
                              GeoTIFF
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
