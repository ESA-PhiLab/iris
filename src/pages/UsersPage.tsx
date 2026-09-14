import React, { useState, useEffect } from 'react';
import { User, UserDto, UsersApiResponse } from '../types/iris';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<keyof User>('id');
  const [isAscending, setIsAscending] = useState<boolean>(true);

  const fetchUsers = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Map TypeScript property names back to API property names for sorting
      const apiOrderBy = orderBy === 'isAdmin' ? 'admin' : orderBy;
      const response = await fetch(`/admin/api/users?order_by=${apiOrderBy}&ascending=${isAscending}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: UsersApiResponse = await response.json();

      // Transform DTOs to domain objects
      const transformedUsers: User[] = data.users.map((userDto: UserDto) => ({
        ...userDto,
        isAdmin: userDto.admin, // Map admin -> isAdmin
      }));

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [orderBy, isAscending]);

  const setAdminStatus = async (userId: number, isAdmin: boolean): Promise<void> => {
    try {
      const response = await fetch(`/user/set/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin: isAdmin }), // Map isAdmin -> admin for API
      });

      if (response.ok) {
        await fetchUsers(); // Refresh the list
      } else {
        console.error('Failed to update admin status');
      }
    } catch (error) {
      console.error('Error updating admin status:', error);
    }
  };

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <div>
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
          onChange={(e) => setOrderBy(e.target.value as keyof User)}
          className="with-arrow"
        >
          <option value="id">User ID</option>
          <option value="name">Username</option>
          <option value="isAdmin">Admin status</option>
          <option value="created">Creation date</option>
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

      <table className="striped" style={{ width: '100%' }}>
        <thead>
          <tr style={{ fontWeight: 'bold' }}>
            <td>ID</td>
            <td>Username</td>
            <td>Score</td>
            <td>Masks</td>
            <td>Creation date</td>
            <td>Admin</td>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>
                {user.name}
                {user.isAdmin && (
                  <span style={{ position: 'absolute', right: '3px' }} className="tag">
                    admin
                  </span>
                )}
              </td>
              <td>
                {user.segmentation.score} ({user.segmentation.score_unverified})
              </td>
              <td>{user.segmentation.n_masks}</td>
              <td>{new Date(user.created).toLocaleDateString()}</td>
              <td>
                {user.name !== 'admin' && (
                  <button
                    onClick={() => setAdminStatus(user.id, !user.isAdmin)}
                  >
                    {user.isAdmin ? 'Remove admin status' : 'Make admin'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersPage;