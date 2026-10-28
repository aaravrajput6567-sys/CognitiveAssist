import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { speechService } from '../../services/speechService.ts';

export const LiveAnnouncer: React.FC = () => {
  const [caption, setCaption] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = speechService.subscribeCaptions((text) => {
      setCaption(text);
    });
    return unsubscribe;
  }, []);

  return (
    <>
      {/* Screen Reader Live Region */}
      <div
        className="visually-hidden"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {caption}
      </div>

      {/* Visual Speech Caption Banner for hearing-impaired or low-audio environments */}
      {caption && (
        <aside className="caption-banner" aria-label="Spoken audio caption">
          <Volume2 className="caption-icon" size={28} />
          <span>{caption}</span>
        </aside>
      )}
    </>
  );
};
