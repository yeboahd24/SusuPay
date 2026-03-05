import { useState } from 'react';
import { useSavingsGoals, useCreateGoal, useDeleteGoal } from '../../hooks/useViral';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

export function Goals() {
  const { data: goals, isLoading } = useSavingsGoals();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  function handleCreate() {
    if (!title.trim() || !amount) return;
    createGoal.mutate(
      {
        title: title.trim(),
        target_amount: parseFloat(amount),
        target_date: targetDate || undefined,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setTitle('');
          setAmount('');
          setTargetDate('');
        },
      }
    );
  }

  if (isLoading) return <LoadingSpinner className="mt-20" />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Savings Goals</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          + New Goal
        </Button>
      </div>

      {(!goals || goals.length === 0) ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          title="No savings goals yet"
          subtitle="Set a goal to stay motivated and track your progress"
        />
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = goal.progress_percent;
            const isComplete = progress >= 100;
            return (
              <div
                key={goal.id}
                className={`bg-white rounded-xl border p-4 ${
                  isComplete ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      {isComplete && <span>&#10003;</span>}
                      {goal.title}
                    </p>
                    {goal.target_date && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Target: {new Date(goal.target_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteGoal.mutate(goal.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title="Remove goal"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      isComplete ? 'bg-green-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    GHS {parseFloat(goal.current_amount).toFixed(2)}
                  </span>
                  <span className="font-medium text-gray-700">
                    {progress.toFixed(0)}% of GHS {parseFloat(goal.target_amount).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create goal modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Savings Goal">
        <div className="space-y-4">
          <Input
            label="Goal name"
            placeholder="e.g., New Phone, School Fees, Emergency Fund"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Target amount (GHS)"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Target date (optional)"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !amount || createGoal.isPending}
            className="w-full"
          >
            {createGoal.isPending ? 'Creating...' : 'Create Goal'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
