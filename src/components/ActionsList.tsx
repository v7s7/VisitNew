import { Action } from '../types';
import { generateId } from '../utils';
import './ActionsList.css';

interface ActionsListProps {
  actions: Action[];
  onActionsChange: (actions: Action[]) => void;
}

export default function ActionsList({ actions, onActionsChange }: ActionsListProps) {
  const handleAddAction = () => {
    const newAction: Action = {
      id: generateId(),
      text: '',
    };
    onActionsChange([...actions, newAction]);
  };

  const handleRemoveAction = (id: string) => {
    onActionsChange(actions.filter((a) => a.id !== id));
  };

  const handleTextChange = (id: string, text: string) => {
    onActionsChange(
      actions.map((a) => (a.id === id ? { ...a, text } : a))
    );
  };

  return (
    <div className="actions-list section">
      <h3 className="section-title">الإجراءات المتخذة | Actions Taken</h3>

      {actions.length === 0 && (
        <p className="empty-message">لا توجد إجراءات. اضغط "إضافة إجراء" لبدء الإضافة.</p>
      )}

      {actions.map((action, index) => (
        <div key={action.id} className="action-item">
          <div className="action-header">
            <label htmlFor={`action-text-${action.id}`} className="action-label">
              إجراء {index + 1}
            </label>
            <button
              type="button"
              onClick={() => handleRemoveAction(action.id)}
              className="remove-button danger small"
            >
              حذف
            </button>
          </div>

          <textarea
            id={`action-text-${action.id}`}
            value={action.text}
            onChange={(e) => handleTextChange(action.id, e.target.value)}
            placeholder="اكتب الإجراء المتخذ..."
            rows={2}
            className="action-input"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddAction}
        className="add-button secondary"
      >
        + إضافة إجراء
      </button>
    </div>
  );
}
