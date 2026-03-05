import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string; // optional nav target
}

const COLLECTOR_STEPS: Step[] = [
  {
    title: 'Welcome to SusuPay!',
    description: 'Manage your susu group digitally. No more paper notebooks — all contributions tracked automatically.',
    icon: (
      <svg className="w-12 h-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0116.35 15m.002 0h-.002" />
      </svg>
    ),
  },
  {
    title: 'Invite Your Clients',
    description: 'Share your unique invite code via WhatsApp. Clients join your group instantly — no app download needed.',
    icon: (
      <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    action: '/collector/clients',
  },
  {
    title: 'Verify Payments',
    description: 'Clients paste their MoMo SMS or upload screenshots. SusuPay reads the message and checks it automatically.',
    icon: (
      <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    action: '/collector/transactions',
  },
  {
    title: 'Schedule Payouts',
    description: 'Set up rotation schedule and payout dates. Clients get reminders when their turn is coming.',
    icon: (
      <svg className="w-12 h-12 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    action: '/collector/schedule',
  },
  {
    title: 'You\'re All Set!',
    description: 'Start collecting contributions today. You can always find help in your Profile.',
    icon: (
      <svg className="w-12 h-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
];

const STORAGE_KEY = 'susupay-onboarding-done';

export function OnboardingTutorial({ role }: { role: 'COLLECTOR' | 'CLIENT' }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const key = `${STORAGE_KEY}-${role}`;
    if (!localStorage.getItem(key)) {
      setVisible(true);
    }
  }, [role]);

  if (!visible) return null;

  const steps = role === 'COLLECTOR' ? COLLECTOR_STEPS : COLLECTOR_STEPS; // same steps for now
  const current = steps[step];
  const isLast = step === steps.length - 1;

  function handleNext() {
    if (isLast) {
      finish();
    } else {
      setStep(step + 1);
    }
  }

  function finish() {
    localStorage.setItem(`${STORAGE_KEY}-${role}`, 'true');
    setVisible(false);
  }

  function handleActionAndNext() {
    if (current.action) {
      navigate(current.action);
    }
    finish();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm mx-4 bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex justify-center mb-4">
          {current.icon}
        </div>
        <h2 className="text-lg font-bold text-gray-900 text-center">{current.title}</h2>
        <p className="text-sm text-gray-600 text-center mt-2">{current.description}</p>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 mt-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-primary-600' : i < step ? 'bg-primary-300' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={finish}
            className="flex-1 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Skip
          </button>
          {current.action && !isLast ? (
            <button
              onClick={handleActionAndNext}
              className="flex-1 py-2.5 text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 rounded-lg"
            >
              Go there
            </button>
          ) : null}
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
          >
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
