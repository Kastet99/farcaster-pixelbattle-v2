import React from 'react';
import IPFSCanvas from '@/components/IPFSCanvas';
import { Button } from '@/components/ui/button';

/**
 * Page for viewing canvas history stored on IPFS
 */
export default function CanvasHistoryPage() {
  // In a real implementation, you would fetch this list from a database
  // For now, we'll use a static list for demonstration
  const demoSnapshots = [
    { cid: '', timestamp: Date.now(), blockNumber: 0 }
  ];

  // Function to create a new snapshot
  const createSnapshot = async () => {
    try {
      const response = await fetch('/api/canvas/snapshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create snapshot: ${response.statusText}`);
      }

      const data = await response.json();
      
      // In a real implementation, you would update the list of snapshots
      // For now, we'll just reload the page
      window.location.reload();
      
      return data;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      alert(`Error creating snapshot: ${(error as Error).message}`);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Canvas History</h1>
        <Button onClick={createSnapshot}>Create New Snapshot</Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">About IPFS Canvas Snapshots</h2>
        <p className="mb-4">
          Canvas snapshots are stored on IPFS (InterPlanetary File System), a decentralized
          storage network. Each snapshot preserves the state of the canvas at a specific point
          in time, including pixel colors, ownership information, and game state.
        </p>
        <p>
          These snapshots serve as a historical record of the PixelBattle game and can be
          accessed by anyone with the IPFS Content Identifier (CID).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demoSnapshots.map((snapshot, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2">
              Snapshot #{snapshot.blockNumber || 'Demo'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {new Date(snapshot.timestamp).toLocaleString()}
            </p>
            
            {/* If we have a real CID, use it, otherwise show a placeholder */}
            {snapshot.cid ? (
              <IPFSCanvas 
                cid={snapshot.cid} 
                pixelSize={6} 
                className="mb-4" 
              />
            ) : (
              <div className="bg-gray-100 flex items-center justify-center h-48 mb-4 rounded">
                <p className="text-gray-500">No snapshots available yet</p>
              </div>
            )}
            
            {snapshot.cid && (
              <div className="text-xs text-gray-500 break-all">
                <span className="font-semibold">CID:</span> {snapshot.cid}
              </div>
            )}
          </div>
        ))}
      </div>

      {demoSnapshots.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No canvas snapshots available yet.</p>
          <Button onClick={createSnapshot}>Create First Snapshot</Button>
        </div>
      )}
    </div>
  );
}
