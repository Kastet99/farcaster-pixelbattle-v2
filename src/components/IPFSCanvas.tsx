import React, { useState, useEffect } from 'react';
import { CanvasData, CanvasIPFSMetadata } from '@/types/canvas';

interface IPFSCanvasProps {
  cid?: string;
  width?: number;
  height?: number;
  pixelSize?: number;
  className?: string;
}

/**
 * Component to display a canvas from IPFS
 */
const IPFSCanvas: React.FC<IPFSCanvasProps> = ({
  cid,
  width = 32,
  height = 32,
  pixelSize = 10,
  className = '',
}) => {
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [metadata, setMetadata] = useState<CanvasIPFSMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch canvas data from IPFS
  useEffect(() => {
    if (!cid) return;

    const fetchCanvasData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch metadata from IPFS
        const metadataUrl = `https://nftstorage.link/ipfs/${cid}`;
        const metadataResponse = await fetch(metadataUrl);
        
        if (!metadataResponse.ok) {
          throw new Error(`Failed to fetch metadata: ${metadataResponse.statusText}`);
        }
        
        const metadataJson = await metadataResponse.json();
        setMetadata(metadataJson);
        
        // Fetch canvas data from IPFS using the CID in the metadata
        const canvasDataCid = metadataJson.properties.canvasData;
        const canvasDataUrl = `https://nftstorage.link/ipfs/${canvasDataCid}`;
        const canvasDataResponse = await fetch(canvasDataUrl);
        
        if (!canvasDataResponse.ok) {
          throw new Error(`Failed to fetch canvas data: ${canvasDataResponse.statusText}`);
        }
        
        const canvasDataJson = await canvasDataResponse.json();
        setCanvasData(canvasDataJson);
      } catch (err) {
        console.error('Error fetching canvas data from IPFS:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchCanvasData();
  }, [cid]);

  // Render loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: width * pixelSize, height: height * pixelSize }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-100 text-red-700 ${className}`} style={{ width: width * pixelSize, height: height * pixelSize }}>
        <div className="text-center p-4">
          <p className="font-bold">Error loading canvas</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!canvasData) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={{ width: width * pixelSize, height: height * pixelSize }}>
        <p className="text-gray-500">No canvas data available</p>
      </div>
    );
  }

  // Render canvas
  return (
    <div className={`relative ${className}`}>
      <div 
        className="grid border border-gray-300"
        style={{
          width: canvasData.width * pixelSize,
          height: canvasData.height * pixelSize,
          gridTemplateColumns: `repeat(${canvasData.width}, ${pixelSize}px)`,
          gridTemplateRows: `repeat(${canvasData.height}, ${pixelSize}px)`,
        }}
      >
        {canvasData.pixels.flat().map((pixel: any, index: number) => {
          const x = index % canvasData.width;
          const y = Math.floor(index / canvasData.width);
          
          return (
            <div
              key={`${x}-${y}`}
              className="relative"
              style={{
                backgroundColor: pixel.color || '#FFFFFF',
                width: pixelSize,
                height: pixelSize,
              }}
              title={`Owner: ${pixel.owner}`}
            />
          );
        })}
      </div>
      
      {metadata && (
        <div className="mt-4 text-sm">
          <p className="font-bold">{metadata.name}</p>
          <p className="text-gray-600">{metadata.description}</p>
          <p className="text-xs text-gray-500">
            Timestamp: {new Date(metadata.properties.timestamp).toLocaleString()}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {metadata.attributes.map((attr: any, index: number) => (
              <div key={index} className="bg-gray-100 px-2 py-1 rounded-md text-xs">
                <span className="font-semibold">{attr.trait_type}:</span> {attr.value}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IPFSCanvas;
