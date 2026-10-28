/**
 * Caregiver PIN Modal
 *
 * Secures clinician and caregiver data behind a 4-digit PIN (default 1234).
 */

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Lock } from 'lucide-react';

interface CaregiverPINModalProps {
  isOpen: boolean;
  onClose: () => void;
  correctPin: string;
  onAuthenticated: () => void;
}

export const CaregiverPINModal: React.FC<CaregiverPINModalProps> = ({
  isOpen,
  onClose,
  correctPin,
  onAuthenticated,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      setErrorMsg('');

      if (next.length === 4) {
        if (next === correctPin) {
          onAuthenticated();
          setPinInput('');
          onClose();
        } else {
          setErrorMsg('Incorrect PIN. Please try again.');
          setPinInput('');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Caregiver & Clinician Access">
      <div className="py-4 text-center select-none">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-amber-100 dark:bg-stone-800 text-amber-800 dark:text-amber-400">
            <Lock size={40} />
          </div>
        </div>

        <p className="text-xl text-stone-700 dark:text-stone-300 mb-6 font-medium">
          Enter 4-digit PIN to access session analytics and settings (Default: 1234)
        </p>

        {/* PIN Dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full border-2 ${
                i < pinInput.length
                  ? 'bg-amber-600 border-amber-700 dark:bg-amber-400 dark:border-amber-300 scale-110'
                  : 'bg-stone-200 dark:bg-stone-700 border-stone-400'
              } transition-transform`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-red-600 dark:text-red-400 font-semibold mb-6 text-lg">
            {errorMsg}
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <Button
              key={digit}
              variant="outline"
              size="normal"
              onClick={() => handleDigit(digit)}
              className="text-2xl font-bold py-3"
            >
              {digit}
            </Button>
          ))}
          <Button
            variant="subtle"
            size="normal"
            onClick={handleBackspace}
            className="text-lg font-bold"
          >
            Clear
          </Button>
          <Button
            key="0"
            variant="outline"
            size="normal"
            onClick={() => handleDigit('0')}
            className="text-2xl font-bold py-3"
          >
            0
          </Button>
          <Button
            variant="subtle"
            size="normal"
            onClick={onClose}
            className="text-lg font-bold"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
