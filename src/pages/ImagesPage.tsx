import React, { useState, useEffect } from 'react';
import { segmentationUrl } from '../utils/urls';
import { ImageData, ImagesApiResponse } from '../types/iris';
import { downloadFile, exportMergedImages } from '../export/annotated';

const ImagesPage: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<string>('image_id');
  const [isAscending, setIsAscending] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string>('');

  const fetchImages = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/admin/api/images?order_by=${orderBy}&ascending=${isAscending}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ImagesApiResponse = await response.json();
      setImages(data.images);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /** GeoTIFFs with the masks merged from all users, made in the browser */
  const exportImages = async (imageIds: string[]): Promise<void> => {
    if (isExporting) return;
    setIsExporting(true);
    setExportMessage('Exporting...');
    try {
      const result = await exportMergedImages(imageIds, (done, total) => {
        setExportMessage(`Exporting ${done} of ${total} images...`);
      });
      if (!result) {
        setExportMessage('❌ No image has annotations to export.');
      } else {
        downloadFile(result.bytes, result.name, result.name.endsWith('.zip') ? 'application/zip' : 'image/tiff');
        setExportMessage(
          `✅ Export complete! Exported ${result.count} images. `
          + `Skipped ${imageIds.length - result.count} images (no annotations).`
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setExportMessage(`❌ Export failed: ${errorMsg}`);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(''), 10000);
    }
  };

  const handleExportAll = () => exportImages(images.map((image) => image.image_id));

  useEffect(() => {
    fetchImages();
  }, [orderBy, isAscending]);

  const handleGotoImage = (imageId: string) => {
    window.open(segmentationUrl(imageId));
  };

  if (isLoading) {
    return <div>Loading images...</div>;
  }

  return (
    <div>
      {/* TypeScript Version Indicator */}
      {/* Export All Button and Message */}
      <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button
          onClick={handleExportAll}
          disabled={isExporting}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: isExporting ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isExporting ? '⏳ Exporting...' : '📦 Export All GeoTIFFs'}
        </button>
        {exportMessage && (
          <span style={{
            padding: '8px 12px',
            borderRadius: '4px',
            backgroundColor: exportMessage.startsWith('✅') ? '#d4edda' : '#f8d7da',
            color: exportMessage.startsWith('✅') ? '#155724' : '#721c24',
            border: `1px solid ${exportMessage.startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`,
            fontSize: '13px'
          }}>
            {exportMessage}
          </span>
        )}
      </div>

      {/* Sorting Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '400px',
        margin: '20px 0'
      }}>
        <span style={{ width: '150px' }}>Order by:</span>
        <select
          value={orderBy}
          onChange={(e) => setOrderBy(e.target.value)}
          className="with-arrow"
        >
          <option value="image_id">Image ID</option>
        </select>

        <label style={{ marginLeft: '10px' }}>
          <input
            type="checkbox"
            checked={isAscending}
            onChange={(e) => setIsAscending(e.target.checked)}
          />
          Ascending?
        </label>
      </div>

      {/* Images Table */}
      <table className="striped" style={{ width: '100%' }}>
        <thead>
          <tr style={{ fontWeight: 'bold' }}>
            <td>Image ID</td>
            <td>Segmentation Count</td>
            <td>Avg Score</td>
            <td>Avg Difficulty</td>
            <td>Avg Time (hours)</td>
            <td>Export</td>
          </tr>
        </thead>
        <tbody>
          {images.map((image) => {
            const segData = image.types.segmentation;
            const hasAnnotations = segData && segData.count > 0;
            return (
              <tr key={image.image_id}>
                <td>
                  <button onClick={() => handleGotoImage(image.image_id)}>
                    {image.image_id}
                  </button>
                </td>
                <td>{segData ? segData.count : 0}</td>
                <td>{segData ? segData.score.toFixed(2) : 'N/A'}</td>
                <td>{segData ? segData.difficulty.toFixed(2) : 'N/A'}</td>
                <td>{segData ? segData.time_spent.toFixed(2) : 'N/A'}</td>
                <td>
                  {hasAnnotations ? (
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); exportImages([image.image_id]); }}
                      style={{ textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      GeoTIFF
                    </a>
                  ) : (
                    <span style={{ color: '#999' }}>N/A</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ImagesPage;