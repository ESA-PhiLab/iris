import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Action, ActionsApiResponse } from '../types/iris';

// Declare global function from base.html
declare global {
  interface Window {
    goto_image: (mode: string, imageId: string) => void;
  }
}

const ActionsPage: React.FC = () => {
  const params = useParams();
  const type = params.type || 'segmentation';
  const [actions, setActions] = useState<Action[]>([]);
  const [imageStats, setImageStats] = useState({ processed: 0, total: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<string>('last_modification');
  const [isAscending, setIsAscending] = useState<boolean>(false);

  const fetchActions = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/admin/api/actions/${type}?order_by=${orderBy}&ascending=${isAscending}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ActionsApiResponse = await response.json();
      setActions(data.actions);
      setImageStats(data.image_stats);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, [type, orderBy, isAscending]);

  const handleGotoImage = (imageId: string) => {
    if (window.goto_image) {
      window.goto_image('segmentation', imageId);
    }
  };

  if (isLoading) {
    return <div>Loading actions...</div>;
  }

  const progressPercentage = imageStats.total > 0 
    ? Math.round((imageStats.processed / imageStats.total) * 100) 
    : 0;

  return (
    <div>
      {/* Progress Bar */}
      {imageStats.processed > 0 && (
        <div style={{ margin: '20px 0' }}>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progressPercentage}%` }}>
              {progressPercentage}% done!
            </div>
          </div>
        </div>
      )}

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
          <option value="last_modification">Last modification</option>
          <option value="user_id">User</option>
          <option value="score">Score</option>
          <option value="difficulty">Difficulty</option>
          <option value="complete">Active status</option>
          <option value="unverified">Unverified</option>
          <option value="time_spent">Time spent</option>
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

      {/* Actions Table */}
      <table className="striped" style={{ width: '100%' }}>
        <thead>
          <tr style={{ fontWeight: 'bold' }}>
            <td>Image</td>
            <td>User</td>
            <td>Completion status</td>
            <td>Score</td>
            <td>Difficulty</td>
            <td>Last modification</td>
            <td>Time spent</td>
            <td>Notes</td>
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action.id}>
              <td>
                <button onClick={() => handleGotoImage(action.image_id)}>
                  {action.image_id}
                </button>
              </td>
              <td>{action.username}</td>
              <td>{action.complete ? 'complete' : 'incomplete'}</td>
              <td>
                {action.unverified ? 'Needs more users' : action.score}
              </td>
              <td>{action.difficulty}</td>
              <td>{new Date(action.last_modification).toLocaleString()}</td>
              <td>{action.time_spent}</td>
              <td>{action.notes || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActionsPage;